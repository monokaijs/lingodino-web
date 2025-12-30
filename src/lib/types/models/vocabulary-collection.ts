export interface VocabularyCollection {
    _id: string;
    name: string;
    description: string;
    photo?: string;
    itemCount: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// Completely flat structure - no nested objects
export interface VocabularyItem {
    _id: string;
    collectionId: string;

    // Character data
    simplified: string;
    traditional: string;
    pinyin: string;
    pinyinNumeric: string;
    bopomofo: string;

    // Meanings and usage (simple arrays only)
    meanings: string[];
    pos: string[];
    classifiers: string[];

    // Metadata
    radical: string;
    frequency: number;
    order: number;

    createdAt?: Date;
    updatedAt?: Date;
}

