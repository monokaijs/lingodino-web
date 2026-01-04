import OpenAI from 'openai';
import { DialogueSentence, ConversationParticipant, ParticipantRole } from '@/lib/types/models/conversation';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type LearningLevel = 'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4' | 'HSK 5' | 'HSK 6' | 'HSK 7 - 9';

export const GeneratedSegmentSchema = z.object({
  text: z.string().describe('The word or phrase segment'),
  pinyin: z.string().describe('Numeric pinyin for the segment'),
  translation: z.string().describe('Vietnamese translation for the segment'),
});

export const GeneratedSentenceSchema = z.object({
  text: z.string().describe('The full Chinese text of the sentence'),
  segments: z.array(GeneratedSegmentSchema).describe('The sentence segmented into words/phrases'),
  participantRole: z.enum([ParticipantRole.Speaker1, ParticipantRole.Speaker2]),
  tone: z.string().optional().describe('Tone instruction for TTS (e.g., cheerfully, sadly)'),
  emotion: z.string().optional().describe('Emotion label (e.g., happy, sad, angry)'),
});

export const GeneratedDialogueSchema = z.object({
  sentences: z.array(GeneratedSentenceSchema),
});

export type GeneratedDialogue = z.infer<typeof GeneratedDialogueSchema>;

interface GenerateDialogueParams {
  participants: ConversationParticipant[];
  sentenceCount: number;
  level: string;
  topic: string;
  model: string;
}

export async function generateConversationText({
  participants,
  sentenceCount,
  level,
  topic,
  model,
}: GenerateDialogueParams): Promise<GeneratedDialogue> {
  const speaker1 = participants.find(p => p.role === ParticipantRole.Speaker1);
  const speaker2 = participants.find(p => p.role === ParticipantRole.Speaker2);

  const systemPrompt = `You are an expert Chinese language teacher designed to create realistic, level-appropriate conversations for students.

Your task is to generate a dialogue between two speakers:
- Speaker 1: ${speaker1?.name || 'Speaker 1'} (${ParticipantRole.Speaker1})
- Speaker 2: ${speaker2?.name || 'Speaker 2'} (${ParticipantRole.Speaker2})

Target Level: ${level}
Vocabulary and grammar must be strictly suitable for this HSK level.
Verify that the content is natural and educational.
CRITICAL: The conversation must be complete and self-contained within the requested number of sentences. It must have a logical beginning, middle, and end. Do not leave the conversation hanging or incomplete.
IMPORTANT: The "text" field must ONLY contain the spoken dialogue. Do NOT include the speaker's name or role (e.g., "Wang: Hello" -> "Hello").

Break down each sentence into segments (words or phrases).
IMPORTANT: Punctuation marks (.,;?! etc.) must be attached to the preceding segment. Do NOT create separate segments for punctuation.
For each segment provide:
- text: The Chinese characters.
- pinyin: The numeric pinyin (e.g., "ni3 hao3").
- translation: The Vietnamese translation of the segment.

Output strictly valid JSON matching this structure:
{
  "sentences": [
    {
      "text": "Full Chinese text",
      "segments": [
        {
          "text": "Word",
          "pinyin": "Pin1yin1",
          "translation": "Vietnamese meaning"
        }
      ],
      "participantRole": "speaker1" or "speaker2",
      "tone": "tone from list",
      "emotion": "emotion from list"
    }
  ]
}`;

  const userPrompt = `Generate a conversation with exactly ${sentenceCount} sentences.
Topic / Constraints: ${topic}

Ensure the dialogue flows naturally between the two speakers.
Include appropriate emotions and tones for Text-to-Speech generation.
AVAILABLE EMOTIONS: happy, sad, angry, surprised, fearful, disgusted, neutral, excited, anxious, confident, curious, tired.
AVAILABLE TONES: cheerfully, sadly, angrily, excitedly, calmly, nervously, sarcastically, whispering, shouting, warmly, coldly, mysteriously, playfully.
`;

  // Use JSON mode or Structured Outputs if model supports it.
  // Newer models sustain structured outputs better.

  // Use standard chat completions with JSON object response format
  const completion = await openai.chat.completions.create({
    model: model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0].message.content;

  if (!content) {
    throw new Error('Failed to generate dialogue: No content in response');
  }

  try {
    const json = JSON.parse(content);
    const response = GeneratedDialogueSchema.parse(json);
    return response;
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI response as valid dialogue JSON');
  }
}
