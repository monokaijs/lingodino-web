export * from './user';
export * from './systemPreference';
export * from './course';
export * from './lesson';
export * from './exam';
export * from './vocabulary-collection';

export enum Schemas {
  User = 'User',
  SystemPreference = 'SystemPreference',
  Course = 'Course',
  Lesson = 'Lesson',
  Exam = 'Exam',
  ExamQuestion = 'ExamQuestion',
  VocabularyCollection = 'VocabularyCollection',
  VocabularyItem = 'VocabularyItem',
}
