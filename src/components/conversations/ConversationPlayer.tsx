
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { IconPlayerPlay, IconPlayerPause, IconPlayerSkipBack, IconPlayerSkipForward, IconVolume } from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';

interface ConversationPlayerProps {
    audioUrl: string;
    onTimeUpdate: (time: number) => void;
    className?: string;
    duration?: number;
}

export function ConversationPlayer({ audioUrl, onTimeUpdate, className, duration: providedDuration }: ConversationPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(providedDuration || 0);
    const [volume, setVolume] = useState(1);

    useEffect(() => {
        // If URL changes, reset
        setIsPlaying(false);
        setCurrentTime(0);
        onTimeUpdate(0);
    }, [audioUrl, onTimeUpdate]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const t = audioRef.current.currentTime;
            setCurrentTime(t);
            onTimeUpdate(t);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onTimeUpdate(0);
    };

    const handleSeek = (values: number[]) => {
        const newTime = values[0];
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            onTimeUpdate(newTime);
        }
    };

    const formatTime = (t: number) => {
        const mins = Math.floor(t / 60);
        const secs = Math.floor(t % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper to fetch Signed URL if needed
    // Assuming audioUrl is a key, we need a way to play it.
    // The Page component provided a download link using `/api/utils/download`.
    // We can use that same endpoint for src?
    // Or if audioUrl comes from the API fully formed?
    // In `ConversationEditorPage` `audioUrl` is `conversations/...mp3`.
    // The `downloadAudio` function fetches `/api/conversations/[id]/download` which returns `{ url: signedUrl }`.
    // We should prefer passing the real playable URL to this component.
    // I will assume the parent components logic fetches the signed URL or we use the proxy endpoint.
    // Based on the `DropdownMenu`, it uses `/api/utils/download?key=...`.
    // I will use that for now.

    const src = audioUrl.startsWith('http') ? audioUrl : `/api/utils/download?key=${encodeURIComponent(audioUrl)}&contentType=audio/mpeg`;

    return (
        <div className={cn("flex items-center gap-4 p-3 bg-card border rounded-lg shadow-sm w-full", className)}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={togglePlay}>
                {isPlaying ? <IconPlayerPause className="h-5 w-5 fill-current" /> : <IconPlayerPlay className="h-5 w-5 fill-current ml-0.5" />}
            </Button>

            <div className="flex-1 flex flex-col gap-1 min-w-0">
                <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

        </div>
    );
}
