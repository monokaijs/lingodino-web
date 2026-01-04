import { NextRequest } from 'next/server';
import { withApi } from '@/lib/utils/withApi';
import { UserRole } from '@/lib/types/models/user';
import { Lesson } from '@/lib/types/models/lesson';
import { GrammarItem } from '@/lib/types/models/grammar';
import { Conversation } from '@/lib/types/models/conversation';
import { Exam } from '@/lib/types/models/exam';
import { GenerateExamSchema } from '@/lib/types/api/generate-exam';
import { dbService } from '@/lib/services/db';
import OpenAI from 'openai';
import { VocabularyItem } from "@/lib/types/models/vocabulary-collection";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const POST = withApi(
  async (request: NextRequest) => {
    const body = await request.json();
    const validated = GenerateExamSchema.parse(body);
    const { lessonId, name, instructions, questionCounts } = validated;

    // 1. Fetch Lesson Data
    const lesson = (await dbService.lesson.findById(lessonId)) as Lesson;
    if (!lesson) {
      const error: any = new Error('Lesson not found');
      error.code = 404;
      throw error;
    }

    // 2. Fetch Context (Conversation, Vocab, Grammar)
    let transcript = '';
    if (lesson.conversationId) {
      const convo = (await dbService.conversation.findById(lesson.conversationId)) as Conversation;
      if (convo && convo.sentences) {
        transcript = convo.sentences.map(s => `${s.participantRole}: ${s.text}`).join('\n');
      }
    }

    let vocabList: VocabularyItem[] = [];
    if (lesson.vocabularyIds?.length) {
      const curr = await Promise.all(lesson.vocabularyIds.map(id => dbService.vocabularyItem.findById(id)));
      vocabList = curr.filter(Boolean) as VocabularyItem[];
    }

    let grammarList: GrammarItem[] = [];
    if (lesson.grammarIds?.length) {
      const curr = await Promise.all(lesson.grammarIds.map(id => dbService.grammarItem.findById(id)));
      grammarList = curr.filter(Boolean) as GrammarItem[];
    }

    // 3. Construct Prompt with supported types mapping
    // Mapped types: fill_in_the_blank -> short_answer, matching -> multiple_choice
    const adjustedCounts = {
      multipleChoice: questionCounts.multipleChoice + (questionCounts.matching || 0),
      trueFalse: questionCounts.trueFalse,
      shortAnswer: questionCounts.shortAnswer + (questionCounts.fillInBlank || 0),
      speak: questionCounts.speak || 0,
    };

    const totalQuestions = Object.values(adjustedCounts).reduce((a, b) => a + b, 0);
    if (totalQuestions === 0) {
      const error: any = new Error('No valid question types requested.');
      error.code = 400;
      throw error;
    }

    // Summarize vocabulary and grammar for the prompt
    const vocabContext = vocabList.map(v => `${v.simplified} (${v.pinyin}): ${v.meanings.join(', ')}`).join('\n');
    const grammarContext = grammarList.map(g => `${g.name}: ${g.grammar}`).join('\n');

    const systemPrompt = `You are an expert language teacher generating an exam for a Chinese lesson.
    
    Context:
    - Conversation Transcript:
    ${transcript ? transcript : 'No conversation linked.'}
    
    - Vocabulary List:
    ${vocabList.length ? vocabContext : 'No specific vocabulary.'}
    
    - Grammar Points:
    ${grammarList.length ? grammarContext : 'No specific grammar.'}
    
    User Instructions: ${instructions || 'None'}
    
    Task:
    Generate valid JSON for an exam with exactly these counts:
    - Multiple Choice: ${adjustedCounts.multipleChoice} (Use this for matching-style questions too)
    - True/False: ${adjustedCounts.trueFalse}
    - Short Answer: ${adjustedCounts.shortAnswer} (Use this for fill-in-the-blank)
    - Speak: ${adjustedCounts.speak} (Voice input questions - answers must be VERY simple)
    
    Total Questions: ${totalQuestions}.
    
    Ensure questions test the specific vocabulary and grammar points provided.
    
    CRITICAL OBJECTIVE:
    - You are generating questions for a Chinese Language Learning App.
    - Questions must test **Language Proficiency**: Reading Comprehension, Vocabulary Usage, Grammar Correctness, and Translation.
    - Do NOT generate general knowledge/trivia questions (e.g. "What year was...").
    - All content must be derived strictly from the provided Transcript, Vocabulary, and Grammar points.
    
    Language: Use ONLY **Vietnamese** and **Chinese**. Instructions and questions must be in Vietnamese or Chinese. Do NOT use English.
    Do not include hints in the question content.
    
    IMPORTANT for Mobile Friendliness:
    - For Short Answer / Fill-in-the-blank:
      - The answer MUST be easy to type on mobile.
      - Do NOT require mixed language input (e.g. never ask for 'Chinese + Pinyin' combined).
      - The expected answer should be a single word or short phrase in ONE language (Chinese OR Pinyin OR Vietnamese).
      - Avoid requiring punctuation in the answer if possible.
    
    IMPORTANT for Speak Questions:
    - The answer MUST be a single Chinese word or very short phrase (1-3 characters maximum).
    - Questions should ask the user to pronounce/say a specific vocabulary word.
    - Examples: "Hãy đọc từ có nghĩa là 'xin chào'" with answer "你好".
    - NEVER ask for long sentences - only single words or very short phrases.
    - The answer must be simple enough for speech recognition to reliably match.
    `;

    // 4. Call OpenAI (Strict JSON Schema)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content:
            systemPrompt +
            "\n\nIMPORTANT: For 'correctAnswer', ensure it matches one of the options for MC/TF, or is the text answer for Short Answer/Speak.",
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'exam_generation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['multiple_choice', 'true_false', 'short_answer', 'speak'],
                    },
                    content: { type: 'string' },
                    options: { type: 'array', items: { type: 'string' } },
                    correctAnswer: { type: 'string' },
                  },
                  required: ['type', 'content', 'options', 'correctAnswer'],
                  additionalProperties: false,
                },
              },
            },
            required: ['questions'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('No content received from OpenAI');

    const parsed = JSON.parse(content);
    const finalQuestions = parsed.questions;

    // 5. Save to DB
    // Create Exam first
    const newExam: Partial<Exam> = {
      lessonId,
      name,
      description: `AI Generated Exam. Instructions: ${instructions || 'None'}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdExam = await dbService.exam.create(newExam as any);

    // Create Questions linked to Exam
    await Promise.all(
      finalQuestions.map(async (q: any) => {
        // Map generated structure to DB Schema
        const options = (q.options || []).map((optText: string) => ({
          text: optText,
          isCorrect: optText === q.correctAnswer,
        }));

        const questionData = {
          examId: createdExam._id,
          type: q.type, // matches enum values exactly now
          question: q.content,
          options: options,
          answer: q.correctAnswer,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await dbService.examQuestion.create(questionData as any);
      })
    );

    return {
      ...createdExam,
      message: 'Exam generated successfully',
    };
  },
  { protected: true, roles: [UserRole.Admin] }
);
