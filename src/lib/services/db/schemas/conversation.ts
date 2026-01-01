import mongoose from 'mongoose'
import mongoosePaginate from 'mongoose-paginate-v2'
import { Conversation, ConversationStatus, ParticipantRole } from '@/lib/types/models/conversation'

const ParticipantSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: Object.values(ParticipantRole),
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    voiceId: {
      type: String,
      default: '',
    },
    voiceName: {
      type: String,
    },
  },
  {
    _id: false,
  },
)

const SentenceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    participantRole: {
      type: String,
      enum: Object.values(ParticipantRole),
      required: true,
    },
    text: { type: String, required: true },
    tone: { type: String, default: '' },
    emotion: { type: String, default: '' },
    order: { type: Number, required: true },
  },
  { _id: false },
)

const WordTimingSchema = new mongoose.Schema(
  {
    word: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  { _id: false },
)

const DialogueSegmentSchema = new mongoose.Schema(
  {
    sentenceId: { type: String, required: true },
    text: { type: String, required: true },
    participantRole: {
      type: String,
      enum: Object.values(ParticipantRole),
      required: true,
    },
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
    words: { type: [WordTimingSchema], default: [] },
  },
  { _id: false },
)

const DialogueAlignmentSchema = new mongoose.Schema(
  {
    segments: { type: [DialogueSegmentSchema], default: [] },
    totalDuration: { type: Number, default: 0 },
  },
  { _id: false },
)

export const ConversationSchema = new mongoose.Schema<Conversation>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    participants: {
      type: [ParticipantSchema],
      default: [
        { role: ParticipantRole.Speaker1, name: 'Speaker 1', voiceId: '' },
        { role: ParticipantRole.Speaker2, name: 'Speaker 2', voiceId: '' },
      ],
    },
    sentences: { type: [SentenceSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(ConversationStatus),
      default: ConversationStatus.Draft,
    },
    audioUrl: { type: String, default: '' },
    audioFileName: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    subtitleUrl: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    alignment: { type: DialogueAlignmentSchema, default: null },
    errorMessage: { type: String, default: '' },
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true },
)

ConversationSchema.index({ createdBy: 1, createdAt: -1 })
ConversationSchema.index({ status: 1 })
ConversationSchema.plugin(mongoosePaginate)
