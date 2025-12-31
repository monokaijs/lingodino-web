import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { IconSparkles, IconLoader2 } from '@tabler/icons-react'
import { ConversationParticipant, DialogueSentence } from '@/lib/types/models/conversation'
import { toast } from 'sonner'
import { GeneratedDialogue } from '@/lib/services/openai'

const generateSchema = z.object({
  sentenceCount: z.coerce.number().min(2, 'Minimum 2 sentences').max(20, 'Maximum 20 sentences'),
  level: z.string().min(1, 'Please select a level'),
  topic: z.string().min(5, 'Topic must be at least 5 characters'),
  model: z.string().min(1, 'Please select a model'),
})

type GenerateFormValues = z.infer<typeof generateSchema>

interface GenerateDialogueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: ConversationParticipant[]
  onGenerate: (sentences: DialogueSentence[]) => void
}

export function GenerateDialogueDialog({ open, onOpenChange, participants, onGenerate }: GenerateDialogueDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema) as any,
    defaultValues: {
      sentenceCount: 6,
      level: 'HSK 2',
      topic: '',
      model: 'gpt-5.1',
    },
  })

  // Watch for manual select handling if needed, but we use controlled components with setValue
  const level = watch('level')
  const model = watch('model')

  const onSubmit = async (data: GenerateFormValues) => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/conversations/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          participants,
        }),
      })

      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.message || 'Failed to generate dialogue')
      }

      const result = await response.json()
      const generatedData: GeneratedDialogue = result.data

      // Transform generated sentences to DialogueSentence format
      const newSentences: DialogueSentence[] = generatedData.sentences.map((s, index) => ({
        id: crypto.randomUUID(),
        participantRole: s.participantRole,
        text: s.text,
        tone: s.tone || '',
        emotion: s.emotion || '',
        order: index,
        // Optional fields if you have them in your DB schema but not strictly required by UI yet
        // pinyin: s.pinyin,
        // translation: s.translation
      }))

      onGenerate(newSentences)
      onOpenChange(false)
      toast.success('Dialogue generated successfully!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate with AI</DialogTitle>
          <DialogDescription>Create a realistic conversation based on your requirements.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sentences</Label>
              <Input type="number" {...register('sentenceCount')} min={2} max={20} />
              {errors.sentenceCount && <p className="text-xs text-destructive">{errors.sentenceCount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={val => setValue('model', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5.1">GPT-5.1 (Latest)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (Smart)</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
              {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Learning Level</Label>
            <Select value={level} onValueChange={val => setValue('level', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HSK 1">HSK 1 (Beginner)</SelectItem>
                <SelectItem value="HSK 2">HSK 2 (Elementary)</SelectItem>
                <SelectItem value="HSK 3">HSK 3 (Intermediate)</SelectItem>
                <SelectItem value="HSK 4">HSK 4 (Upper Intermediate)</SelectItem>
                <SelectItem value="HSK 5">HSK 5 (Advanced)</SelectItem>
                <SelectItem value="HSK 6">HSK 6 (Proficiency)</SelectItem>
                <SelectItem value="HSK 7 - 9">HSK 7 - 9 (Mastery)</SelectItem>
              </SelectContent>
            </Select>
            {errors.level && <p className="text-xs text-destructive">{errors.level.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Topic / Constraints</Label>
            <Textarea
              {...register('topic')}
              placeholder="E.g., Discussing plans for the weekend, ordering food at a restaurant..."
              className="min-h-[100px]"
            />
            {errors.topic && <p className="text-xs text-destructive">{errors.topic.message}</p>}
            <p className="text-xs text-muted-foreground">
              Describe the scenario, specific vocabulary to use, or the relationship between speakers.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <IconSparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
