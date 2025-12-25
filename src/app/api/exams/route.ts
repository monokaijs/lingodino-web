import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {dbService} from '@/lib/services/db';
import {UserRole} from '@/lib/types/models/user';

async function getHandler(request: NextRequest) {
  const {searchParams} = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const lessonId = searchParams.get('lessonId') || '';

  const filter: any = {};
  if (search) {
    filter.name = {$regex: search, $options: 'i'};
  }
  if (lessonId) {
    filter.lessonId = lessonId;
  }

  const result = await dbService.exam.paginate(filter, {
    page,
    limit,
    sort: {createdAt: -1},
  });

  return {
    data: result.docs,
    pagination: result,
  };
}

async function postHandler(request: NextRequest) {
  const body = await request.json();

  if (!body.name) {
    const error = new Error('Name is required');
    (error as any).code = 400;
    throw error;
  }

  if (!body.lessonId) {
    const error = new Error('Lesson ID is required');
    (error as any).code = 400;
    throw error;
  }

  const lesson = await dbService.lesson.findById(body.lessonId);
  if (!lesson) {
    const error = new Error('Lesson not found');
    (error as any).code = 404;
    throw error;
  }

  const exam = await dbService.exam.create({
    name: body.name,
    description: body.description || '',
    lessonId: body.lessonId,
  });

  return exam;
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler, {protected: true, roles: [UserRole.Admin]});

