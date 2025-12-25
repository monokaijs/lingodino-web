"use client";

import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {Course} from "@/lib/types/models/course";

const courseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormProps {
  course?: Course;
}

async function createCourse(data: CourseFormData): Promise<Course> {
  const res = await fetch("/api/courses", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function updateCourse(id: string, data: CourseFormData): Promise<Course> {
  const res = await fetch(`/api/courses/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

export function CourseForm({course}: CourseFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!course;

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: course?.name || "",
      description: course?.description || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CourseFormData) =>
      isEditing ? updateCourse(course._id, data) : createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["courses"]});
      toast.success(isEditing ? "Course updated successfully" : "Course created successfully");
      router.push("/dashboard/courses");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: CourseFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Course" : "New Course"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Course name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Course description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

