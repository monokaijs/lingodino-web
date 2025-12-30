import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { GrammarCollection, GrammarItem } from "@/lib/types/models/grammar";

export const GrammarCollectionSchema = new mongoose.Schema<GrammarCollection>({
  name: { type: String, required: true },
  description: String,
  photo: String,
  itemCount: { type: Number, default: 0 },
}, { timestamps: true });

GrammarCollectionSchema.index({ name: 1 });
GrammarCollectionSchema.index({ createdAt: -1 });
GrammarCollectionSchema.plugin(mongoosePaginate);

const GrammarExampleSchema = new mongoose.Schema({
  structure: { type: String, required: true },
  translation: { type: String, default: '' },
  explanation: { type: String, default: '' },
}, { _id: false });

export const GrammarItemSchema = new mongoose.Schema<GrammarItem>({
  collectionId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  grammar: { type: String, default: '' },
  examples: [GrammarExampleSchema],
  order: { type: Number, default: 0 },
}, { timestamps: true });

GrammarItemSchema.index({ collectionId: 1, order: 1 });
GrammarItemSchema.index({ collectionId: 1, code: 1 });
GrammarItemSchema.index({ code: 1 });
GrammarItemSchema.plugin(mongoosePaginate);
