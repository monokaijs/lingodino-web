import mongoose from 'mongoose'
import mongoosePaginate from 'mongoose-paginate-v2'
import { VocabularyCollection, VocabularyItem } from '@/lib/types/models/vocabulary-collection'

export const VocabularyCollectionSchema = new mongoose.Schema<VocabularyCollection>(
  {
    name: { type: String, required: true },
    description: String,
    photo: String,
    itemCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

VocabularyCollectionSchema.index({ name: 1 })
VocabularyCollectionSchema.index({ createdAt: -1 })
VocabularyCollectionSchema.plugin(mongoosePaginate)

// Completely flat schema - no nested subdocuments
export const VocabularyItemSchema = new mongoose.Schema<VocabularyItem>(
  {
    collectionId: { type: String, required: true, index: true },

    // Character data
    simplified: { type: String, required: true },
    traditional: { type: String, default: '' },
    pinyin: { type: String, default: '' },
    pinyinNumeric: { type: String, default: '' },
    bopomofo: { type: String, default: '' },

    // Meanings and usage
    meanings: [{ type: String }],
    pos: [{ type: String }],
    classifiers: [{ type: String }],
    examples: [
      {
        text: { type: String, default: '' },
        meaning: { type: String, default: '' },
        explanation: { type: String, default: '' },
      },
    ],

    // Metadata
    radical: { type: String, default: '' },
    frequency: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// Optimized indexes
VocabularyItemSchema.index({ collectionId: 1, order: 1 })
VocabularyItemSchema.index({ collectionId: 1, simplified: 1 })
VocabularyItemSchema.index({ collectionId: 1, pinyin: 1 })
VocabularyItemSchema.index({ collectionId: 1, frequency: -1 })
VocabularyItemSchema.index({ simplified: 'text', pinyin: 'text', traditional: 'text' })
VocabularyItemSchema.plugin(mongoosePaginate)
