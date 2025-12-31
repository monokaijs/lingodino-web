import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'

async function getHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''

  const collection = await dbService.grammarCollection.findById(id)
  if (!collection) {
    const error = new Error('Collection not found')
    ;(error as any).code = 404
    throw error
  }

  const filter: any = { collectionId: id }
  if (search) {
    filter.$or = [{ code: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }]
  }

  const result = await dbService.grammarItem.paginate(filter, {
    page,
    limit,
    sort: { order: 1 },
  })

  return {
    data: result.docs,
    pagination: result,
  }
}

export const GET = withApi(getHandler)
