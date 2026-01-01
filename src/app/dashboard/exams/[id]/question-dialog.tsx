'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExamQuestion, ExamQuestionType, ExamQuestionOption } from '@/lib/types/models/exam';
import { Attachment } from '@/lib/types/models/attachment';
import { useEffect, useRef, useState } from 'react';
import { IconPlus, IconTrash, IconUpload, IconX } from '@tabler/icons-react';

const optionSchema = z.object({
  text: z.string(),
  file: z.any().optional(),
  isCorrect: z.boolean().optional(),
});

const typesWithOptionsSet = new Set([ExamQuestionType.MultipleChoice, ExamQuestionType.ListenAndChoose]);

const questionSchema = z
  .object({
    type: z.enum(ExamQuestionType),
    question: z.string().min(1, 'Câu hỏi là bắt buộc'),
    answer: z.string().optional(),
    options: z.array(optionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (typesWithOptionsSet.has(data.type)) {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cần ít nhất một tùy chọn', path: ['options'] });
      } else {
        data.options.forEach((opt, i) => {
          if (!opt.text || opt.text.trim() === '') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Nội dung tùy chọn là bắt buộc',
              path: ['options', i, 'text'],
            });
          }
        });
      }
    }
  });

type QuestionFormData = z.infer<typeof questionSchema>;

export const questionTypeLabels: Record<ExamQuestionType, string> = {
  [ExamQuestionType.MultipleChoice]: 'Trắc nghiệm',
  [ExamQuestionType.TrueFalse]: 'Đúng / Sai',
  [ExamQuestionType.ShortAnswer]: 'Trả lời ngắn',
  [ExamQuestionType.LongAnswer]: 'Trả lời dài',
  [ExamQuestionType.ListenAndRepeat]: 'Nghe và Lặp lại',
  [ExamQuestionType.ListenAndAnswer]: 'Nghe và Trả lời',
  [ExamQuestionType.ListenAndWrite]: 'Nghe và Viết',
  [ExamQuestionType.ListenAndChoose]: 'Nghe và Chọn',
};

const typesWithoutAnswer = [
  ExamQuestionType.LongAnswer,
  ExamQuestionType.MultipleChoice,
  ExamQuestionType.ListenAndChoose,
];

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  question?: ExamQuestion | null;
}

async function uploadFile(file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function createQuestion(examId: string, data: any): Promise<ExamQuestion> {
  const res = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, examId }),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function updateQuestion(id: string, data: any): Promise<ExamQuestion> {
  const res = await fetch(`/api/questions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

function OptionRow({
  index,
  form,
  onRemove,
  canRemove,
}: {
  index: number;
  form: any;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFile = form.watch(`options.${index}.file`);

  const handleOptionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await uploadFile(file);
      form.setValue(`options.${index}.file`, attachment);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-2 p-2 border rounded">
      <FormField
        control={form.control}
        name={`options.${index}.isCorrect`}
        render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-2" />}
      />
      <div className="flex-1 space-y-2">
        <FormField
          control={form.control}
          name={`options.${index}.text`}
          render={({ field }) => <Input placeholder={`Tùy chọn ${index + 1}`} {...field} />}
        />
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleOptionFileUpload} className="hidden" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <IconUpload className="h-3 w-3 mr-1" />
            {uploading ? '...' : 'Tệp'}
          </Button>
          {optionFile && (
            <div className="flex items-center gap-1 text-xs">
              <span className="truncate max-w-[150px]">{optionFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => form.setValue(`options.${index}.file`, undefined)}
              >
                <IconX className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} disabled={!canRemove} className="mt-1">
        <IconTrash className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function QuestionDialog({ open, onOpenChange, examId, question }: QuestionDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!question;
  const [questionFile, setQuestionFile] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: ExamQuestionType.MultipleChoice,
      question: '',
      answer: '',
      options: [{ text: '', isCorrect: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'options' });
  const watchedType = form.watch('type');

  useEffect(() => {
    if (question) {
      form.reset({
        type: question.type,
        question: question.question,
        answer: question.answer,
        options: question.options?.map(o => ({ text: o.text, file: o.file, isCorrect: o.isCorrect })) || [],
      });
      setQuestionFile(question.file || null);
    } else {
      form.reset({
        type: ExamQuestionType.MultipleChoice,
        question: '',
        answer: '',
        options: [{ text: '', isCorrect: false }],
      });
      setQuestionFile(null);
    }
  }, [question, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await uploadFile(file);
      setQuestionFile(attachment);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: QuestionFormData) => {
      const payload: any = {
        type: data.type,
        question: data.question,
        answer: data.answer || '',
      };
      if (questionFile) payload.file = questionFile;
      if (typesWithOptionsSet.has(data.type) && data.options) {
        payload.options = data.options.filter(o => o.text?.trim());
      }
      return isEditing ? updateQuestion(question._id, payload) : createQuestion(examId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', examId] });
      toast.success(isEditing ? 'Đã cập nhật câu hỏi' : 'Đã tạo câu hỏi');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (data: QuestionFormData) => mutation.mutate(data);
  const onError = (errors: any) => console.error('Form validation errors:', errors);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ExamQuestionType).map(t => (
                        <SelectItem key={t} value={t}>
                          {questionTypeLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Câu hỏi</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Nhập câu hỏi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Tệp đính kèm</FormLabel>
              <div className="flex items-center gap-2 mt-1">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <IconUpload className="h-4 w-4 mr-1" />
                  {uploading ? 'Đang tải lên...' : 'Tải lên'}
                </Button>
                {questionFile && (
                  <div className="flex items-center gap-1 text-sm">
                    <span>{questionFile.name}</span>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setQuestionFile(null)}>
                      <IconX className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {typesWithOptionsSet.has(watchedType) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel>Tùy chọn</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ text: '', isCorrect: false })}
                  >
                    <IconPlus className="h-4 w-4 mr-1" />
                    Thêm
                  </Button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <OptionRow
                      key={field.id}
                      index={index}
                      form={form}
                      onRemove={() => remove(index)}
                      canRemove={fields.length > 1}
                    />
                  ))}
                </div>
              </div>
            )}
            {!typesWithoutAnswer.includes(watchedType) && (
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Câu trả lời</FormLabel>
                    {watchedType === ExamQuestionType.TrueFalse ? (
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          value={field.value}
                          onValueChange={field.onChange}
                          variant="outline"
                          className="justify-start"
                        >
                          <ToggleGroupItem value="true">Đúng</ToggleGroupItem>
                          <ToggleGroupItem value="false">Sai</ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                    ) : (
                      <FormControl>
                        <Input placeholder="Câu trả lời đúng" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
