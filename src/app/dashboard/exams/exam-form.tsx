'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Exam } from '@/lib/types/models/exam';
import { Lesson } from '@/lib/types/models/lesson';

const examSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc'),
  description: z.string().optional(),
  lessonId: z.string().min(1, 'Bài học là bắt buộc'),
});

type ExamFormData = z.infer<typeof examSchema>;

interface ExamFormProps {
  exam?: Exam;
}

async function fetchLessons(): Promise<Lesson[]> {
  const res = await fetch('/api/lessons');
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function createExam(data: ExamFormData): Promise<Exam> {
  const res = await fetch('/api/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
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

export function ExamForm({ exam }: ExamFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!exam;

  const { data: lessons } = useQuery({
    queryKey: ['lessons'],
    queryFn: fetchLessons,
  });

  const form = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      name: exam?.name || '',
      description: exam?.description || '',
      lessonId: exam?.lessonId || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ExamFormData) => (isEditing ? updateExam(exam._id, data) : createExam(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success(isEditing ? 'Cập nhật bài kiểm tra thành công' : 'Tạo bài kiểm tra thành công');
      router.push('/dashboard/exams');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: ExamFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Chỉnh sửa bài kiểm tra' : 'Thêm bài kiểm tra mới'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="lessonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bài học</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn một bài học" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lessons?.map(lesson => (
                          <SelectItem key={lesson._id} value={lesson._id}>
                            {lesson.name}
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
              <div className="flex gap-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Hủy
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
