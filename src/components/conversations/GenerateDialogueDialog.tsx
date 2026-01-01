import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconSparkles, IconLoader2 } from '@tabler/icons-react';
import { ConversationParticipant, DialogueSentence } from '@/lib/types/models/conversation';
import { toast } from 'sonner';
import { GeneratedDialogue } from '@/lib/services/openai';

const generateSchema = z.object({
  sentenceCount: z.coerce.number().min(2, 'Tối thiểu 2 câu').max(20, 'Tối đa 20 câu'),
  level: z.string().min(1, 'Vui lòng chọn trình độ'),
  topic: z.string().min(5, 'Chủ đề phải có ít nhất 5 ký tự'),
  model: z.string().min(1, 'Vui lòng chọn mô hình'),
});

type GenerateFormValues = z.infer<typeof generateSchema>;

interface GenerateDialogueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: ConversationParticipant[];
  onGenerate: (sentences: DialogueSentence[]) => void;
}

export function GenerateDialogueDialog({ open, onOpenChange, participants, onGenerate }: GenerateDialogueDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema) as any,
    defaultValues: {
      sentenceCount: 6,
      level: 'HSK 2',
      topic: '',
      model: 'gpt-5.1',
    },
  });

  // Watch for manual select handling if needed, but we use controlled components with setValue
  const level = watch('level');
  const model = watch('model');

  const onSubmit = async (data: GenerateFormValues) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/conversations/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          participants,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.message || 'Tạo hội thoại thất bại');
      }

      const result = await response.json();
      const generatedData: GeneratedDialogue = result.data;

      // Transform generated sentences to DialogueSentence format
      const newSentences: DialogueSentence[] = generatedData.sentences.map((s, index) => ({
        id: crypto.randomUUID(),
        participantRole: s.participantRole,
        text: s.text,
        tone: s.tone || '',
        emotion: s.emotion || '',
        order: index,
        // Optional fields if you have them in your DB schema but not strictly required by UI yet
        // pinyin: s.pinyin,
        // translation: s.translation
      }));

      onGenerate(newSentences);
      onOpenChange(false);
      toast.success('Tạo hội thoại thành công!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo bằng AI</DialogTitle>
          <DialogDescription>Tạo hội thoại thực tế dựa trên yêu cầu của bạn.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Số câu</Label>
              <Input type="number" {...register('sentenceCount')} min={2} max={20} />
              {errors.sentenceCount && <p className="text-xs text-destructive">{errors.sentenceCount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Mô hình</Label>
              <Select value={model} onValueChange={val => setValue('model', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mô hình" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5.1">GPT-5.1 (Mới nhất)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Nhanh)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (Thông minh)</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
              {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trình độ học tập</Label>
            <Select value={level} onValueChange={val => setValue('level', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn trình độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HSK 1">HSK 1 (Sơ cấp)</SelectItem>
                <SelectItem value="HSK 2">HSK 2 (Sơ trung cấp)</SelectItem>
                <SelectItem value="HSK 3">HSK 3 (Trung cấp)</SelectItem>
                <SelectItem value="HSK 4">HSK 4 (Trung cao cấp)</SelectItem>
                <SelectItem value="HSK 5">HSK 5 (Cao cấp)</SelectItem>
                <SelectItem value="HSK 6">HSK 6 (Thành thạo)</SelectItem>
                <SelectItem value="HSK 7 - 9">HSK 7 - 9 (Tinh thông)</SelectItem>
              </SelectContent>
            </Select>
            {errors.level && <p className="text-xs text-destructive">{errors.level.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Chủ đề / Yêu cầu</Label>
            <Textarea
              {...register('topic')}
              placeholder="Ví dụ: Thảo luận kế hoạch cuối tuần, gọi món tại nhà hàng..."
              className="min-h-[100px]"
            />
            {errors.topic && <p className="text-xs text-destructive">{errors.topic.message}</p>}
            <p className="text-xs text-muted-foreground">
              Mô tả tình huống, từ vựng cụ thể cần dùng, hoặc mối quan hệ giữa những người nói.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Hủy
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <IconSparkles className="mr-2 h-4 w-4" />
                  Tạo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
