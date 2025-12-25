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
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {Course} from "@/lib/types/models/course";
import {Lesson} from "@/lib/types/models/lesson";
import {LessonDialog} from "./lesson-dialog";

interface ApiResponse<T> {
  data: T;
  code: number;
  message: string;
}

async function fetchCourse(id: string): Promise<Course> {
  const res = await fetch(`/api/courses/${id}`);
  const json: ApiResponse<Course> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchLessons(courseId: string): Promise<Lesson[]> {
  const res = await fetch(`/api/lessons?courseId=${courseId}`);
  const json: ApiResponse<Lesson[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteLesson(id: string): Promise<void> {
  const res = await fetch(`/api/lessons/${id}`, {method: "DELETE"});
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const {data: course} = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourse(courseId),
  });

  const {data: lessons, isLoading} = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: () => fetchLessons(courseId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["lessons", courseId]});
      toast.success("Lesson deleted");
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLesson(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingLesson(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/courses"><IconArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{course?.name}</h1>
          <p className="text-muted-foreground">{course?.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lessons</CardTitle>
            <CardDescription>Manage lessons for this course</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />Add Lesson
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons?.map((lesson) => (
                  <TableRow key={lesson._id}>
                    <TableCell>{lesson.order}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/lessons/${lesson._id}`} className="hover:underline">
                        {lesson.name}
                      </Link>
                    </TableCell>
                    <TableCell>{lesson.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(lesson)}>
                          <IconEdit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(lesson._id)}>
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {lessons?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">No lessons found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LessonDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        courseId={courseId}
        lesson={editingLesson}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
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

