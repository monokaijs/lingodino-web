import mongoose from 'mongoose';
import {SystemPreference} from "@/lib/types/models/system-preference";

export const SystemPreferenceSchema = new mongoose.Schema<SystemPreference>({
  systemName: {
    type: String,
    required: true,
  },
  allowRegistration: {
    type: Boolean,
    required: true,
    default: false,
  },
}, {
  timestamps: true,
});

