'use client';

import { useQuery } from '@tanstack/react-query';
import { CourseForm } from '../../course-form';
import { Course } from '@/lib/types/models/course';
import { use } from 'react';

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

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: course, isLoading } = useQuery({
    queryKey: ['courses', id],
    queryFn: () => fetchCourse(id),
  });

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center">Đang tải...</div>;
  }

  if (!course) {
    return <div className="flex flex-1 items-center justify-center">Không tìm thấy khóa học</div>;
  }

  return <CourseForm course={course} />;
}
