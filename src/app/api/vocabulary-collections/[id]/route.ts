import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'

async function getHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const collection = await dbService.vocabularyCollection.findById(id)
  if (!collection) {
    const error = new Error('Collection not found')
    ;(error as any).code = 404
    throw error
  }

  return collection
}

async function putHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  const collection = await dbService.vocabularyCollection.findById(id)
  if (!collection) {
    const error = new Error('Collection not found')
    ;(error as any).code = 404
    throw error
  }

  const allowedFields = ['name', 'description', 'photo']
  const updateData: any = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  const updatedCollection = await dbService.vocabularyCollection.update(
    { _id: id },
    { $set: updateData },
    { new: true },
  )

  return updatedCollection
}

async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const collection = await dbService.vocabularyCollection.findById(id)
  if (!collection) {
    const error = new Error('Collection not found')
    ;(error as any).code = 404
    throw error
  }

  // Delete all vocabulary items in the collection
  await dbService.vocabularyItem._model.deleteMany({ collectionId: id })

  // Delete the collection
  await dbService.vocabularyCollection.deleteOne(id)

  return { message: 'Collection deleted successfully' }
}

export const GET = withApi(getHandler)
export const PUT = withApi(putHandler, { protected: true, roles: [UserRole.Admin] })
export const DELETE = withApi(deleteHandler, { protected: true, roles: [UserRole.Admin] })
