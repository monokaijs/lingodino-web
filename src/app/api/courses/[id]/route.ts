import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {dbService} from '@/lib/services/db';
import {UserRole} from '@/lib/types/models/user';

async function getHandler(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;

  const course = await dbService.course.findById(id);
  if (!course) {
    const error = new Error('Course not found');
    (error as any).code = 404;
    throw error;
  }

  return course;
}

async function putHandler(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;
  const body = await request.json();

  const course = await dbService.course.findById(id);
  if (!course) {
    const error = new Error('Course not found');
    (error as any).code = 404;
    throw error;
  }

  const updated = await dbService.course.update(
    {_id: id},
    {
      name: body.name ?? course.name,
      description: body.description ?? course.description,
    },
    {new: true}
  );

  return updated;
}

async function deleteHandler(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;

  const course = await dbService.course.findById(id);
  if (!course) {
    const error = new Error('Course not found');
    (error as any).code = 404;
    throw error;
  }

  await dbService.course.deleteOne(id);

  return {message: 'Course deleted successfully'};
}

export const GET = withApi(getHandler);
export const PUT = withApi(putHandler, {protected: true, roles: [UserRole.Admin]});
export const DELETE = withApi(deleteHandler, {protected: true, roles: [UserRole.Admin]});
