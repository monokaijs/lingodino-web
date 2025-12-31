import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'

async function getHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const lesson = await dbService.lesson.findById(id)
  if (!lesson) {
    const error = new Error('Lesson not found')
    ;(error as any).code = 404
    throw error
  }

  return lesson
}

async function putHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.json()

  const lesson = await dbService.lesson.findById(id)
  if (!lesson) {
    const error = new Error('Lesson not found')
    ;(error as any).code = 404
    throw error
  }

  if (body.courseId && body.courseId !== lesson.courseId) {
    const course = await dbService.course.findById(body.courseId)
    if (!course) {
      const error = new Error('Course not found')
      ;(error as any).code = 404
      throw error
    }
  }

  const updated = await dbService.lesson.update(
    { _id: id },
    {
      name: body.name ?? lesson.name,
      description: body.description ?? lesson.description,
      courseId: body.courseId ?? lesson.courseId,
      order: body.order ?? lesson.order,
    },
    { new: true },
  )

  return updated
}

async function deleteHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const lesson = await dbService.lesson.findById(id)
  if (!lesson) {
    const error = new Error('Lesson not found')
    ;(error as any).code = 404
    throw error
  }

  await dbService.lesson.deleteOne(id)

  return { message: 'Lesson deleted successfully' }
}

export const GET = withApi(getHandler)
export const PUT = withApi(putHandler, { protected: true, roles: [UserRole.Admin] })
export const DELETE = withApi(deleteHandler, { protected: true, roles: [UserRole.Admin] })
