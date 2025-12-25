"use client";

import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {IconPlus, IconEdit, IconTrash, IconArrowLeft} from "@tabler/icons-react";
import Link from "next/link";
import {useState} from "react";
import {useParams} from "next/navigation";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {toast} from "sonner";
import {Lesson} from "@/lib/types/models/lesson";
import {Exam} from "@/lib/types/models/exam";
import {ExamDialog} from "./exam-dialog";

interface ApiResponse<T> {
  data: T;
  code: number;
  message: string;
}

async function fetchLesson(id: string): Promise<Lesson> {
  const res = await fetch(`/api/lessons/${id}`);
  const json: ApiResponse<Lesson> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchExams(lessonId: string): Promise<Exam[]> {
  const res = await fetch(`/api/exams?lessonId=${lessonId}`);
  const json: ApiResponse<Exam[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteExam(id: string): Promise<void> {
  const res = await fetch(`/api/exams/${id}`, {method: "DELETE"});
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const {data: lesson} = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => fetchLesson(lessonId),
  });

  const {data: exams, isLoading} = useQuery({
    queryKey: ["exams", lessonId],
    queryFn: () => fetchExams(lessonId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["exams", lessonId]});
      toast.success("Exam deleted");
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingExam(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingExam(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={lesson?.courseId ? `/dashboard/courses/${lesson.courseId}` : "/dashboard/lessons"}>
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{lesson?.name}</h1>
          <p className="text-muted-foreground">{lesson?.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Exams</CardTitle>
            <CardDescription>Manage exams for this lesson</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />Add Exam
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams?.map((exam) => (
                  <TableRow key={exam._id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/exams/${exam._id}`} className="hover:underline">
                        {exam.name}
                      </Link>
                    </TableCell>
                    <TableCell>{exam.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(exam)}>
                          <IconEdit className="h-4 w-4" />
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
                    <TableCell colSpan={3} className="text-center py-8">No exams found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ExamDialog open={dialogOpen} onOpenChange={handleDialogClose} lessonId={lessonId} exam={editingExam} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will also delete all questions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

