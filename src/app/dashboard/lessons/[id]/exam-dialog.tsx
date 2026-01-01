'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Exam } from '@/lib/types/models/exam';
import { useEffect } from 'react';

const examSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc'),
  description: z.string().optional(),
});

type ExamFormData = z.infer<typeof examSchema>;

interface ExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  exam?: Exam | null;
}

async function createExam(lessonId: string, data: ExamFormData): Promise<Exam> {
  const res = await fetch('/api/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, lessonId }),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function updateExam(id: string, data: ExamFormData): Promise<Exam> {
  const res = await fetch(`/api/exams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

export function ExamDialog({ open, onOpenChange, lessonId, exam }: ExamDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!exam;

  const form = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (exam) {
      form.reset({ name: exam.name, description: exam.description || '' });
    } else {
      form.reset({ name: '', description: '' });
    }
  }, [exam, form]);

  const mutation = useMutation({
    mutationFn: (data: ExamFormData) => (isEditing ? updateExam(exam._id, data) : createExam(lessonId, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', lessonId] });
      toast.success(isEditing ? 'Đã cập nhật bài kiểm tra' : 'Đã tạo bài kiểm tra');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (data: ExamFormData) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Chỉnh sửa bài kiểm tra' : 'Thêm bài kiểm tra mới'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input placeholder="Tên bài kiểm tra" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mô tả bài kiểm tra" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
