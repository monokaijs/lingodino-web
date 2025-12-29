import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {dbService} from '@/lib/services/db';
import {UserRole} from '@/lib/types/models/user';

export const GET = withApi(async (request: NextRequest) => {
  const {searchParams} = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const courseId = searchParams.get('courseId') || '';

  const filter: any = {};
  if (search) {
    filter.name = {$regex: search, $options: 'i'};
  }
  if (courseId) {
    filter.courseId = courseId;
  }

  const result = await dbService.lesson.paginate(filter, {
    page,
    limit,
    sort: {order: 1, createdAt: -1},
  });

  return {
    data: result.docs,
    pagination: result,
  };
});

export const POST = withApi(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.name) {
    const error = new Error('Name is required');
    (error as any).code = 400;
    throw error;
  }

  if (!body.courseId) {
    const error = new Error('Course ID is required');
    (error as any).code = 400;
    throw error;
  }

  const course = await dbService.course.findById(body.courseId);
  if (!course) {
    const error = new Error('Course not found');
    (error as any).code = 404;
    throw error;
  }
  
  return await dbService.lesson.create({
    name: body.name,
    description: body.description || '',
    courseId: body.courseId,
    order: Date.now(),
  });
}, {protected: true, roles: [UserRole.Admin]});

