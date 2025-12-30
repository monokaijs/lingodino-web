import { NextRequest } from 'next/server';
import { withApi } from '@/lib/utils/withApi';
import { dbService } from '@/lib/services/db';
import { UserRole } from '@/lib/types/models/user';

interface HSKTranscription {
    pinyin?: string;
    numeric?: string;
    wadegiles?: string;
    bopomofo?: string;
    romatzyh?: string;
}

interface HSKVocabForm {
    traditional?: string;
    transcriptions?: HSKTranscription;
    meanings?: string[];
    classifiers?: string[];
}

interface HSKVocabItem {
    simplified: string;
    radical?: string;
    frequency?: number;
    pos?: string[];
    forms?: HSKVocabForm[];
}

async function postHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json();

    const collection = await dbService.vocabularyCollection.findById(id);
    if (!collection) {
        const error = new Error('Collection not found');
        (error as any).code = 404;
        throw error;
    }

    if (!body.url) {
        const error = new Error('URL is required');
        (error as any).code = 400;
        throw error;
    }

    // Fetch JSON from URL
    let vocabData: HSKVocabItem[];
    try {
        const response = await fetch(body.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        vocabData = await response.json();
    } catch (err: any) {
        const error = new Error(`Failed to fetch vocabulary data: ${err.message}`);
        (error as any).code = 400;
        throw error;
    }

    if (!Array.isArray(vocabData)) {
        const error = new Error('Invalid vocabulary data format: expected an array');
        (error as any).code = 400;
        throw error;
    }

    // Parse and flatten vocabulary items - completely flat structure
    const items = vocabData.map((item, index) => {
        const primaryForm = item.forms?.[0];

        return {
            collectionId: id,

            // Character data
            simplified: item.simplified,
            traditional: primaryForm?.traditional || '',
            pinyin: primaryForm?.transcriptions?.pinyin || '',
            pinyinNumeric: primaryForm?.transcriptions?.numeric || '',
            bopomofo: primaryForm?.transcriptions?.bopomofo || '',

            // Meanings and usage
            meanings: primaryForm?.meanings || [],
            pos: item.pos || [],
            classifiers: primaryForm?.classifiers || [],

            // Metadata
            radical: item.radical || '',
            frequency: item.frequency || 0,
            order: index,
        };
    }).filter(item => item.simplified);

    // Bulk insert items
    if (items.length > 0) {
        await dbService.vocabularyItem.insertMany(items);

        // Update item count
        await dbService.vocabularyCollection.update(
            { _id: id },
            { $inc: { itemCount: items.length } },
            { new: true }
        );
    }

    return {
        message: `Successfully imported ${items.length} vocabulary items`,
        count: items.length,
    };
}

export const POST = withApi(postHandler, { protected: true, roles: [UserRole.Admin] });
