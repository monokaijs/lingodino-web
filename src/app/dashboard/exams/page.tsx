'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Exam } from '@/lib/types/models/exam';
import { Lesson } from '@/lib/types/models/lesson';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ApiResponse<T> {
  data: T;
  pagination?: any;
  code: number;
  message: string;
}

async function fetchExams(lessonId?: string): Promise<Exam[]> {
  const url = lessonId ? `/api/exams?lessonId=${lessonId}` : '/api/exams';
  const res = await fetch(url);
  const json: ApiResponse<Exam[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchLessons(): Promise<Lesson[]> {
  const res = await fetch('/api/lessons');
  const json: ApiResponse<Lesson[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteExam(id: string): Promise<void> {
  const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

export default function ExamsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lessonFilter, setLessonFilter] = useState<string>('');

  const { data: lessons } = useQuery({
    queryKey: ['lessons'],
    queryFn: fetchLessons,
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams', lessonFilter],
    queryFn: () => fetchExams(lessonFilter || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Xóa bài kiểm tra thành công');
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getLessonNameById = (lessonId: string) => {
    return lessons?.find(l => l._id === lessonId)?.name || 'Không rõ';
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bài kiểm tra</CardTitle>
          <div className="flex gap-2">
            <Select value={lessonFilter || 'all'} onValueChange={v => setLessonFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Lọc theo bài học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả bài học</SelectItem>
                {lessons?.map(lesson => (
                  <SelectItem key={lesson._id} value={lesson._id}>
                    {lesson.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/dashboard/exams/new">
                <IconPlus className="mr-2 h-4 w-4" />
                Thêm bài kiểm tra
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Bài học</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="w-[100px]">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams?.map(exam => (
                  <TableRow key={exam._id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/exams/${exam._id}`} className="hover:underline">
                        {exam.name}
                      </Link>
                    </TableCell>
                    <TableCell>{getLessonNameById(exam.lessonId)}</TableCell>
                    <TableCell>{exam.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/dashboard/exams/${exam._id}/edit`}>
                            <IconEdit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(exam._id)}>
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {exams?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Không tìm thấy bài kiểm tra nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bài kiểm tra</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bài kiểm tra này không? Tất cả câu hỏi trong bài kiểm tra này cũng sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
