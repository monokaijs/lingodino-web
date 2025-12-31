import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'
import { ExamQuestionType } from '@/lib/types/models/exam'

async function getHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const question = await dbService.examQuestion.findById(id)
  if (!question) {
    const error = new Error('Question not found')
    ;(error as any).code = 404
    throw error
  }

  return question
}

async function putHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.json()

  const question = await dbService.examQuestion.findById(id)
  if (!question) {
    const error = new Error('Question not found')
    ;(error as any).code = 404
    throw error
  }

  if (body.examId && body.examId !== question.examId) {
    const exam = await dbService.exam.findById(body.examId)
    if (!exam) {
      const error = new Error('Exam not found')
      ;(error as any).code = 404
      throw error
    }
  }

  if (body.type && !Object.values(ExamQuestionType).includes(body.type)) {
    const error = new Error('Invalid question type')
    ;(error as any).code = 400
    throw error
  }

  const updated = await dbService.examQuestion.update(
    { _id: id },
    {
      examId: body.examId ?? question.examId,
      type: body.type ?? question.type,
      question: body.question ?? question.question,
      options: body.options ?? question.options,
      answer: body.answer ?? question.answer,
      file: body.file ?? question.file,
    },
    { new: true },
  )

  return updated
}

async function deleteHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const question = await dbService.examQuestion.findById(id)
  if (!question) {
    const error = new Error('Question not found')
    ;(error as any).code = 404
    throw error
  }

  await dbService.examQuestion.deleteOne(id)

  return { message: 'Question deleted successfully' }
}

export const GET = withApi(getHandler)
export const PUT = withApi(putHandler, { protected: true, roles: [UserRole.Admin] })
export const DELETE = withApi(deleteHandler, { protected: true, roles: [UserRole.Admin] })
