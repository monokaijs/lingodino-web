'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Lesson } from '@/lib/types/models/lesson'
import { useEffect } from 'react'

const lessonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

type LessonFormData = z.infer<typeof lessonSchema>

interface LessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  lesson?: Lesson | null
}

async function createLesson(courseId: string, data: LessonFormData): Promise<Lesson> {
  const res = await fetch('/api/lessons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, courseId }),
  })
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data
}

async function updateLesson(id: string, data: LessonFormData): Promise<Lesson> {
  const res = await fetch(`/api/lessons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data
}

export function LessonDialog({ open, onOpenChange, courseId, lesson }: LessonDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!lesson

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  useEffect(() => {
    if (lesson) {
      form.reset({
        name: lesson.name,
        description: lesson.description || '',
      })
    } else {
      form.reset({ name: '', description: '' })
    }
  }, [lesson, form])

  const mutation = useMutation({
    mutationFn: (data: LessonFormData) => (isEditing ? updateLesson(lesson._id, data) : createLesson(courseId, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] })
      toast.success(isEditing ? 'Lesson updated' : 'Lesson created')
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const onSubmit = (data: LessonFormData) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Lesson' : 'New Lesson'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Lesson name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Lesson description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
