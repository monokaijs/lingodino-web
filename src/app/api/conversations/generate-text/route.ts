import { NextRequest } from 'next/server'
import { withApi } from '@/lib/utils/withApi'
import { generateConversationText } from '@/lib/services/openai'
import { z } from 'zod'

const GenerateRequestSchema = z.object({
  participants: z.array(
    z.object({
      role: z.string(),
      name: z.string(),
      voiceId: z.string().optional(),
    }),
  ),
  sentenceCount: z.number().min(1).max(50),
  level: z.string(),
  topic: z.string(),
  model: z.string(),
})

async function postHandler(request: NextRequest) {
  const body = await request.json()
  const validated = GenerateRequestSchema.parse(body)

  const result = await generateConversationText({
    participants: validated.participants as any,
    sentenceCount: validated.sentenceCount,
    level: validated.level,
    topic: validated.topic,
    model: validated.model,
  })

  return {
    data: result,
    message: 'Dialogue generated successfully',
  }
}

export const POST = withApi(postHandler, { protected: true })
