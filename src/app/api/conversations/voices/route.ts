import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {getVoices, getAvailableTones, getAvailableEmotions} from '@/lib/services/elevenlabs';

// GET - Get available voices from ElevenLabs
async function getHandler(request: NextRequest) {
  const voices = await getVoices();

  return {
    voices,
    tones: getAvailableTones(),
    emotions: getAvailableEmotions(),
  };
}

export const GET = withApi(getHandler, {protected: true});
