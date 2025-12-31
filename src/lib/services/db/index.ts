import { BaseRepository } from '@/lib/services/db/repository'
import dbConnect from '@/lib/services/db/client'
import { Schemas } from '@/lib/services/db/schemas'
import { User } from '@/lib/types/models/user'
import { UserSchema } from '@/lib/services/db/schemas/user'
import { SystemPreference } from '@/lib/types/models/system-preference'
import { SystemPreferenceSchema } from '@/lib/services/db/schemas/systemPreference'
import { Course } from '@/lib/types/models/course'
import { CourseSchema } from '@/lib/services/db/schemas/course'
import { Lesson } from '@/lib/types/models/lesson'
import { LessonSchema } from '@/lib/services/db/schemas/lesson'
import { Exam, ExamQuestion } from '@/lib/types/models/exam'
import { ExamSchema, ExamQuestionSchema } from '@/lib/services/db/schemas/exam'
import { VocabularyCollection, VocabularyItem } from '@/lib/types/models/vocabulary-collection'
import { VocabularyCollectionSchema, VocabularyItemSchema } from '@/lib/services/db/schemas/vocabulary-collection'
import { GrammarCollection, GrammarItem } from '@/lib/types/models/grammar'
import { GrammarCollectionSchema, GrammarItemSchema } from '@/lib/services/db/schemas/grammar'
import { Conversation } from '@/lib/types/models/conversation'
import { ConversationSchema } from '@/lib/services/db/schemas/conversation'

class DBService {
  user: BaseRepository<User>
  systemPreference: BaseRepository<SystemPreference>
  course: BaseRepository<Course>
  lesson: BaseRepository<Lesson>
  exam: BaseRepository<Exam>
  examQuestion: BaseRepository<ExamQuestion>
  vocabularyCollection: BaseRepository<VocabularyCollection>
  vocabularyItem: BaseRepository<VocabularyItem>
  grammarCollection: BaseRepository<GrammarCollection>
  grammarItem: BaseRepository<GrammarItem>
  conversation: BaseRepository<Conversation>

  constructor() {
    this.user = new BaseRepository<User>(Schemas.User, UserSchema)
    this.systemPreference = new BaseRepository<SystemPreference>(Schemas.SystemPreference, SystemPreferenceSchema)
    this.course = new BaseRepository<Course>(Schemas.Course, CourseSchema)
    this.lesson = new BaseRepository<Lesson>(Schemas.Lesson, LessonSchema)
    this.exam = new BaseRepository<Exam>(Schemas.Exam, ExamSchema)
    this.examQuestion = new BaseRepository<ExamQuestion>(Schemas.ExamQuestion, ExamQuestionSchema)
    this.vocabularyCollection = new BaseRepository<VocabularyCollection>(
      Schemas.VocabularyCollection,
      VocabularyCollectionSchema,
    )
    this.vocabularyItem = new BaseRepository<VocabularyItem>(Schemas.VocabularyItem, VocabularyItemSchema)
    this.grammarCollection = new BaseRepository<GrammarCollection>(Schemas.GrammarCollection, GrammarCollectionSchema)
    this.grammarItem = new BaseRepository<GrammarItem>(Schemas.GrammarItem, GrammarItemSchema)
    this.conversation = new BaseRepository<Conversation>(Schemas.Conversation, ConversationSchema)
  }

  connect() {
    return dbConnect()
  }
}

export const dbService = new DBService()
