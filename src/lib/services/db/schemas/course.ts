import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import {Course} from '@/lib/types/models/course';

export const CourseSchema = new mongoose.Schema<Course>(
  {
    name: {type: String, required: true},
    description: String,
  },
  {timestamps: true}
);

CourseSchema.index({name: 1});
CourseSchema.index({createdAt: -1});

CourseSchema.plugin(mongoosePaginate);
