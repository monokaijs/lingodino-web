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
import {Exam, ExamQuestion} from "@/lib/types/models/exam";
import {Badge} from "@/components/ui/badge";
import {QuestionDialog} from "./question-dialog";

interface ApiResponse<T> {
  data: T;
  code: number;
  message: string;
}

async function fetchExam(id: string): Promise<Exam> {
  const res = await fetch(`/api/exams/${id}`);
  const json: ApiResponse<Exam> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchQuestions(examId: string): Promise<ExamQuestion[]> {
  const res = await fetch(`/api/questions?examId=${examId}`);
  const json: ApiResponse<ExamQuestion[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteQuestion(id: string): Promise<void> {
  const res = await fetch(`/api/questions/${id}`, {method: "DELETE"});
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

export default function ExamDetailPage() {
  const params = useParams();
  const examId = params.id as string;
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);

  const {data: exam} = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => fetchExam(examId),
  });

  const {data: questions, isLoading} = useQuery({
    queryKey: ["questions", examId],
    queryFn: () => fetchQuestions(examId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["questions", examId]});
      toast.success("Question deleted");
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleEdit = (question: ExamQuestion) => {
    setEditingQuestion(question);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingQuestion(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={exam?.lessonId ? `/dashboard/lessons/${exam.lessonId}` : "/dashboard/exams"}>
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{exam?.name}</h1>
          <p className="text-muted-foreground">{exam?.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Questions</CardTitle>
            <CardDescription>Manage questions for this exam</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />Add Question
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions?.map((q) => (
                  <TableRow key={q._id}>
                    <TableCell><Badge variant="secondary">{q.type}</Badge></TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">{q.question}</TableCell>
                    <TableCell>{q.options?.length || 0} options</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(q)}>
                          <IconEdit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(q._id)}>
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {questions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">No questions found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuestionDialog open={dialogOpen} onOpenChange={handleDialogClose} examId={examId} question={editingQuestion} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
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

