import mongoose from 'mongoose'
import mongoosePaginate from 'mongoose-paginate-v2'
import { User, UserRole } from '@/lib/types/models/user'

export const UserSchema = new mongoose.Schema<User>({
  fullName: String,
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.User,
  },
  photo: String,
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  appleId: {
    type: String,
    unique: true,
    sparse: true,
  },
})

UserSchema.index({ role: 1 })
UserSchema.index({ createdAt: -1 })

UserSchema.plugin(mongoosePaginate)
