import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { JWT } from 'next-auth/jwt'

// GET - Get a specific conversation
async function getHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }, decoded?: JWT) {
  const { id } = await params

  const conversation = await dbService.conversation.findById(id)
  if (!conversation) {
    const error = new Error('Conversation not found')
    ;(error as any).code = 404
    throw error
  }

  // Check ownership
  if (conversation.createdBy !== decoded!.sub) {
    const error = new Error('You do not have access to this conversation')
    ;(error as any).code = 403
    throw error
  }

  return conversation
}

// PATCH - Update a conversation
async function patchHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }, decoded?: JWT) {
  const { id } = await params
  const body = await request.json()

  const conversation = await dbService.conversation.findById(id)
  if (!conversation) {
    const error = new Error('Conversation not found')
    ;(error as any).code = 404
    throw error
  }

  if (conversation.createdBy !== decoded!.sub) {
    const error = new Error('You do not have access to this conversation')
    ;(error as any).code = 403
    throw error
  }

  // Only allow updating certain fields
  const allowedFields = ['name', 'description', 'participants', 'sentences']
  const updateData: Record<string, any> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  const updated = await dbService.conversation.update({ _id: id }, updateData, { new: true })

  return updated
}

// DELETE - Delete a conversation
async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }, decoded?: JWT) {
  const { id } = await params

  const conversation = await dbService.conversation.findById(id)
  if (!conversation) {
    const error = new Error('Conversation not found')
    ;(error as any).code = 404
    throw error
  }

  if (conversation.createdBy !== decoded!.sub) {
    const error = new Error('You do not have access to this conversation')
    ;(error as any).code = 403
    throw error
  }

  // If there's an audio file, we should delete it from R2
  if (conversation.audioUrl) {
    try {
      const { deleteKey } = await import('@/lib/services/r2')
      await deleteKey(conversation.audioUrl)
    } catch (err) {
      console.error('Failed to delete audio from R2:', err)
    }
  }

  await dbService.conversation.delete({ _id: id })

  return { message: 'Conversation deleted successfully' }
}

export const GET = withApi(getHandler, { protected: true })
export const PATCH = withApi(patchHandler, { protected: true })
export const DELETE = withApi(deleteHandler, { protected: true })
