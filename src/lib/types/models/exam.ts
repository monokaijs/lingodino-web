import {Attachment} from '@/lib/types/models/attachment';

export interface Exam {
  _id: string;
  name: string;
  description: string;
  courseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum ExamQuestionType {
  MultipleChoice = 'multiple_choice',
  TrueFalse = 'true_false',
  ShortAnswer = 'short_answer',
  LongAnswer = 'long_answer',
  ListenAndRepeat = 'listen_and_repeat',
  ListenAndAnswer = 'listen_and_answer',
  ListenAndWrite = 'listen_and_write',
  ListenAndChoose = 'listen_and_choose',
  ListenAndOrder = 'listen_and_order',
}

export interface ExamQuestion {
  _id: string;
  examId: string;
  type: ExamQuestionType;
  file?: Attachment[];
  question: string;
  options?: string[];
  answer: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ExamQuestionResponse = ExamQuestion & {
  options: ExamQuestionOption[];
  answer: string;
}

export interface ExamQuestionOption {
  _id: string;
  examQuestionId: string;
  file?: string;
  option: string;
  isCorrect: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
