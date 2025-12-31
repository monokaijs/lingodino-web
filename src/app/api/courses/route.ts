import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'

async function getHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''

  const filter: any = {}
  if (search) {
    filter.name = { $regex: search, $options: 'i' }
  }

  const result = await dbService.course.paginate(filter, {
    page,
    limit,
    sort: { createdAt: -1 },
  })

  return {
    data: result.docs,
    pagination: result,
  }
}

async function postHandler(request: NextRequest) {
  const body = await request.json()

  if (!body.name) {
    const error = new Error('Name is required')
    ;(error as any).code = 400
    throw error
  }

  const course = await dbService.course.create({
    name: body.name,
    description: body.description || '',
  })

  return course
}

export const GET = withApi(getHandler)
export const POST = withApi(postHandler, { protected: true, roles: [UserRole.Admin] })
