import {z} from 'zod';

export const GenerateExamSchema = z.object({
  lessonId: z.string(),
  name: z.string().min(1, 'Name is required'),
  instructions: z.string().optional(),
  questionCounts: z.object({
    multipleChoice: z.number().min(0).default(5),
    fillInBlank: z.number().min(0).default(2),
    matching: z.number().min(0).default(2),
    trueFalse: z.number().min(0).default(0),
    shortAnswer: z.number().min(0).default(0),
  }),
});

export type GenerateExamRequest = z.infer<typeof GenerateExamSchema>;
