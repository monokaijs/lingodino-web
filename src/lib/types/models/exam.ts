import {Attachment} from '@/lib/types/models/attachment';

export interface Exam {
  _id: string;
  name: string;
  description: string;
  lessonId: string;
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
}

export const ExamQuestionTypeManualAnswer = [
  ExamQuestionType.ShortAnswer,
  ExamQuestionType.LongAnswer,
  ExamQuestionType.ListenAndWrite,
];

export interface ExamQuestionOption {
  text: string;
  file?: Attachment;
  isCorrect?: boolean;
}

export interface ExamQuestion {
  _id: string;
  examId: string;
  type: ExamQuestionType;
  file?: Attachment;
  question: string;
  options?: ExamQuestionOption[];
  answer: string;
  createdAt?: Date;
  updatedAt?: Date;
}
