import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import {Exam, ExamQuestion, ExamQuestionType} from '@/lib/types/models/exam';

const AttachmentSubSchema = {
  _id: String,
  name: String,
  type: String,
  url: String,
};

export const ExamSchema = new mongoose.Schema<Exam>(
  {
    name: {type: String, required: true},
    description: String,
    lessonId: {type: String, required: true},
  },
  {timestamps: true}
);

ExamSchema.index({lessonId: 1});
ExamSchema.index({createdAt: -1});
ExamSchema.plugin(mongoosePaginate);

const OptionSubSchema = {
  text: {type: String, required: true},
  file: AttachmentSubSchema,
  isCorrect: Boolean,
};

export const ExamQuestionSchema = new mongoose.Schema<ExamQuestion>(
  {
    examId: {type: String, required: true},
    type: {type: String, enum: Object.values(ExamQuestionType), required: true},
    question: {type: String, required: true},
    options: [OptionSubSchema],
    answer: {type: String},
    file: AttachmentSubSchema,
  },
  {timestamps: true}
);

ExamQuestionSchema.index({examId: 1});
ExamQuestionSchema.index({createdAt: -1});
ExamQuestionSchema.plugin(mongoosePaginate);
