import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { UserRole } from '@/lib/types/models/user'
import { JWT } from 'next-auth/jwt'
import { ConversationStatus, ParticipantRole } from '@/lib/types/models/conversation'

// GET - List conversations for current user
async function getHandler(request: NextRequest, context: any, decoded?: JWT) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const filter = { createdBy: decoded!.sub }

  const result = await dbService.conversation.paginate(filter, {
    page,
    limit,
    sort: { createdAt: -1 },
  })

  return {
    data: result.docs,
    pagination: result,
  }
}

// POST - Create a new conversation
async function postHandler(request: NextRequest, context: any, decoded?: JWT) {
  const body = await request.json()

  if (!body.name?.trim()) {
    const error = new Error('Conversation name is required')
    ;(error as any).code = 400
    throw error
  }

  const conversation = await dbService.conversation.create({
    name: body.name.trim(),
    description: body.description || '',
    participants: [
      { role: ParticipantRole.Speaker1, name: 'Speaker 1', voiceId: '' },
      { role: ParticipantRole.Speaker2, name: 'Speaker 2', voiceId: '' },
    ],
    sentences: [],
    status: ConversationStatus.Draft,
    createdBy: decoded!.sub!,
  })

  return conversation
}

export const GET = withApi(getHandler, { protected: true })
export const POST = withApi(postHandler, { protected: true })
