import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { IconWand, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GenerateExamRequest } from '@/lib/types/api/generate-exam';

interface GenerateExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonName?: string;
}

export function GenerateExamDialog({ open, onOpenChange, lessonId, lessonName }: GenerateExamDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(`Bài kiểm tra cho ${lessonName || 'Bài học'}`);
  const [instructions, setInstructions] = useState('');
  const [counts, setCounts] = useState({
    multipleChoice: 5,
    fillInBlank: 2,
    matching: 2,
    trueFalse: 0,
    shortAnswer: 0,
    speak: 0,
  });

  // Total questions
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateExamRequest) => {
      const res = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.code !== 200) throw new Error(json.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', lessonId] });
      toast.success('Tạo bài kiểm tra thành công!');
      onOpenChange(false);
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  const handleSubmit = () => {
    generateMutation.mutate({
      lessonId,
      name,
      instructions,
      questionCounts: counts,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconWand className="h-5 w-5 text-purple-500" />
            Tạo bài kiểm tra bằng AI
          </DialogTitle>
          <DialogDescription>
            Tự động tạo bài kiểm tra dựa trên nội dung bài học này (Hội thoại, Từ vựng, Ngữ pháp).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Tên bài kiểm tra</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instructions">Hướng dẫn tùy chỉnh (Tùy chọn)</Label>
            <Textarea
              id="instructions"
              placeholder="Ví dụ: Tập trung vào từ vựng HSK 3, đảm bảo câu hỏi khó..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
            />
          </div>

          <div className="grid gap-3">
            <Label>Phân bổ câu hỏi (Tổng: {total})</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trắc nghiệm</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.multipleChoice}
                  onChange={e => setCounts(c => ({ ...c, multipleChoice: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Điền vào chỗ trống</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.fillInBlank}
                  onChange={e => setCounts(c => ({ ...c, fillInBlank: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nối</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.matching}
                  onChange={e => setCounts(c => ({ ...c, matching: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Đúng/Sai</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.trueFalse}
                  onChange={e => setCounts(c => ({ ...c, trueFalse: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trả lời ngắn</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.shortAnswer}
                  onChange={e => setCounts(c => ({ ...c, shortAnswer: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nói</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.speak}
                  onChange={e => setCounts(c => ({ ...c, speak: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={generateMutation.isPending || total === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generateMutation.isPending && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tạo bài kiểm tra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
