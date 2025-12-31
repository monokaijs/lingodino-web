import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'

async function getHandler(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params

  const item = await dbService.vocabularyItem.findById(itemId)
  if (!item || item.collectionId !== id) {
    const error = new Error('Vocabulary item not found')
    ;(error as any).code = 404
    throw error
  }

  return item
}

async function patchHandler(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params
  const body = await request.json()

  const item = await dbService.vocabularyItem.findById(itemId)
  if (!item || item.collectionId !== id) {
    const error = new Error('Vocabulary item not found')
    ;(error as any).code = 404
    throw error
  }

  // Only allow updating specific fields
  const allowedFields = ['examples', 'meanings', 'pos', 'classifiers']
  const updateData: Record<string, any> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  const updatedItem = await dbService.vocabularyItem.update({ _id: itemId }, updateData, { new: true })

  return updatedItem
}

async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params

  const item = await dbService.vocabularyItem.findById(itemId)
  if (!item || item.collectionId !== id) {
    const error = new Error('Vocabulary item not found')
    ;(error as any).code = 404
    throw error
  }

  await dbService.vocabularyItem.delete({ _id: itemId })

  // Decrement item count
  await dbService.vocabularyCollection.update({ _id: id }, { $inc: { itemCount: -1 } }, { new: true })

  return { message: 'Vocabulary item deleted' }
}

export const GET = withApi(getHandler)
export const PATCH = withApi(patchHandler, { protected: true, roles: [UserRole.Admin] })
export const DELETE = withApi(deleteHandler, { protected: true, roles: [UserRole.Admin] })
