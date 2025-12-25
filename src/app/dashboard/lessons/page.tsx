"use client";

import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {IconTrash} from "@tabler/icons-react";
import Link from "next/link";
import {useState} from "react";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {toast} from "sonner";
import {Lesson} from "@/lib/types/models/lesson";
import {Course} from "@/lib/types/models/course";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

interface ApiResponse<T> {
  data: T;
  pagination?: any;
  code: number;
  message: string;
}

async function fetchLessons(courseId?: string): Promise<Lesson[]> {
  const url = courseId ? `/api/lessons?courseId=${courseId}` : "/api/lessons";
  const res = await fetch(url);
  const json: ApiResponse<Lesson[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchCourses(): Promise<Course[]> {
  const res = await fetch("/api/courses");
  const json: ApiResponse<Course[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteLesson(id: string): Promise<void> {
  const res = await fetch(`/api/lessons/${id}`, {method: "DELETE"});
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

export default function LessonsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>("");

  const {data: courses} = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });

  const {data: lessons, isLoading} = useQuery({
    queryKey: ["lessons", courseFilter],
    queryFn: () => fetchLessons(courseFilter || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["lessons"]});
      toast.success("Lesson deleted successfully");
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getCourseNameById = (courseId: string) => {
    return courses?.find((c) => c._id === courseId)?.name || "Unknown";
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lessons</CardTitle>
          <div className="flex gap-2">
            <Select value={courseFilter || "all"} onValueChange={(v) => setCourseFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses?.map((course) => (
                  <SelectItem key={course._id} value={course._id}>{course.name}</SelectItem>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons?.map((lesson) => (
                  <TableRow key={lesson._id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/lessons/${lesson._id}`} className="hover:underline">
                        {lesson.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/courses/${lesson.courseId}`} className="hover:underline">
                        {getCourseNameById(lesson.courseId)}
                      </Link>
                    </TableCell>
                    <TableCell>{lesson.order}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
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

