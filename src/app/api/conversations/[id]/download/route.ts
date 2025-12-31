import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { dbService } from '@/lib/services/db'
import { JWT } from 'next-auth/jwt'
import { signGet } from '@/lib/services/r2'

// GET - Get signed download URL for conversation audio
async function getHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }, decoded?: JWT) {
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

  if (!conversation.audioUrl) {
    const error = new Error('No audio available for this conversation')
    ;(error as any).code = 404
    throw error
  }

  // Generate signed URL for download
  const { url } = await signGet({
    key: conversation.audioUrl,
    expiresIn: 3600, // 1 hour
    downloadName: conversation.audioFileName || 'dialogue.mp3',
  })

  return {
    url,
    fileName: conversation.audioFileName,
  }
}

export const GET = withApi(getHandler, { protected: true })
