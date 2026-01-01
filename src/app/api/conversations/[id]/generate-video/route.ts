import { NextRequest, NextResponse } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { r2, uploadBuffer, signGet, makeKey, deleteKey } from '@/lib/services/r2'
// @ts-ignore
import ffmpeg from 'fluent-ffmpeg'

import fs from 'fs/promises'
import path from 'path'
import os from 'os'

async function handler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const musicFile = formData.get('music') as File | null
    const introImageFile = formData.get('introImage') as File | null
    const outroVideoFile = formData.get('outroVideo') as File | null

    // "Offset" is now "Intro Duration"
    const offsetStr = formData.get('offset') as string
    const introDuration = parseFloat(offsetStr) || 2.0

    const width = parseInt(formData.get('width') as string) || 1280
    const height = parseInt(formData.get('height') as string) || 720

    if (!imageFile) {
        throw new Error('Image file is required')
    }

    const conversation = await dbService.conversation.findById(id)
    if (!conversation) throw new Error('Conversation not found')
    if (!conversation.audioUrl) throw new Error('Conversation audio not generated yet')
    if (!conversation.alignment) throw new Error('Conversation alignment data missing')

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lingodino-video-'))

    // Helper to determine extension
    const getExt = (f: File) => {
        const originalName = f.name || ''
        const ext = path.extname(originalName) || ''
        return ext.toLowerCase() || '.png'
    }

    // Raw Paths
    const rawImagePath = path.join(tempDir, `raw_image${getExt(imageFile)}`)
    const rawIntroImagePath = introImageFile ? path.join(tempDir, `raw_intro_image${getExt(introImageFile)}`) : null

    // Normalized Paths (always PNG)
    const normalizedImagePath = path.join(tempDir, 'image.png')
    const normalizedIntroImagePath = path.join(tempDir, 'intro_image.png')

    const audioPath = path.join(tempDir, 'audio.mp3')
    const musicPath = path.join(tempDir, 'music.mp3')
    const outroVideoPath = path.join(tempDir, 'outro_input.mp4')

    const introOutputPath = path.join(tempDir, 'intro.mp4')
    const mainOutputPath = path.join(tempDir, 'main.mp4')
    const outroProcessedPath = path.join(tempDir, 'outro_processed.mp4')
    const finalListPath = path.join(tempDir, 'list.txt')
    const finalOutputPath = path.join(tempDir, 'output.mp4')

    try {
        // --- 1. Save and Normalize Files ---

        // Save Raw Image
        await fs.writeFile(rawImagePath, Buffer.from(await imageFile.arrayBuffer()))

        // Normalize Main Image to PNG
        await new Promise<void>((resolve, reject) => {
            ffmpeg(rawImagePath)
                .output(normalizedImagePath)
                .on('end', () => resolve())
                .on('error', (err: any) => reject(new Error(`Normalize Image Error: ${err.message}`)))
                .run()
        })

        // Save and Normalize Intro Image (if exists)
        let hasIntroImage = false
        if (rawIntroImagePath && introImageFile) {
            await fs.writeFile(rawIntroImagePath, Buffer.from(await introImageFile.arrayBuffer()))
            await new Promise<void>((resolve, reject) => {
                ffmpeg(rawIntroImagePath)
                    .output(normalizedIntroImagePath)
                    .on('end', () => resolve())
                    .on('error', (err: any) => reject(new Error(`Normalize Intro Image Error: ${err.message}`)))
                    .run()
            })
            hasIntroImage = true
        }

        // Save Audio
        const { url: speechUrl } = await signGet({ key: conversation.audioUrl })
        const audioRes = await fetch(speechUrl)
        if (!audioRes.ok) throw new Error('Failed to fetch conversation audio')
        await fs.writeFile(audioPath, Buffer.from(await audioRes.arrayBuffer()))

        // Save Music
        let hasMusic = false
        if (musicFile) {
            await fs.writeFile(musicPath, Buffer.from(await musicFile.arrayBuffer()))
            hasMusic = true
        }

        // Save Outro Video
        let hasOutroVideo = false
        if (outroVideoFile) {
            await fs.writeFile(outroVideoPath, Buffer.from(await outroVideoFile.arrayBuffer()))
            hasOutroVideo = true
        }

        // --- Step A: Generate Intro Video (intro.mp4) ---
        await new Promise<void>((resolve, reject) => {
            const cmd = ffmpeg()
            let cmdLine = ''
            const filters: string[] = []

            // Video Source: Use Normalized PNGs
            if (hasIntroImage) {
                // Intro Image Input (Index 0)
                cmd.input(normalizedIntroImagePath).inputOptions(['-loop 1', '-framerate 30', '-f image2', `-t ${introDuration}`])
                // Scale Intro Image + Trim
                filters.push(`[0:v]trim=duration=${introDuration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fade=t=out:st=${introDuration - 0.5}:d=0.5[v]`)
            } else {
                // Use Main Image as base (Index 0)
                cmd.input(normalizedImagePath).inputOptions(['-loop 1', '-framerate 30', '-f image2', `-t ${introDuration}`])

                const rawText = conversation.name || 'Conversation'
                const safeText = rawText.replace(/:/g, '\\:').replace(/'/g, '').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

                // Draw White Box + Text + Trim
                filters.push(`[0:v]trim=duration=${introDuration},setpts=PTS-STARTPTS,drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill[whitebg]`)
                filters.push(`[whitebg]drawtext=text='${safeText}':fontcolor=black:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2:fontfile='C\\:/Windows/Fonts/arial.ttf',fade=t=out:st=${introDuration - 0.5}:d=0.5[v]`)
            }

            // Audio Source (Index 1) - Use Main Audio and mute it
            // LOOP audio input to prevent hang if audio is shorter than intro duration
            cmd.input(audioPath).inputOptions(['-stream_loop -1'])

            // Audio Filters: Volume 0 (Mute), Trim to introDuration
            filters.push(`[1:a]volume=0,atrim=duration=${introDuration},asetpts=PTS-STARTPTS[a]`)

            cmd.complexFilter(filters)
                .map('[v]')
                .map('[a]') // Map processed mute audio
                .outputOptions([
                    '-c:v libx264', '-preset faster',
                    '-c:a aac', '-b:a 192k', '-ac 2',
                    '-pix_fmt yuv420p',
                    `-t ${introDuration}`, // Hard output limit
                    '-max_muxing_queue_size 1024',
                    '-y' // Overwrite
                ])
                .output(introOutputPath)
                .on('start', (c: string) => { cmdLine = c; console.log('[Intro] Start', c) })
                .on('stderr', (line: string) => console.log('[Intro] FFmpeg:', line))
                .on('progress', (p: any) => console.log(`[Intro] Progress: ${p.timemark}`))
                .on('end', () => resolve())
                .on('error', (err: any) => reject(new Error(`[Intro] Error: ${err.message}. CMD: ${cmdLine}`)))
                .run()
        })

        // --- Step B: Generate Main Video (main.mp4) ---
        const rawDuration = conversation.duration || 0
        const mainDuration = Math.max(0.1, rawDuration) // Ensure non-zero duration

        await new Promise<void>((resolve, reject) => {
            const cmd = ffmpeg()
            let cmdLine = ''

            // Use Normalized Image
            cmd.input(normalizedImagePath).inputOptions(['-loop 1', '-framerate 30', '-f image2', `-t ${mainDuration}`])
            cmd.input(audioPath) // Speech

            let musicIndex = -1
            if (hasMusic) {
                cmd.input(musicPath)
                musicIndex = 2
            }

            const filters: string[] = []
            // Video Scale + Trim
            filters.push(`[0:v]trim=duration=${mainDuration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fade=t=in:st=0:d=0.5[v]`)

            // Audio Mix (Speech + Music)
            let audioMap = ''
            if (hasMusic) {
                filters.push(`[${musicIndex}:a]volume=0.05[softMusic]`)
                // Mix speech (1:a) and music
                filters.push(`[1:a][softMusic]amix=inputs=2:duration=first[mixedA]`)
                audioMap = '[mixedA]'
            } else {
                // Just pass speech through a filter to label it, and force stereo
                filters.push(`[1:a]aformat=channel_layouts=stereo[cleanSpeech]`)
                audioMap = '[cleanSpeech]'
            }

            cmd.complexFilter(filters)
                .map('[v]')
                .map(audioMap)
                .outputOptions([
                    '-c:v libx264', '-preset faster',
                    '-c:a aac', '-b:a 192k', '-ac 2', // Force 2 channels
                    '-pix_fmt yuv420p',
                    `-t ${mainDuration}`,
                    '-max_muxing_queue_size 1024',
                    '-y'
                ])
                .output(mainOutputPath)
                .on('start', (c: string) => { cmdLine = c; console.log('[Main] Start', c) })
                .on('stderr', (line: string) => console.log('[Main] FFmpeg:', line))
                .on('progress', (p: any) => console.log(`[Main] Progress: ${p.timemark}`))
                .on('end', () => resolve())
                .on('error', (err: any) => reject(new Error(`[Main] Error: ${err.message}. CMD: ${cmdLine}`)))
                .run()
        })

        // --- Step C: Process Outro (if exists) ---
        if (hasOutroVideo) {
            await new Promise<void>((resolve, reject) => {
                let cmdLine = ''
                ffmpeg(outroVideoPath)
                    .outputOptions([
                        `-filter:v scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1`,
                        '-c:v libx264', '-preset faster',
                        '-c:a aac', '-b:a 192k', '-ac 2',
                        '-pix_fmt yuv420p',
                        '-y'
                    ])
                    .save(outroProcessedPath)
                    .on('start', (c: string) => { cmdLine = c; console.log('[Outro] Start', c) })
                    .on('stderr', (line: string) => console.log('[Outro] FFmpeg:', line))
                    .on('end', () => resolve())
                    .on('error', (err: any) => reject(new Error(`[Outro] Error: ${err.message}. CMD: ${cmdLine}`)))
            })
        }

        // --- Step D: Concat ---
        const contentPathFixed = introOutputPath.replace(/\\/g, '/')
        const mainPathFixed = mainOutputPath.replace(/\\/g, '/')
        // Ensure file paths are safe
        let fileList = `file '${contentPathFixed}'\nfile '${mainPathFixed}'`

        if (hasOutroVideo) {
            const outroPathFixed = outroProcessedPath.replace(/\\/g, '/')
            fileList += `\nfile '${outroPathFixed}'`
        }

        await fs.writeFile(finalListPath, fileList)

        await new Promise<void>((resolve, reject) => {
            const cmd = ffmpeg()
            let cmdLine = ''
            cmd.input(finalListPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy', '-movflags +faststart', '-y'])
                .save(finalOutputPath)
                .on('start', (c: string) => { cmdLine = c; console.log('[Concat] Start', c) })
                .on('stderr', (line: string) => console.log('[Concat] FFmpeg:', line))
                .on('end', () => resolve())
                .on('error', (err: any) => reject(new Error(`[Concat] Error: ${err.message} CMD: ${cmdLine}`)))
        })

        // 5. Upload Video
        const videoBuffer = await fs.readFile(finalOutputPath)
        const { key: videoKey } = await uploadBuffer({
            key: makeKey('video.mp4', 'conversations'),
            buffer: videoBuffer,
            contentType: 'video/mp4',
        })

        // 6. Process Subtitles
        const originalSegments = (conversation.alignment && conversation.alignment.segments) ? conversation.alignment.segments : []
        const adjustedSegments = originalSegments.map((seg: any) => ({
            sentenceId: seg.sentenceId,
            text: seg.text,
            participantRole: seg.participantRole,
            // Offset is now Intro Duration
            startTime: (Number(seg.startTime) || 0) + introDuration,
            endTime: (Number(seg.endTime) || 0) + introDuration,
            words: Array.isArray(seg.words) ? seg.words.map((w: any) => ({
                word: w.word,
                start: (Number(w.start) || 0) + introDuration,
                end: (Number(w.end) || 0) + introDuration
            })) : []
        }))

        const subtitleJson = JSON.stringify(adjustedSegments, null, 2)
        const { key: subtitleKey } = await uploadBuffer({
            key: makeKey('subtitles.json', 'conversations'),
            buffer: Buffer.from(subtitleJson),
            contentType: 'application/json',
        })

        // 7. Update DB
        await dbService.conversation.update({ _id: id }, {
            videoUrl: videoKey,
            subtitleUrl: subtitleKey,
        })

        return {
            success: true,
            videoUrl: videoKey,
            subtitleUrl: subtitleKey,
        }

    } finally {
        // Cleanup temp dir
        try {
            await fs.rm(tempDir, { recursive: true, force: true })
        } catch (e) {
            console.error('Failed to cleanup temp dir:', e)
        }
    }
}

export const POST = withApi(handler, { protected: true })
