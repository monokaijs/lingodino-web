import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import {Lesson} from '@/lib/types/models/lesson';

export const LessonSchema = new mongoose.Schema<Lesson>(
  {
    name: {type: String, required: true},
    description: String,
    courseId: {type: String, required: true},
    order: {type: Number, default: 0},
    conversationId: String,
    vocabularyIds: [String],
    grammarIds: [String],
  },
  {timestamps: true}
);

LessonSchema.index({courseId: 1, order: 1});
LessonSchema.index({createdAt: -1});

LessonSchema.plugin(mongoosePaginate);
