import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'

interface GrammarJsonItem {
  code: string
  name: string
  grammar: string
  example?: string
}

async function postHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  const collection = await dbService.grammarCollection.findById(id)
  if (!collection) {
    const error = new Error('Collection not found')
    ;(error as any).code = 404
    throw error
  }

  if (!body.url && !body.data) {
    const error = new Error('URL or data is required')
    ;(error as any).code = 400
    throw error
  }

  let grammarData: GrammarJsonItem[]

  if (body.url) {
    try {
      const response = await fetch(body.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }
      grammarData = await response.json()
    } catch (err: any) {
      const error = new Error(`Failed to fetch grammar data: ${err.message}`)
      ;(error as any).code = 400
      throw error
    }
  } else {
    grammarData = body.data
  }

  if (!Array.isArray(grammarData)) {
    const error = new Error('Invalid grammar data format: expected an array')
    ;(error as any).code = 400
    throw error
  }

  // Get existing codes in this collection to avoid duplicates
  const existingItems = await dbService.grammarItem.find({ collectionId: id })
  const existingCodes = new Set(existingItems.map((g: any) => g.code))

  // Get current max order
  const maxOrderItem = await dbService.grammarItem.findOne({ collectionId: id }, {}, { sort: { order: -1 } })
  let currentOrder = maxOrderItem?.order ?? -1

  // Parse and prepare grammar items (ignoring example field)
  const items = grammarData
    .filter(item => item.code && item.name && !existingCodes.has(item.code))
    .map(item => {
      currentOrder++
      return {
        collectionId: id,
        code: item.code,
        name: item.name,
        grammar: item.grammar || '',
        examples: [],
        order: currentOrder,
      }
    })

  // Bulk insert items
  let insertedCount = 0
  if (items.length > 0) {
    await dbService.grammarItem.insertMany(items)
    insertedCount = items.length

    // Update item count
    await dbService.grammarCollection.update({ _id: id }, { $inc: { itemCount: insertedCount } }, { new: true })
  }

  const skippedCount = grammarData.length - insertedCount

  return {
    message: `Successfully imported ${insertedCount} grammar rules${skippedCount > 0 ? ` (${skippedCount} skipped as duplicates)` : ''}`,
    count: insertedCount,
    skipped: skippedCount,
  }
}

export const POST = withApi(postHandler, { protected: true, roles: [UserRole.Admin] })
