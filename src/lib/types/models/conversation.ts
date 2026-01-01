// Conversation audio generator types

export enum ParticipantRole {
  Speaker1 = 'speaker1',
  Speaker2 = 'speaker2',
}

export interface ConversationParticipant {
  role: ParticipantRole
  name: string
  voiceId: string
  voiceName?: string
}

export interface DialogueSentence {
  id: string
  participantRole: ParticipantRole
  text: string
  tone?: string // e.g., "cheerfully", "sadly", "angrily"
  emotion?: string // e.g., "happy", "sad", "excited"
  order: number
}

export enum ConversationStatus {
  Draft = 'draft',
  Generating = 'generating',
  Completed = 'completed',
  Failed = 'failed',
}

export interface Conversation {
  _id: string
  name: string
  description?: string
  participants: ConversationParticipant[]
  sentences: DialogueSentence[]
  status: ConversationStatus
  audioUrl?: string // R2 key for generated audio
  audioFileName?: string // Original filename
  videoUrl?: string // R2 key for generated video
  subtitleUrl?: string // R2 key for generated subtitles
  duration?: number // Audio duration in seconds
  alignment?: DialogueAlignment // Word/character timing for subtitles
  errorMessage?: string // Error message if generation failed
  createdBy: string // User ID
  createdAt?: Date
  updatedAt?: Date
}

// Word timing for subtitles
export interface WordTiming {
  word: string
  start: number // Start time in seconds
  end: number // End time in seconds
}

// Character-level alignment from ElevenLabs
export interface CharacterAlignment {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

// Segment timing for each dialogue line
export interface DialogueSegment {
  sentenceId: string // Maps to DialogueSentence.id
  text: string
  participantRole: ParticipantRole
  startTime: number
  endTime: number
  words: WordTiming[]
}

// Full alignment data for the conversation
export interface DialogueAlignment {
  segments: DialogueSegment[]
  totalDuration: number
}

// ElevenLabs Voice type
export interface ElevenLabsVoice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
  preview_url?: string
}
