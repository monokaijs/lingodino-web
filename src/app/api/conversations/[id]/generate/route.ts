import { NextRequest } from 'next/server';
import { withApi } from '@/lib/utils/withApi';
import { dbService } from '@/lib/services/db';
import { JWT } from 'next-auth/jwt';
import { ConversationStatus } from '@/lib/types/models/conversation';
import { generateDialogue } from '@/lib/services/elevenlabs';
import { uploadBuffer, makeKey } from '@/lib/services/r2';

// POST - Generate dialogue audio
async function postHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }, decoded?: JWT) {
  const { id } = await params;

  const conversation = await dbService.conversation.findById(id);
  if (!conversation) {
    const error = new Error('Conversation not found');
    (error as any).code = 404;
    throw error;
  }

  if (conversation.createdBy !== decoded!.sub) {
    const error = new Error('You do not have access to this conversation');
    (error as any).code = 403;
    throw error;
  }

  // Validate conversation has sentences
  if (!conversation.sentences || conversation.sentences.length === 0) {
    const error = new Error('Conversation must have at least one sentence');
    (error as any).code = 400;
    throw error;
  }

  // Validate all participants have voice IDs
  for (const participant of conversation.participants) {
    if (!participant.voiceId) {
      const error = new Error(`Participant "${participant.name}" must have a voice assigned`);
      (error as any).code = 400;
      throw error;
    }
  }

  // Update status to generating
  await dbService.conversation.update(
    { _id: id },
    { status: ConversationStatus.Generating, errorMessage: '' },
    { new: true }
  );

  try {
    // Generate audio using ElevenLabs (now returns audio + alignment)
    const result = await generateDialogue(conversation.sentences, conversation.participants);

    // Upload to R2
    const fileName = `${conversation.name.replace(/[^a-zA-Z0-9]/g, '_')}_dialogue.mp3`;
    const key = makeKey(fileName, 'conversations');

    await uploadBuffer({
      key,
      buffer: result.audioBuffer,
      contentType: 'audio/mpeg',
    });

    // Update conversation with audio info and alignment
    const updated = await dbService.conversation.update(
      { _id: id },
      {
        status: ConversationStatus.Completed,
        audioUrl: key,
        audioFileName: fileName,
        duration: result.alignment.totalDuration,
        alignment: result.alignment,
        errorMessage: '',
      },
      { new: true }
    );

    return {
      message: 'Audio generated successfully',
      conversation: updated,
      debug: result.debug,
    };
  } catch (err: any) {
    // Update status to failed
    await dbService.conversation.update(
      { _id: id },
      {
        status: ConversationStatus.Failed,
        errorMessage: err.message || 'Failed to generate audio',
      },
      { new: true }
    );

    throw err;
  }
}

export const POST = withApi(postHandler, { protected: true });
