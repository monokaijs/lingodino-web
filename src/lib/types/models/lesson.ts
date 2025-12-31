export interface Lesson {
  _id: string
  name: string
  description: string
  courseId: string
  order: number
  createdAt?: Date
  updatedAt?: Date
}

export interface LessonVocab {
  _id: string
  lessonId: string
  word: string
  translation: string
  createdAt?: Date
  updatedAt?: Date
}

export interface LessonGrammar {
  _id: string
  lessonId: string
  rule: string
  explanation: string
  example: string
  createdAt?: Date
  updatedAt?: Date
}

export interface LessonGrammarExample {
  _id: string
  lessonGrammarId: string
  example: string
  translation: string
  explanation: string
  createdAt?: Date
  updatedAt?: Date
}
