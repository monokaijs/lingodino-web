import { BaseRepository } from "@/lib/services/db/repository";
import dbConnect from "@/lib/services/db/client";
import { Schemas } from "@/lib/services/db/schemas";
import { User } from "@/lib/types/models/user";
import { UserSchema } from "@/lib/services/db/schemas/user";
import { SystemPreference } from "@/lib/types/models/system-preference";
import { SystemPreferenceSchema } from "@/lib/services/db/schemas/systemPreference";
import { Course } from "@/lib/types/models/course";
import { CourseSchema } from "@/lib/services/db/schemas/course";
import { Lesson } from "@/lib/types/models/lesson";
import { LessonSchema } from "@/lib/services/db/schemas/lesson";
import { Exam, ExamQuestion } from "@/lib/types/models/exam";
import { ExamSchema, ExamQuestionSchema } from "@/lib/services/db/schemas/exam";
import { VocabularyCollection, VocabularyItem } from "@/lib/types/models/vocabulary-collection";
import { VocabularyCollectionSchema, VocabularyItemSchema } from "@/lib/services/db/schemas/vocabulary-collection";


class DBService {
  user: BaseRepository<User>;
  systemPreference: BaseRepository<SystemPreference>;
  course: BaseRepository<Course>;
  lesson: BaseRepository<Lesson>;
  exam: BaseRepository<Exam>;
  examQuestion: BaseRepository<ExamQuestion>;
  vocabularyCollection: BaseRepository<VocabularyCollection>;
  vocabularyItem: BaseRepository<VocabularyItem>;

  constructor() {
    this.user = new BaseRepository<User>(Schemas.User, UserSchema);
    this.systemPreference = new BaseRepository<SystemPreference>(Schemas.SystemPreference, SystemPreferenceSchema);
    this.course = new BaseRepository<Course>(Schemas.Course, CourseSchema);
    this.lesson = new BaseRepository<Lesson>(Schemas.Lesson, LessonSchema);
    this.exam = new BaseRepository<Exam>(Schemas.Exam, ExamSchema);
    this.examQuestion = new BaseRepository<ExamQuestion>(Schemas.ExamQuestion, ExamQuestionSchema);
    this.vocabularyCollection = new BaseRepository<VocabularyCollection>(Schemas.VocabularyCollection, VocabularyCollectionSchema);
    this.vocabularyItem = new BaseRepository<VocabularyItem>(Schemas.VocabularyItem, VocabularyItemSchema);
  }

  connect() {
    return dbConnect();
  }
}

export const dbService = new DBService();

