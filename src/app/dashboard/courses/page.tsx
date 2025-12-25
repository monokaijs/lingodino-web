"use client";

import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {IconPlus, IconEdit, IconTrash} from "@tabler/icons-react";
import Link from "next/link";
import {useState} from "react";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {toast} from "sonner";
import {Course} from "@/lib/types/models/course";

interface ApiResponse<T> {
  data: T;
  pagination?: any;
  code: number;
  message: string;
}

async function fetchCourses(): Promise<Course[]> {
  const res = await fetch("/api/courses");
  const json: ApiResponse<Course[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteCourse(id: string): Promise<void> {
  const res = await fetch(`/api/courses/${id}`, {method: "DELETE"});
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {data: courses, isLoading} = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["courses"]});
      toast.success("Course deleted successfully");
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Courses</CardTitle>
          <Button asChild>
            <Link href="/dashboard/courses/new">
              <IconPlus className="mr-2 h-4 w-4" />
              Add Course
            </Link>
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
                {courses?.map((course) => (
                  <TableRow key={course._id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/courses/${course._id}`} className="hover:underline">
                        {course.name}
                      </Link>
                    </TableCell>
                    <TableCell>{course.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/dashboard/courses/${course._id}/edit`}>
                            <IconEdit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(course._id)}>
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {courses?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      No courses found
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
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this course? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

