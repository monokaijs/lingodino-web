import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {dbService} from '@/lib/services/db';

async function getHandler(request: NextRequest) {
  const {searchParams} = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return [];
  }

  const idList = ids.split(',');
  const items = await dbService.vocabularyItem.find({_id: {$in: idList}});

  return items;
}

export const GET = withApi(getHandler);
