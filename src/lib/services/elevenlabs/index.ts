import 'server-only';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import {
  ElevenLabsVoice,
  DialogueSentence,
  ConversationParticipant,
  DialogueAlignment,
  DialogueSegment,
  WordTiming,
  SentenceSegment,
} from '@/lib/types/models/conversation';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.warn('ELEVENLABS_API_KEY is not set. ElevenLabs features will not work.');
}

// Initialize ElevenLabs client
function getClient(): ElevenLabsClient {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key is not configured');
  }
  return new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
}

export interface GenerateDialogueResult {
  audioBuffer: Buffer | ArrayBuffer;
  alignment: DialogueAlignment;
  debug?: any;
}

/**
 * Fetch available voices from ElevenLabs
 */
export async function getVoices(): Promise<ElevenLabsVoice[]> {
  const client = getClient();
  const response = await client.voices.getAll();

  return response.voices.map(voice => ({
    voice_id: voice.voiceId,
    name: voice.name || 'Unknown',
    category: voice.category,
    labels: voice.labels as Record<string, string> | undefined,
    preview_url: voice.previewUrl,
  }));
}

/**
 * Format sentence text with tone/emotion markers for ElevenLabs
 * ElevenLabs v3 supports emotional context through descriptive text
 */
function formatSentenceWithEmotion(sentence: DialogueSentence): string {
  let text = sentence.text;

  // Add tone/emotion markers if specified
  // ElevenLabs v3 interprets markers like [cheerfully], [sadly], etc.
  const markers: string[] = [];

  if (sentence.tone) {
    markers.push(sentence.tone);
  }

  if (sentence.emotion) {
    markers.push(sentence.emotion);
  }

  if (markers.length > 0) {
    // Prepend emotion markers in brackets
    text = `[${markers.join(', ')}] ${text}`;
  }

  return text;
}

/**
 * Check if a character is a CJK (Chinese, Japanese, Korean) character
 * These languages generally don't use spaces between words, so we treat each character as a word
 */
function isCJK(char: string): boolean {
  // Common CJK ranges:
  // \u4E00-\u9FFF: CJK Unified Ideographs (Common Chinese)
  // \u3000-\u303F: CJK Symbols and Punctuation
  // \u3040-\u309F: Hiragana (Japanese)
  // \u30A0-\u30FF: Katakana (Japanese)
  // \uFF00-\uFFEF: Halfwidth and Fullwidth Forms
  // \uAC00-\uD7AF: Hangul Syllables (Korean)
  return /[\u4E00-\u9FFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\uAC00-\uD7AF]/.test(char);
}

/**
 * Check if a word is an emotion/tone marker (e.g., "[cheerfully,", "happy]", "[excited]")
 */
function isEmotionMarker(word: string): boolean {
  // Skip words that are part of emotion markers in brackets
  // These look like: [cheerfully, happy] or [excited]
  return word.includes('[') || word.includes(']');
}

/**
 * Convert character-level alignment to word-level timing
 * - Filters out emotion markers
 * - Handles CJK characters as individual words
 * - Handles space-separated languages (English, etc.) by grouping characters
 */
function extractWordTimings(characters: string[], startTimes: number[], endTimes: number[]): WordTiming[] {
  const words: WordTiming[] = [];

  let currentWord = '';
  let wordStartIndex = -1;
  let insideBracket = false;

  const flushWord = (endIndex: number) => {
    if (currentWord.trim() && !isEmotionMarker(currentWord)) {
      // Find valid start/end times
      // We tracked wordStartIndex for the first char
      // endIndex is the index of the *last* char in this word
      const startTime = startTimes[wordStartIndex];
      const endTime = endTimes[endIndex];

      words.push({
        word: currentWord.trim(),
        start: startTime,
        end: endTime,
      });
    }
    currentWord = '';
    wordStartIndex = -1;
  };

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    // 1. Handle Emotion markers [...]
    if (char === '[') {
      // If we had a word building up, flush it
      if (currentWord) flushWord(i - 1);
      insideBracket = true;
      currentWord = ''; // Reset
      continue;
    }
    if (char === ']') {
      insideBracket = false;
      continue;
    }
    if (insideBracket) continue;

    // 2. Handle CJK Characters
    // If we encounter a CJK char, it's a word by itself.
    // Also, if we were building an English word, it ends here.
    if (isCJK(char)) {
      // Flush previous word if exists (e.g. "Hello" in "Hello你好")
      if (currentWord) flushWord(i - 1);

      // Add the CJK char as its own word immediately (unless empty/whitespace)
      if (char.trim()) {
        words.push({
          word: char,
          start: startTimes[i],
          end: endTimes[i],
        });
      }
      continue;
    }

    // 3. Handle Spaces/Delimiters for non-CJK
    if (char === ' ' || char === '\n' || char === '\t') {
      if (currentWord) flushWord(i - 1);
      continue;
    }

    // 4. Regular characters (English/Latin/etc)
    if (currentWord === '') {
      wordStartIndex = i;
    }
    currentWord += char;
  }

  // Flush remaining
  if (currentWord) {
    flushWord(characters.length - 1);
  }

  return words;
}

/**
 * Map defined segments to character timings
 * ENSURES strict 1:1 mapping: one WordTiming for each segment.
 */
function mapSegmentsToTimings(
  segments: SentenceSegment[],
  alignmentChars: string[],
  startTimes: number[],
  endTimes: number[]
): WordTiming[] {
  const result: WordTiming[] = [];
  let alignIdx = 0;

  // Keep track of time to fill gaps
  let lastEndTime = startTimes.length > 0 ? startTimes[0] : 0;

  // Helper to check if char is punctuation/symbol
  const isPunctuation = (char: string) => /[.,;?!，。；？！"'：\[\]]/.test(char);

  for (const seg of segments) {
    const segText = seg.text;

    // If empty text, push placeholder
    if (!segText) {
      result.push({ word: '', start: lastEndTime, end: lastEndTime });
      continue;
    }

    let segMinStart = Infinity;
    let segMaxEnd = -1;
    let matchCount = 0;

    // We try to match as many characters of segText as possible against alignment
    // We allow skipping segment chars if they are punctuation and don't match alignment
    // We allow skipping alignment chars if they are whitespace/[emotion]

    let tempAlignIdx = alignIdx;
    let segCharIdx = 0;

    while (segCharIdx < segText.length && tempAlignIdx < alignmentChars.length) {
      const segChar = segText[segCharIdx];
      const alignChar = alignmentChars[tempAlignIdx];

      // 1. Skip Emotion Markers in Alignment [xxx]
      if (alignChar === '[') {
        while (tempAlignIdx < alignmentChars.length && alignmentChars[tempAlignIdx] !== ']') {
          tempAlignIdx++;
        }
        if (tempAlignIdx < alignmentChars.length) tempAlignIdx++; // consume ']'
        continue;
      }

      // 2. Skip Whitespace in Alignment (not in Segment)
      if (alignChar.trim() === '') {
        tempAlignIdx++;
        continue;
      }

      // 3. Match?
      if (alignChar.toLowerCase() === segChar.toLowerCase()) {
        if (startTimes[tempAlignIdx] < segMinStart) segMinStart = startTimes[tempAlignIdx];
        if (endTimes[tempAlignIdx] > segMaxEnd) segMaxEnd = endTimes[tempAlignIdx];

        matchCount++;
        tempAlignIdx++;
        segCharIdx++;
      } else {
        // Mismatch
        // If segChar is punctuation, maybe alignment doesn't have it? Skip segChar.
        if (isPunctuation(segChar)) {
          segCharIdx++;
          continue;
        }

        // If segChar is NOT punctuation, maybe alignment has extra char (noise)?
        // Or maybe we completely desynced. 
        // Let's try skipping alignment char.
        tempAlignIdx++;
      }
    }

    // If we matched at least one character, success
    if (matchCount > 0) {
      result.push({
        word: segText,
        start: segMinStart,
        end: segMaxEnd
      });
      lastEndTime = segMaxEnd;
      alignIdx = tempAlignIdx; // Commit alignment index
    } else {
      // Failed to match any meaningful characters.
      // This commonly happens if the segment is JUST punctuation (though we try to merge those now)
      // or if alignment is totally missing this part.

      // Force a 0-duration timing at lastEndTime
      result.push({
        word: segText,
        start: lastEndTime,
        end: lastEndTime
      });
    }
  }

  // Fix potential timing duplication/collapse at the end (e.g. alignment freeze)
  // We moved redistribution to after gap-filling in the main loop.
  return result;
}

/**
 * Heuristic to fix chains of words that have been collapsed to 0 duration
 * by stealing time from the preceding "long" word.
 */
function redistributeZeroDurationChains(timings: WordTiming[]): WordTiming[] {
  if (timings.length < 2) return timings;

  const result = [...timings];

  // Iterate to find chains of 0-duration words
  let i = 0;
  while (i < result.length) {
    if (result[i].start === result[i].end) {
      // Found a zero-duration word. Check if it's part of a chain.
      let chainStart = i;
      let chainEnd = i;
      while (chainEnd + 1 < result.length && result[chainEnd + 1].start === result[chainEnd + 1].end) {
        chainEnd++;
      }

      // We have a chain from [chainStart, chainEnd] of 0-duration words.

      // Strategy 1: Steal from PREVIOUS word (Backward)
      // Condition: contiguous and previous word is long enough to share.
      let distributed = false;
      const prevIdx = chainStart - 1;

      // Heuristic: Check forward first if the "stuck" timestamp matches the NEXT word's start
      // This handles cases where a block of text is "prepended" to a long segment due to lag.
      const nextIdx = chainEnd + 1;
      let useForward = false;

      if (nextIdx < result.length) {
        const nextWord = result[nextIdx];
        const chainTime = result[chainStart].start;
        // If next word starts exactly when chain is stuck, and has significant duration
        if (Math.abs(nextWord.start - chainTime) < 0.001 && (nextWord.end - nextWord.start) > 0.5) {
          useForward = true;
        }
      }

      // If not strictly better to use forward, try backward first (classic behavior)
      if (!useForward && prevIdx >= 0) {
        const prevWord = result[prevIdx];
        const chainFirst = result[chainStart];

        if (Math.abs(chainFirst.start - prevWord.end) < 0.001 && (prevWord.end - prevWord.start) > 0.1) {
          // Backward distribution
          const groupStart = prevWord.start;
          const groupEnd = prevWord.end;
          const totalDuration = groupEnd - groupStart;

          let totalLen = prevWord.word.length;
          for (let k = chainStart; k <= chainEnd; k++) totalLen += result[k].word.length;

          if (totalLen > 0) {
            let currentT = groupStart;
            // Update Previous Word
            const prevLen = prevWord.word.length;
            const prevDur = totalDuration * (prevLen / totalLen);
            prevWord.end = currentT + prevDur;
            currentT += prevDur;

            // Update Chain Words
            for (let k = chainStart; k <= chainEnd; k++) {
              const wLen = result[k].word.length;
              const wDur = totalDuration * (wLen / totalLen);
              result[k].start = currentT;
              result[k].end = currentT + wDur;
              currentT += wDur;
            }
            // Ensure precise end match
            result[chainEnd].end = groupEnd;
            distributed = true;
          }
        }
      }

      // Strategy 2: Steal from NEXT word (Forward)
      if (!distributed && nextIdx < result.length) {
        const nextWord = result[nextIdx];
        const chainLast = result[chainEnd];

        if (Math.abs(nextWord.start - chainLast.end) < 0.001 && (nextWord.end - nextWord.start) > 0.1) {
          // Forward distribution
          // Group: [...ChainWords, NextWord]
          const groupStart = chainLast.start; // Matches nextWord.start initially
          const groupEnd = nextWord.end;
          const totalDuration = groupEnd - groupStart;

          let totalLen = nextWord.word.length;
          for (let k = chainStart; k <= chainEnd; k++) totalLen += result[k].word.length;

          if (totalLen > 0) {
            let currentT = groupStart;
            // Update Chain Words
            for (let k = chainStart; k <= chainEnd; k++) {
              const wLen = result[k].word.length;
              const wDur = totalDuration * (wLen / totalLen);
              result[k].start = currentT;
              result[k].end = currentT + wDur;
              currentT += wDur;
            }

            // Update Next Word
            const nextLen = nextWord.word.length;
            const nextDur = totalDuration * (nextLen / totalLen);
            nextWord.start = currentT;
            // Ensure precise end match
            // nextWord.end matches groupEnd already
          }
          distributed = true;
        }
      }

      // Move i past this chain
      i = chainEnd + 1;
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Fallback: Distribute time evenly across segments based on text length
 */
function distributeTimings(
  segments: SentenceSegment[],
  startTime: number,
  endTime: number
): WordTiming[] {
  const result: WordTiming[] = [];
  const duration = endTime - startTime;

  // Calculate total length
  const totalLength = segments.reduce((sum, seg) => sum + (seg.text || '').length, 0);

  if (totalLength === 0) return [];

  let currentTime = startTime;
  const timePerChar = duration / totalLength;

  for (const seg of segments) {
    const text = seg.text || '';
    if (!text) continue;

    const segDuration = text.length * timePerChar;

    result.push({
      word: text,
      start: currentTime,
      end: currentTime + segDuration
    });

    currentTime += segDuration;
  }

  return result;
}

/**
 * Helper to collect stream chunks into a buffer
 */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  // Calculate total length
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

  // Combine chunks
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined.buffer;
}

/**
 * Fix aligned voice segments using a "Synchronization Point" strategy.
 * ElevenLabs timestamps can be erratic (too fast or too slow locally).
 * We calculate an expected "Global Speaking Rate" and find points where the 
 * actual timestamps align with the expected cumulative time (Sync Points).
 * We then redistribute the time between Sync Points uniformly based on text length.
 */
function fixVoiceSegmentTimings(
  voiceSegments: any[],
  sentences: DialogueSentence[]
): any[] {
  if (!voiceSegments || voiceSegments.length === 0) return [];
  if (voiceSegments.length !== sentences.length) {
    // Mismatch in counts, return raw to avoid further damage? 
    // Or try to handle? For now, return raw.
    return voiceSegments;
  }

  const fixed = JSON.parse(JSON.stringify(voiceSegments));

  // 1. Calculate stats
  const totalDuration = fixed[fixed.length - 1].endTimeSeconds - fixed[0].startTimeSeconds;

  // Calculate text lengths (used for weights)
  // We can strip emotion tags if we think they don't count for time, 
  // but generally sentence text length is good proxy.
  const lengths = sentences.map(s => s.text.length); // Use raw length including punctuation
  const totalChars = lengths.reduce((a, b) => a + b, 0);

  if (totalChars === 0 || totalDuration <= 0) return fixed;

  const avgSecondsPerChar = totalDuration / totalChars;

  // 2. Identification of Sync Points
  // A Sync Point is an index i where `endTime[i]` is "close enough" to `expectedEndTime[i]`
  // We always force index -1 (start) and index length-1 (end) as Sync Points.

  const syncPoints: number[] = [-1]; // Store INDICES of segments that end at a sync point.

  let cumulativeChars = 0;
  const TOLERANCE = 1.5; // 1.5 seconds tolerance.

  for (let i = 0; i < fixed.length - 1; i++) {
    cumulativeChars += lengths[i];
    const expectedEnd = fixed[0].startTimeSeconds + (cumulativeChars * avgSecondsPerChar);
    const actualEnd = fixed[i].endTimeSeconds;

    // Check if this point is "sane" enough to be an anchor.
    // We also check local plausibility: segment shouldn't be suspiciously short/fast relative to itself.
    const localDur = fixed[i].endTimeSeconds - fixed[i].startTimeSeconds;
    const localRate = localDur / lengths[i];
    const isLocallyExtreme = localRate < (avgSecondsPerChar * 0.2) || localRate > (avgSecondsPerChar * 3.0);

    if (!isLocallyExtreme && Math.abs(actualEnd - expectedEnd) < TOLERANCE) {
      syncPoints.push(i);
    }
  }

  syncPoints.push(fixed.length - 1); // Always include the last one

  // 3. Redistribute between Sync Points
  for (let k = 0; k < syncPoints.length - 1; k++) {
    const startIndex = syncPoints[k] + 1; // First segment in this block
    const endIndex = syncPoints[k + 1];     // Last segment in this block (inclusive)

    // If block has only 1 item, it's already "synced" (it is its own anchor), skip
    if (startIndex >= endIndex) continue;

    // Calculate total time and total chars in this block
    const blockStartTime = (startIndex === 0) ? fixed[0].startTimeSeconds : fixed[syncPoints[k]].endTimeSeconds;
    const blockEndTime = fixed[endIndex].endTimeSeconds;
    const blockDuration = blockEndTime - blockStartTime;

    let blockChars = 0;
    for (let j = startIndex; j <= endIndex; j++) {
      blockChars += lengths[j];
    }

    if (blockChars > 0) {
      let currentT = blockStartTime;
      for (let j = startIndex; j <= endIndex; j++) {
        const weight = lengths[j] / blockChars;
        const dur = blockDuration * weight;

        fixed[j].startTimeSeconds = currentT;
        fixed[j].endTimeSeconds = currentT + dur;

        // Invalidate char indices as we are drifting from the "truth"
        // This forces the robust fallback in the main loop
        fixed[j].characterStartIndex = 0;
        fixed[j].characterEndIndex = 0;

        currentT += dur;
      }
      // Snap last one to exact block end
      fixed[endIndex].endTimeSeconds = blockEndTime;
    }
  }

  return fixed;
}

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Generate dialogue audio from conversation sentences with word timings
 */
export async function generateDialogue(
  sentences: DialogueSentence[],
  participants: ConversationParticipant[],
  speed: number = 1.0
): Promise<GenerateDialogueResult> {
  const client = getClient();

  // Sort sentences by order
  const sortedSentences = [...sentences].sort((a, b) => a.order - b.order);

  // Create voice ID lookup map
  const voiceMap = new Map<string, string>();
  for (const participant of participants) {
    voiceMap.set(participant.role, participant.voiceId);
  }

  // Build dialogue inputs
  const inputs = sortedSentences.map(sentence => ({
    text: formatSentenceWithEmotion(sentence),
    voiceId: voiceMap.get(sentence.participantRole) || '',
  }));

  // Validate all inputs have voice IDs
  for (const input of inputs) {
    if (!input.voiceId) {
      throw new Error('All participants must have a voice assigned');
    }
  }

  try {
    // Try convertWithTimestamps first for word timing data
    const response = await client.textToDialogue.convertWithTimestamps({
      inputs,
      modelId: 'eleven_v3',
    });

    // Response structure from ElevenLabs:
    // - audioBase64: the audio data
    // - voiceSegments: array of VoiceSegment with startTimeSeconds, endTimeSeconds, characterStartIndex, characterEndIndex
    // - alignment: GLOBAL character timing for all text combined
    // - normalizedAlignment: GLOBAL normalized character timing
    const audioBase64 = response.audioBase64;
    const rawVoiceSegments = response.voiceSegments || [];
    // Fix broken voice segments (collapsed timings)
    const voiceSegments = fixVoiceSegmentTimings(rawVoiceSegments, sortedSentences);

    // Use normalized alignment if available (handles text normalization), otherwise use regular alignment
    const globalAlignment = response.normalizedAlignment || response.alignment;

    // Decode base64 audio
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    let audioBuffer = Buffer.from(bytes);
    // Build alignment from voice segments
    const segments: DialogueSegment[] = [];
    let totalDuration = 0;

    // We iterate sentences and use the corresponding voiceSegment to define strict boundaries
    for (let i = 0; i < sortedSentences.length; i++) {
      const sentence = sortedSentences[i];
      const voiceSegment = voiceSegments[i];

      if (!voiceSegment) {
        // Should not happen if inputs matched 1:1
        continue;
      }

      let startTime = voiceSegment.startTimeSeconds;
      let endTime = voiceSegment.endTimeSeconds;
      let words: WordTiming[] = [];

      // strict isolation: use the indices provided by the API
      const charStart = voiceSegment.characterStartIndex;
      const charEnd = voiceSegment.characterEndIndex;

      if (
        globalAlignment?.characters &&
        globalAlignment?.characterStartTimesSeconds &&
        globalAlignment?.characterEndTimesSeconds &&
        charEnd > charStart
      ) {
        // Slice global alignment for this specific sentence
        const segmentChars = globalAlignment.characters.slice(charStart, charEnd);
        const segmentStartTimes = globalAlignment.characterStartTimesSeconds.slice(charStart, charEnd);
        const segmentEndTimes = globalAlignment.characterEndTimesSeconds.slice(charStart, charEnd);

        // Generate Words within this slice
        if (sentence.segments && sentence.segments.length > 0) {
          words = mapSegmentsToTimings(sentence.segments, segmentChars, segmentStartTimes, segmentEndTimes);

          // Fix: If mapSegmentsToTimings returns 0-duration words due to bad alignment in this slice,
          // or if the words don't cover the full duration, we might need to adjust.
          // But relying on mapSegmentsToTimings is usually best if alignment exists.

          // Sanity check: if we have 0 words but we have segments, something went wrong.
          // Or if almost all words are 0 duration.
          const validWords = words.filter(w => w.end > w.start).length;
          if (words.length > 0 && validWords === 0) {
            // Fallback to distribution if alignment failed completely for this sentence
            words = distributeTimings(sentence.segments, startTime, endTime);
          }
        } else {
          words = extractWordTimings(segmentChars, segmentStartTimes, segmentEndTimes);
        }
      }

      // Fallback if no words generated (e.g. alignment missing)
      if (words.length === 0 && sentence.segments && sentence.segments.length > 0) {
        words = distributeTimings(sentence.segments, startTime, endTime);
      }

      // Local Post-process for this sentence: Fill gaps to ensure words cover the full voiceSegment duration
      if (words.length > 0) {
        // Clamp start
        if (words[0].start < startTime) words[0].start = startTime;
        if (words[0].start > startTime) words[0].start = startTime; // Force snap to start

        // Fill internal gaps
        for (let j = 0; j < words.length - 1; j++) {
          // If there is a gap between words, close it
          if (words[j].end < words[j + 1].start) {
            words[j].end = words[j + 1].start;
          }
          // If overlaps, fix it? mapSegmentsToTimings shouldn't produce overlaps usually.
        }

        // Clamp/Snap end
        const lastIdx = words.length - 1;
        if (words[lastIdx].end < endTime) words[lastIdx].end = endTime; // Extend last word to sentence end
        if (words[lastIdx].end > endTime + 0.5) words[lastIdx].end = endTime; // detailed clip if way over?
      }

      // Redistribute purely within this sentence
      words = redistributeZeroDurationChains(words);

      segments.push({
        sentenceId: sentence.id,
        text: sentence.text,
        participantRole: sentence.participantRole,
        startTime,
        endTime,
        words,
      });
    }

    // Correct timestamps if speed is not 1.0
    if (speed !== 1.0) {
      const scale = 1 / speed;

      // 1. Scale Alignment
      totalDuration *= scale;
      segments.forEach(seg => {
        seg.startTime *= scale;
        seg.endTime *= scale;
        seg.words.forEach(w => {
          w.start *= scale;
          w.end *= scale;
        });
      });

      // 2. Process Audio with FFmpeg
      const tempInput = path.join(os.tmpdir(), `input-${Date.now()}-${Math.random()}.mp3`);
      const tempOutput = path.join(os.tmpdir(), `output-${Date.now()}-${Math.random()}.mp3`);

      fs.writeFileSync(tempInput, audioBuffer);

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', tempInput,
          '-filter:a', `atempo=${speed}`,
          '-vn', // No video
          '-y',  // Overwrite
          tempOutput
        ]);

        ffmpeg.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg process exited with code ${code}`));
        });

        ffmpeg.on('error', (err) => reject(err));
      });

      audioBuffer = fs.readFileSync(tempOutput);

      // Cleanup
      try {
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);
      } catch (e) { console.error('Error cleaning up temp files', e); }
    }

    return {
      audioBuffer,
      alignment: {
        segments,
        totalDuration,
      },
      debug: {
        voiceSegments,
        globalAlignment,
      }
    };

  } catch (error: any) {
    // If convertWithTimestamps fails, fall back to regular convert
    console.warn('textToDialogue.convertWithTimestamps failed, falling back to convert:', error.message);

    const audioStream = await client.textToDialogue.convert({
      inputs,
      modelId: 'eleven_v3',
    });

    let audioBuffer = await streamToBuffer(audioStream);

    // Create basic alignment without word timings
    const segments: DialogueSegment[] = sortedSentences.map(sentence => ({
      sentenceId: sentence.id,
      text: sentence.text,
      participantRole: sentence.participantRole,
      startTime: 0,
      endTime: 0,
      words: [],
    }));

    // Even in fallback, we should apply speed if requested
    if (speed !== 1.0) {
      // We don't have timings to scale (they are 0), but we should process audio
      const tempInput = path.join(os.tmpdir(), `fallback-input-${Date.now()}.mp3`);
      const tempOutput = path.join(os.tmpdir(), `fallback-output-${Date.now()}.mp3`);

      fs.writeFileSync(tempInput, audioBuffer);

      try {
        await new Promise<void>((resolve, reject) => {
          const ffmpeg = spawn('ffmpeg', [
            '-i', tempInput,
            '-filter:a', `atempo=${speed}`,
            '-vn', '-y', tempOutput
          ]);
          ffmpeg.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}`));
          });
        });
        audioBuffer = fs.readFileSync(tempOutput);
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);
      } catch (err) {
        console.warn('Failed to apply speed in fallback:', err);
      }
    }

    return {
      audioBuffer,
      alignment: {
        segments,
        totalDuration: 0,
      },
    };
  }
}

/**
 * Get available tones for emotional delivery
 */
export function getAvailableTones(): string[] {
  return [
    'cheerfully',
    'sadly',
    'angrily',
    'excitedly',
    'calmly',
    'nervously',
    'sarcastically',
    'whispering',
    'shouting',
    'warmly',
    'coldly',
    'mysteriously',
    'playfully',
  ];
}

/**
 * Get available emotions for delivery
 */
export function getAvailableEmotions(): string[] {
  return [
    'happy',
    'sad',
    'angry',
    'surprised',
    'fearful',
    'disgusted',
    'neutral',
    'excited',
    'anxious',
    'confident',
    'curious',
    'tired',
  ];
}
