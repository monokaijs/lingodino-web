import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'

async function getHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const collection = await dbService.grammarCollection.findById(id)
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

  const collection = await dbService.grammarCollection.findById(id)
  if (!collection) {
    const error = new Error('Collection not found')
    ;(error as any).code = 404
    throw error
  }

  const updated = await dbService.grammarCollection.update(
    { _id: id },
    {
      name: body.name ?? collection.name,
      description: body.description ?? collection.description,
      photo: body.photo ?? collection.photo,
    },
    { new: true },
  )

  return updated
}

async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const collection = await dbService.grammarCollection.findById(id)
  if (!collection) {
    const error = new Error('Collection not found')
    ;(error as any).code = 404
    throw error
  }

  // Delete all items in collection
  await dbService.grammarItem.delete({ collectionId: id })
  await dbService.grammarCollection.delete({ _id: id })

  return { message: 'Collection deleted successfully' }
}

export const GET = withApi(getHandler)
export const PUT = withApi(putHandler, { protected: true, roles: [UserRole.Admin] })
export const DELETE = withApi(deleteHandler, { protected: true, roles: [UserRole.Admin] })
