import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {dbService} from '@/lib/services/db';
import {UserRole} from '@/lib/types/models/user';

async function getHandler(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;

  const exam = await dbService.exam.findById(id);
  if (!exam) {
    const error = new Error('Exam not found');
    (error as any).code = 404;
    throw error;
  }

  return exam;
}

async function putHandler(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;
  const body = await request.json();

  const exam = await dbService.exam.findById(id);
  if (!exam) {
    const error = new Error('Exam not found');
    (error as any).code = 404;
    throw error;
  }

  if (body.lessonId && body.lessonId !== exam.lessonId) {
    const lesson = await dbService.lesson.findById(body.lessonId);
    if (!lesson) {
      const error = new Error('Lesson not found');
      (error as any).code = 404;
      throw error;
    }
  }

  const updated = await dbService.exam.update(
    {_id: id},
    {
      name: body.name ?? exam.name,
      description: body.description ?? exam.description,
      lessonId: body.lessonId ?? exam.lessonId,
    },
    {new: true}
  );

  return updated;
}

async function deleteHandler(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;

  const exam = await dbService.exam.findById(id);
  if (!exam) {
    const error = new Error('Exam not found');
    (error as any).code = 404;
    throw error;
  }

  await dbService.examQuestion.delete({examId: id});
  await dbService.exam.deleteOne(id);

  return {message: 'Exam deleted successfully'};
}

export const GET = withApi(getHandler);
export const PUT = withApi(putHandler, {protected: true, roles: [UserRole.Admin]});
export const DELETE = withApi(deleteHandler, {protected: true, roles: [UserRole.Admin]});

