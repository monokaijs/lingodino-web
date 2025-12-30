export interface GrammarCollection {
  _id: string;
  name: string;
  description: string;
  photo?: string;
  itemCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GrammarExample {
  structure: string;
  translation: string;
  explanation: string;
}

export interface GrammarItem {
  _id: string;
  collectionId: string;
  code: string;
  name: string;
  grammar: string;
  examples: GrammarExample[];
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

