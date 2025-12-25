"use client";

import {useQuery} from "@tanstack/react-query";
import {ExamForm} from "../../exam-form";
import {Exam} from "@/lib/types/models/exam";
import {use} from "react";

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

export default function EditExamPage({params}: {params: Promise<{id: string}>}) {
  const {id} = use(params);

  const {data: exam, isLoading} = useQuery({
    queryKey: ["exams", id],
    queryFn: () => fetchExam(id),
  });

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center">Loading...</div>;
  }

  if (!exam) {
    return <div className="flex flex-1 items-center justify-center">Exam not found</div>;
  }

  return <ExamForm exam={exam} />;
}

