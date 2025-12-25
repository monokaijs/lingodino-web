import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {dbService} from '@/lib/services/db';
import {UserRole} from '@/lib/types/models/user';
import {ExamQuestionType} from '@/lib/types/models/exam';

async function getHandler(request: NextRequest) {
  const {searchParams} = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const examId = searchParams.get('examId') || '';

  const filter: any = {};
  if (search) {
    filter.question = {$regex: search, $options: 'i'};
  }
  if (examId) {
    filter.examId = examId;
  }

  const result = await dbService.examQuestion.paginate(filter, {
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

  if (!body.question) {
    const error = new Error('Question is required');
    (error as any).code = 400;
    throw error;
  }

  if (!body.examId) {
    const error = new Error('Exam ID is required');
    (error as any).code = 400;
    throw error;
  }

  if (!body.type || !Object.values(ExamQuestionType).includes(body.type)) {
    const error = new Error('Valid question type is required');
    (error as any).code = 400;
    throw error;
  }

  if (!body.answer) {
    const error = new Error('Answer is required');
    (error as any).code = 400;
    throw error;
  }

  const exam = await dbService.exam.findById(body.examId);
  if (!exam) {
    const error = new Error('Exam not found');
    (error as any).code = 404;
    throw error;
  }

  const question = await dbService.examQuestion.create({
    examId: body.examId,
    type: body.type,
    question: body.question,
    options: body.options || [],
    answer: body.answer,
    ...(body.file ? {file: body.file} : {}),
  });

  return question;
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler, {protected: true, roles: [UserRole.Admin]});

