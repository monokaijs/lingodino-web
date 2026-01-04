import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogueSentence, SentenceSegment } from "@/lib/types/models/conversation";
import { useState, useEffect } from "react";
import { IconTrash, IconPlus } from "@tabler/icons-react";

interface SentenceEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sentence: DialogueSentence | null;
    onSave: (id: string, updates: Partial<DialogueSentence>) => void;
}

export function SentenceEditorDialog({ open, onOpenChange, sentence, onSave }: SentenceEditorDialogProps) {
    const [segments, setSegments] = useState<SentenceSegment[]>([]);

    useEffect(() => {
        if (open && sentence) {
            setSegments(sentence.segments || [{ text: sentence.text, pinyin: '', translation: '' }]);
        }
    }, [open, sentence]);

    const handleSave = () => {
        if (!sentence) return;

        // Reconstruct full text from segments
        const text = segments.map(s => s.text).join('');
        onSave(sentence.id, { segments, text });
        onOpenChange(false);
    };

    const updateSegment = (index: number, field: keyof SentenceSegment, value: string) => {
        const newSegments = [...segments];
        newSegments[index] = { ...newSegments[index], [field]: value };
        setSegments(newSegments);
    };

    const removeSegment = (index: number) => {
        setSegments(segments.filter((_, i) => i !== index));
    };

    const addSegment = () => {
        setSegments([...segments, { text: '', pinyin: '', translation: '' }]);
    };

    if (!sentence) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa chi tiết câu</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    <div className="space-y-3 p-1">
                        {segments.map((segment, idx) => (
                            <div key={idx} className="flex items-end gap-3 p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                                {/* Text */}
                                <div className="flex-[2] space-y-1.5">
                                    <Label className="text-xs text-muted-foreground font-semibold">Từ (Hán tự)</Label>
                                    <Input
                                        value={segment.text}
                                        onChange={(e) => updateSegment(idx, 'text', e.target.value)}
                                        className="font-medium bg-background"
                                        placeholder="你好"
                                    />
                                </div>

                                {/* Pinyin */}
                                <div className="flex-[2] space-y-1.5">
                                    <Label className="text-xs text-muted-foreground font-semibold">Pinyin</Label>
                                    <Input
                                        value={segment.pinyin}
                                        onChange={(e) => updateSegment(idx, 'pinyin', e.target.value)}
                                        className="font-mono text-sm bg-background"
                                        placeholder="nǐ hǎo"
                                    />
                                </div>

                                {/* Translation */}
                                <div className="flex-[3] space-y-1.5">
                                    <Label className="text-xs text-muted-foreground font-semibold">Nghĩa</Label>
                                    <Input
                                        value={segment.translation}
                                        onChange={(e) => updateSegment(idx, 'translation', e.target.value)}
                                        className="bg-background"
                                        placeholder="xin chào"
                                    />
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 mb-0.5"
                                    onClick={() => removeSegment(idx)}
                                >
                                    <IconTrash className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}

                        <Button variant="outline" className="w-full border-dashed py-6 text-muted-foreground hover:text-primary" onClick={addSegment}>
                            <IconPlus className="h-4 w-4 mr-2" />
                            Thêm từ mới
                        </Button>
                    </div>
                </div>

                <DialogFooter className="mt-4 pt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ bỏ</Button>
                    <Button onClick={handleSave}>Lưu thay đổi</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
