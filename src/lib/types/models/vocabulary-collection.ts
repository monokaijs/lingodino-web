export interface VocabularyCollection {
  _id: string
  name: string
  description: string
  photo?: string
  itemCount: number
  createdAt?: Date
  updatedAt?: Date
}

// Example structure for vocabulary items
export interface VocabularyExample {
  text: string // The example sentence/phrase
  meaning: string // Translation/meaning of the example
  explanation: string // Explanation of usage context
}

// Vocabulary item structure
export interface VocabularyItem {
  _id: string
  collectionId: string

  // Character data
  simplified: string
  traditional: string
  pinyin: string
  pinyinNumeric: string
  bopomofo: string

  // Meanings and usage
  meanings: string[]
  pos: string[]
  classifiers: string[]
  examples: VocabularyExample[]

  // Metadata
  radical: string
  frequency: number
  order: number

  createdAt?: Date
  updatedAt?: Date
}
