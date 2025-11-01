import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import {User, UserRole} from "@/lib/types/models/user";

export const UserSchema = new mongoose.Schema<User>({
  fullName: String,
  username: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    select: false,
    required: false,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.Reader,
  },
  photo: String,
});

UserSchema.index({role: 1});
UserSchema.index({createdAt: -1});

UserSchema.plugin(mongoosePaginate);
