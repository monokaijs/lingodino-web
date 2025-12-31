'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconGripVertical,
  IconPlayerPlay,
  IconDownload,
  IconLoader2,
  IconUser,
  IconDeviceFloppy,
  IconSparkles,
} from '@tabler/icons-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Conversation,
  ConversationParticipant,
  DialogueSentence,
  ParticipantRole,
  ConversationStatus,
  ElevenLabsVoice,
} from '@/lib/types/models/conversation'
import { cn } from '@/lib/utils/cn'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ApiResponse<T> {
  data: T
  pagination?: any
  code: number
  message: string
}

interface VoicesResponse {
  voices: ElevenLabsVoice[]
  tones: string[]
  emotions: string[]
}

async function fetchConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}`)
  const json: ApiResponse<Conversation> = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data
}

async function fetchVoices(): Promise<VoicesResponse> {
  const res = await fetch('/api/conversations/voices')
  const json: ApiResponse<VoicesResponse> = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data
}

async function updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json: ApiResponse<Conversation> = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data
}

async function generateAudio(id: string): Promise<any> {
  const res = await fetch(`/api/conversations/${id}/generate`, {
    method: 'POST',
  })
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data
}

async function downloadAudio(id: string): Promise<string> {
  const res = await fetch(`/api/conversations/${id}/download`)
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data.url
}

interface SortableSentenceProps {
  sentence: DialogueSentence
  participants: ConversationParticipant[]
  tones: string[]
  emotions: string[]
  onUpdate: (id: string, updates: Partial<DialogueSentence>) => void
  onDelete: (id: string) => void
}

function SortableSentence({ sentence, participants, tones, emotions, onUpdate, onDelete }: SortableSentenceProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sentence.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const participant = participants.find(p => p.role === sentence.participantRole)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex gap-3 p-4 rounded-lg border bg-card transition-all',
        isDragging && 'opacity-50 shadow-lg',
        sentence.participantRole === ParticipantRole.Speaker1
          ? 'border-l-4 border-l-blue-500'
          : 'border-l-4 border-l-green-500',
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
      >
        <IconGripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {/* Speaker & Text */}
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <Badge
              variant={sentence.participantRole === ParticipantRole.Speaker1 ? 'default' : 'secondary'}
              className="min-w-[80px] justify-center"
            >
              <IconUser className="h-3 w-3 mr-1" />
              {participant?.name || sentence.participantRole}
            </Badge>
          </div>
          <Textarea
            value={sentence.text}
            onChange={e => onUpdate(sentence.id, { text: e.target.value })}
            placeholder="Enter dialogue text..."
            className="min-h-[60px] resize-none"
            rows={2}
          />
        </div>

        {/* Tone & Emotion */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Tone</Label>
            <Select
              value={sentence.tone || '__none__'}
              onValueChange={value => onUpdate(sentence.id, { tone: value === '__none__' ? '' : value })}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {tones.map(tone => (
                  <SelectItem key={tone} value={tone}>
                    {tone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Emotion</Label>
            <Select
              value={sentence.emotion || '__none__'}
              onValueChange={value => onUpdate(sentence.id, { emotion: value === '__none__' ? '' : value })}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Select emotion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {emotions.map(emotion => (
                  <SelectItem key={emotion} value={emotion}>
                    {emotion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(sentence.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <IconTrash className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function ConversationEditorPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const conversationId = params.id as string

  const [participants, setParticipants] = useState<ConversationParticipant[]>([])
  const [sentences, setSentences] = useState<DialogueSentence[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversation(conversationId),
  })

  const { data: voicesData } = useQuery({
    queryKey: ['voices'],
    queryFn: fetchVoices,
  })

  useEffect(() => {
    if (conversation) {
      setParticipants(conversation.participants || [])
      setSentences(conversation.sentences || [])
    }
  }, [conversation])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Conversation>) => updateConversation(conversationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      toast.success('Conversation saved')
      setHasChanges(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => generateAudio(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      toast.success('Audio generated successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSave = () => {
    updateMutation.mutate({ participants, sentences })
  }

  const handleGenerate = async () => {
    // Save first, then generate
    if (hasChanges) {
      await updateMutation.mutateAsync({ participants, sentences })
    }
    generateMutation.mutate()
  }

  const handleDownload = async () => {
    try {
      const url = await downloadAudio(conversationId)
      window.open(url, '_blank')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const updateParticipant = (role: ParticipantRole, updates: Partial<ConversationParticipant>) => {
    setParticipants(prev => prev.map(p => (p.role === role ? { ...p, ...updates } : p)))
    setHasChanges(true)
  }

  const addSentence = (role: ParticipantRole) => {
    const newSentence: DialogueSentence = {
      id: crypto.randomUUID(),
      participantRole: role,
      text: '',
      tone: '',
      emotion: '',
      order: sentences.length,
    }
    setSentences(prev => [...prev, newSentence])
    setHasChanges(true)
  }

  const updateSentence = (id: string, updates: Partial<DialogueSentence>) => {
    setSentences(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)))
    setHasChanges(true)
  }

  const deleteSentence = (id: string) => {
    setSentences(prev => prev.filter(s => s.id !== id))
    setHasChanges(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSentences(items => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        // Update order values
        return newItems.map((item, index) => ({ ...item, order: index }))
      })
      setHasChanges(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const canGenerate = sentences.length > 0 && participants.every(p => p.voiceId) && sentences.every(s => s.text.trim())

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/dashboard/conversations">
              <IconArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{conversation?.name}</h1>
            <p className="text-muted-foreground text-sm truncate">
              {conversation?.description || 'Edit your dialogue conversation'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              <IconDeviceFloppy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{updateMutation.isPending ? 'Saving...' : 'Save'}</span>
            </Button>
          )}
          {conversation?.status === ConversationStatus.Completed && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <IconDownload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
          <Button size="sm" onClick={handleGenerate} disabled={!canGenerate || generateMutation.isPending}>
            {generateMutation.isPending ? (
              <>
                <IconLoader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Generating...</span>
              </>
            ) : (
              <>
                <IconSparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Generate Audio</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Participants Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Participants</CardTitle>
              <CardDescription>Configure speakers and voices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {participants.map(participant => (
                <div
                  key={participant.role}
                  className={cn(
                    'space-y-3 p-3 rounded-lg border',
                    participant.role === ParticipantRole.Speaker1
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-green-500/30 bg-green-500/5',
                  )}
                >
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      value={participant.name}
                      onChange={e => updateParticipant(participant.role, { name: e.target.value })}
                      placeholder="Speaker name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Voice</Label>
                    <Select
                      value={participant.voiceId}
                      onValueChange={value => {
                        const voice = voicesData?.voices.find(v => v.voice_id === value)
                        updateParticipant(participant.role, {
                          voiceId: value,
                          voiceName: voice?.name,
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voicesData?.voices.map(voice => (
                          <SelectItem key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Add Buttons */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Add</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start border-blue-500/30 hover:bg-blue-500/10"
                onClick={() => addSentence(ParticipantRole.Speaker1)}
              >
                <IconPlus className="h-4 w-4 mr-2 text-blue-500" />
                Add {participants.find(p => p.role === ParticipantRole.Speaker1)?.name || 'Speaker 1'} line
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-green-500/30 hover:bg-green-500/10"
                onClick={() => addSentence(ParticipantRole.Speaker2)}
              >
                <IconPlus className="h-4 w-4 mr-2 text-green-500" />
                Add {participants.find(p => p.role === ParticipantRole.Speaker2)?.name || 'Speaker 2'} line
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sentences List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Dialogue</CardTitle>
                <CardDescription>Drag and drop to reorder sentences</CardDescription>
              </div>
              <Badge variant="secondary">{sentences.length} sentences</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sentences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
                <IconPlayerPlay className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-3">No dialogue added yet</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addSentence(ParticipantRole.Speaker1)}>
                    <IconPlus className="h-4 w-4 mr-1" />
                    Add first line
                  </Button>
                </div>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sentences.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {sentences.map(sentence => (
                      <SortableSentence
                        key={sentence.id}
                        sentence={sentence}
                        participants={participants}
                        tones={voicesData?.tones || []}
                        emotions={voicesData?.emotions || []}
                        onUpdate={updateSentence}
                        onDelete={deleteSentence}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
