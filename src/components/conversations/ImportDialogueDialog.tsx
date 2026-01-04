'use client';

import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { IconUpload, IconUser, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { ConversationParticipant, DialogueSentence, ParticipantRole } from '@/lib/types/models/conversation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

interface ParsedLine {
    speaker: string;
    text: string;
    participantRole: ParticipantRole;
}

interface ImportDialogueDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    participants: ConversationParticipant[];
    onImport: (sentences: DialogueSentence[], updatedParticipants: ConversationParticipant[]) => void;
}

export function ImportDialogueDialog({ open, onOpenChange, participants, onImport }: ImportDialogueDialogProps) {
    const [textInput, setTextInput] = useState('');

    // Parse the input text and extract dialogue lines
    const parsedResult = useMemo(() => {
        if (!textInput.trim()) {
            return { lines: [], speakers: [], error: null };
        }

        const lines: ParsedLine[] = [];
        const speakers = new Map<string, number>(); // speaker name -> count
        const rawLines = textInput.split('\n').filter(line => line.trim());

        // Common patterns for dialogue:
        // 1. "Speaker: message" or "Speaker：message" (Chinese colon)
        // 2. "Speaker - message"
        // 3. "[Speaker] message"
        // 4. "(Speaker) message"
        const patterns = [
            /^([^:：\-\[\]()\n]+?)[:：]\s*(.+)$/,   // Speaker: message or Speaker：message
            /^([^:：\-\[\]()\n]+?)\s*-\s*(.+)$/,    // Speaker - message
            /^\[([^\]]+)\]\s*(.+)$/,                 // [Speaker] message
            /^\(([^)]+)\)\s*(.+)$/,                  // (Speaker) message
        ];

        for (const rawLine of rawLines) {
            const line = rawLine.trim();
            if (!line) continue;

            let matched = false;
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    const speaker = match[1].trim();
                    const text = match[2].trim();

                    if (speaker && text) {
                        speakers.set(speaker, (speakers.get(speaker) || 0) + 1);
                        lines.push({ speaker, text, participantRole: ParticipantRole.Speaker1 }); // Will be assigned later
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched && line) {
                // Could not parse this line - return an error
                return {
                    lines: [],
                    speakers: [],
                    error: `Không thể phân tích dòng: "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`,
                };
            }
        }

        // Sort speakers by occurrence count (most common first)
        const sortedSpeakers = Array.from(speakers.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);

        // Validate: we need at least 2 speakers for a dialogue (or allow 1 for monologue)
        if (sortedSpeakers.length > 2) {
            return {
                lines: [],
                speakers: [],
                error: `Phát hiện ${sortedSpeakers.length} người nói. Hiện tại chỉ hỗ trợ tối đa 2 người nói.`,
            };
        }

        if (sortedSpeakers.length === 0) {
            return {
                lines: [],
                speakers: [],
                error: 'Không tìm thấy hội thoại hợp lệ. Vui lòng sử dụng định dạng: "Tên: Nội dung"',
            };
        }

        // Assign participant roles based on order of first appearance
        const speakerRoleMap = new Map<string, ParticipantRole>();
        for (const line of lines) {
            if (!speakerRoleMap.has(line.speaker)) {
                speakerRoleMap.set(
                    line.speaker,
                    speakerRoleMap.size === 0 ? ParticipantRole.Speaker1 : ParticipantRole.Speaker2
                );
            }
            line.participantRole = speakerRoleMap.get(line.speaker)!;
        }

        return {
            lines,
            speakers: sortedSpeakers,
            error: null,
        };
    }, [textInput]);

    const handleImport = () => {
        if (parsedResult.error || parsedResult.lines.length === 0) {
            toast.error('Vui lòng nhập hội thoại hợp lệ');
            return;
        }

        // Create updated participants with new names
        const updatedParticipants = [...participants];
        const { speakers, lines } = parsedResult;

        // Map speaker names to participants
        if (speakers[0]) {
            const speaker1Idx = updatedParticipants.findIndex(p => p.role === ParticipantRole.Speaker1);
            if (speaker1Idx >= 0) {
                updatedParticipants[speaker1Idx] = {
                    ...updatedParticipants[speaker1Idx],
                    name: speakers[0],
                };
            }
        }

        if (speakers[1]) {
            const speaker2Idx = updatedParticipants.findIndex(p => p.role === ParticipantRole.Speaker2);
            if (speaker2Idx >= 0) {
                updatedParticipants[speaker2Idx] = {
                    ...updatedParticipants[speaker2Idx],
                    name: speakers[1],
                };
            }
        }

        // Create dialogue sentences
        const sentences: DialogueSentence[] = lines.map((line, index) => ({
            id: crypto.randomUUID(),
            participantRole: line.participantRole,
            text: line.text,
            segments: [{
                text: line.text,
                pinyin: '',
                translation: ''
            }],
            tone: '',
            emotion: '',
            order: index,
        }));

        onImport(sentences, updatedParticipants);
        onOpenChange(false);
        setTextInput('');
        toast.success(`Đã nhập ${sentences.length} câu hội thoại`);
    };

    const isValid = !parsedResult.error && parsedResult.lines.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconUpload className="h-5 w-5" />
                        Nhập từ văn bản
                    </DialogTitle>
                    <DialogDescription>
                        Dán hội thoại theo định dạng văn bản. Người nói và nội dung sẽ được tự động phát hiện.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Input area */}
                    <div className="space-y-2">
                        <Label>Nội dung hội thoại</Label>
                        <Textarea
                            value={textInput}
                            onChange={e => setTextInput(e.target.value)}
                            placeholder={`Ví dụ:
小明: 你好！今天天气真好。
小红: 是啊，我们去公园散步吧！
小明: 好主意！我们走吧。

Hoặc:
[Person A] Hello, how are you?
[Person B] I'm fine, thank you!`}
                            className="min-h-[200px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Hỗ trợ các định dạng: <code className="bg-muted px-1 rounded">Tên: Nội dung</code>,
                            <code className="bg-muted px-1 rounded mx-1">Tên - Nội dung</code>,
                            <code className="bg-muted px-1 rounded">[Tên] Nội dung</code>
                        </p>
                    </div>

                    {/* Preview */}
                    {textInput.trim() && (
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                Xem trước
                                {isValid ? (
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                        <IconCheck className="h-3 w-3 mr-1" />
                                        Hợp lệ
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive">
                                        <IconAlertCircle className="h-3 w-3 mr-1" />
                                        Lỗi
                                    </Badge>
                                )}
                            </Label>

                            {parsedResult.error ? (
                                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                                    <IconAlertCircle className="h-4 w-4 inline mr-2" />
                                    {parsedResult.error}
                                </div>
                            ) : (
                                <>
                                    {/* Detected speakers */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-muted-foreground">Người nói phát hiện:</span>
                                        {parsedResult.speakers.map((speaker, idx) => (
                                            <Badge
                                                key={speaker}
                                                variant={idx === 0 ? 'default' : 'secondary'}
                                                className={cn(
                                                    idx === 0
                                                        ? 'bg-blue-500/80 hover:bg-blue-500'
                                                        : 'bg-green-500/80 hover:bg-green-500 text-white'
                                                )}
                                            >
                                                <IconUser className="h-3 w-3 mr-1" />
                                                {speaker}
                                            </Badge>
                                        ))}
                                    </div>

                                    {/* Preview lines */}
                                    <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/30">
                                        {parsedResult.lines.map((line, idx) => (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    'flex items-start gap-2 p-2 rounded text-sm',
                                                    line.participantRole === ParticipantRole.Speaker1
                                                        ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                                                        : 'bg-green-500/10 border-l-2 border-l-green-500'
                                                )}
                                            >
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'shrink-0 text-xs',
                                                        line.participantRole === ParticipantRole.Speaker1
                                                            ? 'border-blue-500/50 text-blue-600'
                                                            : 'border-green-500/50 text-green-600'
                                                    )}
                                                >
                                                    {line.speaker}
                                                </Badge>
                                                <span className="text-foreground/90">{line.text}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        Tổng cộng: {parsedResult.lines.length} câu hội thoại
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleImport} disabled={!isValid}>
                        <IconUpload className="mr-2 h-4 w-4" />
                        Nhập {isValid ? `(${parsedResult.lines.length} câu)` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
