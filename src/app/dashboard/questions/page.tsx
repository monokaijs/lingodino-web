"use client";

import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {IconTrash} from "@tabler/icons-react";
import Link from "next/link";
import {useState} from "react";
import {useSearchParams} from "next/navigation";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {toast} from "sonner";
import {ExamQuestion} from "@/lib/types/models/exam";
import {Exam} from "@/lib/types/models/exam";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Badge} from "@/components/ui/badge";

interface ApiResponse<T> {
  data: T;
  pagination?: any;
  code: number;
  message: string;
}

async function fetchQuestions(examId?: string): Promise<ExamQuestion[]> {
  const url = examId ? `/api/questions?examId=${examId}` : "/api/questions";
  const res = await fetch(url);
  const json: ApiResponse<ExamQuestion[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchExams(): Promise<Exam[]> {
  const res = await fetch("/api/exams");
  const json: ApiResponse<Exam[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteQuestion(id: string): Promise<void> {
  const res = await fetch(`/api/questions/${id}`, {method: "DELETE"});
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

export default function QuestionsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [examFilter, setExamFilter] = useState<string>(searchParams.get("examId") || "");

  const {data: exams} = useQuery({
    queryKey: ["exams"],
    queryFn: fetchExams,
  });

  const {data: questions, isLoading} = useQuery({
    queryKey: ["questions", examFilter],
    queryFn: () => fetchQuestions(examFilter || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["questions"]});
      toast.success("Question deleted successfully");
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getExamName = (examId: string) => exams?.find((e) => e._id === examId)?.name || "Unknown";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Questions</CardTitle>
          <div className="flex gap-2">
            <Select value={examFilter || "all"} onValueChange={(v) => setExamFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams?.map((exam) => (
                  <SelectItem key={exam._id} value={exam._id}>{exam.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions?.map((question) => (
                  <TableRow key={question._id}>
                    <TableCell className="font-medium max-w-[300px] truncate">{question.question}</TableCell>
                    <TableCell><Badge variant="secondary">{question.type}</Badge></TableCell>
                    <TableCell>
                      <Link href={`/dashboard/exams/${question.examId}`} className="hover:underline">
                        {getExamName(question.examId)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(question._id)}>
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
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

