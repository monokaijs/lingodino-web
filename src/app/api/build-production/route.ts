import { NextRequest } from 'next/server';
import { withApi } from '@/lib/utils/withApi';
import { dbService } from '@/lib/services/db';
import { uploadBuffer } from '@/lib/services/r2';
import { UserRole } from '@/lib/types/models/user';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// R2 Keys
const COURSES_JSON_KEY = 'production/courses.json';
const VOCAB_SQLITE_KEY = 'production/vocabulary.sqlite';
const GRAMMAR_SQLITE_KEY = 'production/grammar.sqlite';

interface BuildResult {
    courses: {
        key: string;
        url: string | null;
        size: number;
        count: number;
        lessonsCount: number;
    };
    vocabulary: {
        key: string;
        url: string | null;
        size: number;
        collectionsCount: number;
        itemsCount: number;
    };
    grammar: {
        key: string;
        url: string | null;
        size: number;
        collectionsCount: number;
        itemsCount: number;
    };
    version: string;
    buildTime: string;
}

// Helper to convert undefined to null for SQLite
function toSqlite(value: any): string | number | null | Buffer {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' || Buffer.isBuffer(value)) {
        return value as string | number | Buffer;
    }
    return JSON.stringify(value);
}

function toSqliteStr(value: any): string | null {
    if (value === undefined || value === null) return null;
    return String(value);
}

function toSqliteNum(value: any): number {
    if (value === undefined || value === null) return 0;
    return Number(value) || 0;
}

async function postHandler(request: NextRequest): Promise<BuildResult> {
    await dbService.connect();

    const version = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const buildTime = new Date().toISOString();

    // ===== FETCH ALL DATA =====
    const [
        coursesResult,
        lessonsResult,
        vocabCollectionsResult,
        vocabItemsResult,
        grammarCollectionsResult,
        grammarItemsResult,
        conversationsResult,
    ] = await Promise.all([
        dbService.course.paginate({}, { page: 1, limit: 1000 }),
        dbService.lesson.paginate({}, { page: 1, limit: 10000 }),
        dbService.vocabularyCollection.paginate({}, { page: 1, limit: 1000 }),
        dbService.vocabularyItem.paginate({}, { page: 1, limit: 100000 }),
        dbService.grammarCollection.paginate({}, { page: 1, limit: 1000 }),
        dbService.grammarItem.paginate({}, { page: 1, limit: 100000 }),
        dbService.conversation.paginate({}, { page: 1, limit: 10000 }),
    ]);

    const courses = coursesResult.docs;
    const lessons = lessonsResult.docs;
    const vocabCollections = vocabCollectionsResult.docs;
    const vocabItems = vocabItemsResult.docs;
    const grammarCollections = grammarCollectionsResult.docs;
    const grammarItems = grammarItemsResult.docs;
    const conversations = conversationsResult.docs;

    // Create lookup maps - convert ObjectIds to strings for proper comparison
    const vocabItemsMap = new Map(vocabItems.map(item => [String(item._id), item]));
    const grammarItemsMap = new Map(grammarItems.map(item => [String(item._id), item]));
    const conversationsMap = new Map(conversations.map(conv => [String(conv._id), conv]));

    // ===== BUILD NESTED COURSES JSON =====
    const nestedCourses = courses.map(course => {
        const courseId = String(course._id);
        const courseLessons = lessons
            .filter(lesson => String(lesson.courseId) === courseId)
            .sort((a, b) => a.order - b.order)
            .map(lesson => {
                // Get vocabulary items for this lesson
                const lessonVocabItems = (lesson.vocabularyIds || [])
                    .map(id => vocabItemsMap.get(String(id)))
                    .filter(Boolean)
                    .map(item => ({
                        _id: item!._id,
                        simplified: item!.simplified,
                        traditional: item!.traditional,
                        pinyin: item!.pinyin,
                        pinyinNumeric: item!.pinyinNumeric,
                        bopomofo: item!.bopomofo,
                        meanings: item!.meanings,
                        pos: item!.pos,
                        classifiers: item!.classifiers,
                        examples: item!.examples,
                        radical: item!.radical,
                        frequency: item!.frequency,
                        order: item!.order,
                    }));

                // Get grammar items for this lesson
                const lessonGrammarItems = (lesson.grammarIds || [])
                    .map(id => grammarItemsMap.get(String(id)))
                    .filter(Boolean)
                    .map(item => ({
                        _id: item!._id,
                        code: item!.code,
                        name: item!.name,
                        grammar: item!.grammar,
                        examples: item!.examples,
                        order: item!.order,
                    }));

                // Get conversation for this lesson
                const conversation = lesson.conversationId
                    ? conversationsMap.get(String(lesson.conversationId))
                    : null;

                const lessonConversation = conversation
                    ? {
                        _id: conversation._id,
                        name: conversation.name,
                        description: conversation.description,
                        participants: conversation.participants,
                        sentences: conversation.sentences,
                        audioUrl: conversation.audioUrl,
                        videoUrl: conversation.videoUrl,
                        subtitleUrl: conversation.subtitleUrl,
                        duration: conversation.duration,
                        alignment: conversation.alignment,
                    }
                    : null;

                return {
                    _id: lesson._id,
                    name: lesson.name,
                    description: lesson.description,
                    order: lesson.order,
                    vocabulary: lessonVocabItems,
                    grammar: lessonGrammarItems,
                    conversation: lessonConversation,
                };
            });

        return {
            _id: course._id,
            name: course.name,
            description: course.description,
            lessons: courseLessons,
        };
    });

    const coursesJson = {
        version,
        buildTime,
        courses: nestedCourses,
    };

    const coursesJsonString = JSON.stringify(coursesJson, null, 2);
    const coursesBuffer = Buffer.from(coursesJsonString, 'utf-8');

    // Upload courses JSON
    await uploadBuffer({
        key: COURSES_JSON_KEY,
        buffer: coursesBuffer,
        contentType: 'application/json',
    });

    // ===== BUILD VOCABULARY SQLITE =====
    const vocabDbPath = path.join(os.tmpdir(), `vocab_${Date.now()}.sqlite`);
    const vocabDb = new Database(vocabDbPath);

    // Create tables
    vocabDb.exec(`
    CREATE TABLE collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      photo TEXT,
      item_count INTEGER DEFAULT 0
    );

    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL,
      simplified TEXT,
      traditional TEXT,
      pinyin TEXT,
      pinyin_numeric TEXT,
      bopomofo TEXT,
      meanings TEXT,
      pos TEXT,
      classifiers TEXT,
      examples TEXT,
      radical TEXT,
      frequency INTEGER DEFAULT 0,
      item_order INTEGER DEFAULT 0,
      FOREIGN KEY (collection_id) REFERENCES collections(id)
    );

    CREATE INDEX idx_items_collection ON items(collection_id);
    CREATE INDEX idx_items_simplified ON items(simplified);
    CREATE INDEX idx_items_pinyin ON items(pinyin);
  `);

    // Insert collections
    const insertCollection = vocabDb.prepare(
        'INSERT INTO collections (id, name, description, photo, item_count) VALUES (?, ?, ?, ?, ?)'
    );
    for (const col of vocabCollections) {
        insertCollection.run(
            toSqliteStr(col._id),
            toSqliteStr(col.name),
            toSqliteStr(col.description),
            toSqliteStr(col.photo),
            toSqliteNum(col.itemCount)
        );
    }

    // Insert items
    const insertItem = vocabDb.prepare(`
    INSERT INTO items (id, collection_id, simplified, traditional, pinyin, pinyin_numeric, bopomofo, meanings, pos, classifiers, examples, radical, frequency, item_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    for (const item of vocabItems) {
        insertItem.run(
            toSqliteStr(item._id),
            toSqliteStr(item.collectionId),
            toSqliteStr(item.simplified),
            toSqliteStr(item.traditional),
            toSqliteStr(item.pinyin),
            toSqliteStr(item.pinyinNumeric),
            toSqliteStr(item.bopomofo),
            JSON.stringify(item.meanings || []),
            JSON.stringify(item.pos || []),
            JSON.stringify(item.classifiers || []),
            JSON.stringify(item.examples || []),
            toSqliteStr(item.radical),
            toSqliteNum(item.frequency),
            toSqliteNum(item.order)
        );
    }

    vocabDb.close();

    // Read and upload vocab SQLite
    const vocabSqliteBuffer = fs.readFileSync(vocabDbPath);
    await uploadBuffer({
        key: VOCAB_SQLITE_KEY,
        buffer: vocabSqliteBuffer,
        contentType: 'application/x-sqlite3',
    });
    fs.unlinkSync(vocabDbPath);

    // ===== BUILD GRAMMAR SQLITE =====
    const grammarDbPath = path.join(os.tmpdir(), `grammar_${Date.now()}.sqlite`);
    const grammarDb = new Database(grammarDbPath);

    // Create tables
    grammarDb.exec(`
    CREATE TABLE collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      photo TEXT,
      item_count INTEGER DEFAULT 0
    );

    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL,
      code TEXT,
      name TEXT,
      grammar TEXT,
      examples TEXT,
      item_order INTEGER DEFAULT 0,
      FOREIGN KEY (collection_id) REFERENCES collections(id)
    );

    CREATE INDEX idx_items_collection ON items(collection_id);
    CREATE INDEX idx_items_code ON items(code);
  `);

    // Insert collections
    const insertGrammarCollection = grammarDb.prepare(
        'INSERT INTO collections (id, name, description, photo, item_count) VALUES (?, ?, ?, ?, ?)'
    );
    for (const col of grammarCollections) {
        insertGrammarCollection.run(
            toSqliteStr(col._id),
            toSqliteStr(col.name),
            toSqliteStr(col.description),
            toSqliteStr(col.photo),
            toSqliteNum(col.itemCount)
        );
    }

    // Insert items
    const insertGrammarItem = grammarDb.prepare(`
    INSERT INTO items (id, collection_id, code, name, grammar, examples, item_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    for (const item of grammarItems) {
        insertGrammarItem.run(
            toSqliteStr(item._id),
            toSqliteStr(item.collectionId),
            toSqliteStr(item.code),
            toSqliteStr(item.name),
            toSqliteStr(item.grammar),
            JSON.stringify(item.examples || []),
            toSqliteNum(item.order)
        );
    }

    grammarDb.close();

    // Read and upload grammar SQLite
    const grammarSqliteBuffer = fs.readFileSync(grammarDbPath);
    await uploadBuffer({
        key: GRAMMAR_SQLITE_KEY,
        buffer: grammarSqliteBuffer,
        contentType: 'application/x-sqlite3',
    });
    fs.unlinkSync(grammarDbPath);

    // ===== RETURN RESULT =====
    return {
        courses: {
            key: COURSES_JSON_KEY,
            url: R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${COURSES_JSON_KEY}` : null,
            size: coursesBuffer.length,
            count: courses.length,
            lessonsCount: lessons.length,
        },
        vocabulary: {
            key: VOCAB_SQLITE_KEY,
            url: R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${VOCAB_SQLITE_KEY}` : null,
            size: vocabSqliteBuffer.length,
            collectionsCount: vocabCollections.length,
            itemsCount: vocabItems.length,
        },
        grammar: {
            key: GRAMMAR_SQLITE_KEY,
            url: R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${GRAMMAR_SQLITE_KEY}` : null,
            size: grammarSqliteBuffer.length,
            collectionsCount: grammarCollections.length,
            itemsCount: grammarItems.length,
        },
        version,
        buildTime,
    };
}

export const POST = withApi(postHandler, { protected: true, roles: [UserRole.Admin] });
