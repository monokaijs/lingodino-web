'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  IconVideo,
  IconMicrophone,
  IconFileText,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Conversation,
  ConversationParticipant,
  DialogueSentence,
  ParticipantRole,
  ConversationStatus,
  ElevenLabsVoice,
  SentenceSegment,
} from '@/lib/types/models/conversation';
import { GenerateDialogueDialog } from '@/components/conversations/GenerateDialogueDialog';
import { GenerateVideoDialog } from '@/components/conversations/GenerateVideoDialog';
import { ImportDialogueDialog } from '@/components/conversations/ImportDialogueDialog';
import { cn } from '@/lib/utils/cn';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ApiResponse<T> {
  data: T;
  pagination?: any;
  code: number;
  message: string;
}

interface VoicesResponse {
  voices: ElevenLabsVoice[];
  tones: string[];
  emotions: string[];
}

async function fetchConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}`);
  const json: ApiResponse<Conversation> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchVoices(): Promise<VoicesResponse> {
  const res = await fetch('/api/conversations/voices');
  const json: ApiResponse<VoicesResponse> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<Conversation> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function generateAudio(id: string): Promise<any> {
  const res = await fetch(`/api/conversations/${id}/generate`, {
    method: 'POST',
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function downloadAudio(id: string): Promise<string> {
  const res = await fetch(`/api/conversations/${id}/download`);
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data.url;
}

// Helper for auto-resizing input
const AutoResizeInput = ({ value, className, placeholder, ...props }: any) => {
  return (
    <div className="inline-grid items-center justify-items-center relative">
      <span className={cn("invisible col-start-1 row-start-1 whitespace-pre px-2 pointer-events-none min-w-[2ch]", className)}>
        {value || placeholder || ''}
      </span>
      <Input
        value={value}
        placeholder={placeholder}
        className={cn("col-start-1 row-start-1 w-full min-w-0 text-center px-1 resize-none overflow-hidden", className)}
        {...props}
      />
    </div>
  );
};

interface SortableSentenceProps {
  sentence: DialogueSentence;
  participants: ConversationParticipant[];
  tones: string[];
  emotions: string[];
  onUpdate: (id: string, updates: Partial<DialogueSentence>) => void;
  onDelete: (id: string) => void;
}

function SortableSentence({ sentence, participants, tones, emotions, onUpdate, onDelete }: SortableSentenceProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sentence.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const participant = participants.find(p => p.role === sentence.participantRole);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex gap-3 p-4 rounded-lg border bg-card transition-all',
        isDragging && 'opacity-50 shadow-lg',
        sentence.participantRole === ParticipantRole.Speaker1
          ? 'border-l-4 border-l-blue-500'
          : 'border-l-4 border-l-green-500'
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
        <div className="flex flex-col gap-3">
          <div className="shrink-0">
            <Badge
              variant={sentence.participantRole === ParticipantRole.Speaker1 ? 'default' : 'secondary'}
              className="min-w-[80px] justify-center"
            >
              <IconUser className="h-3 w-3 mr-1" />
              {participant?.name || sentence.participantRole}
            </Badge>
          </div>

          {/* Segment Editor */}
          <div className="flex flex-wrap gap-2 items-start bg-muted/30 p-2 rounded-lg border min-h-[80px]">
            {sentence.segments?.map((segment, idx) => (
              <div key={idx} className="group/segment relative flex flex-col items-center gap-0.5 min-w-fit p-1 rounded hover:bg-muted/50 transition-colors">
                {/* Pinyin (Top) - Only show border on hover/focus */}
                <AutoResizeInput
                  value={segment.pinyin}
                  onChange={(e: any) => {
                    const newSegments = [...(sentence.segments || [])];
                    newSegments[idx] = { ...newSegments[idx], pinyin: e.target.value };
                    onUpdate(sentence.id, { segments: newSegments });
                  }}
                  className="h-6 text-xs text-center px-1 text-muted-foreground font-mono bg-transparent border-transparent shadow-none hover:border-input focus-visible:border-input focus-visible:ring-1 focus-visible:bg-background"
                  placeholder="Pinyin"
                />

                {/* Text (Middle) - Main */}
                <AutoResizeInput
                  value={segment.text}
                  onChange={(e: any) => {
                    const newSegments = [...(sentence.segments || [])];
                    newSegments[idx] = { ...newSegments[idx], text: e.target.value };
                    const newText = newSegments.map(s => s.text).join('');
                    onUpdate(sentence.id, { segments: newSegments, text: newText });
                  }}
                  className="h-8 text-lg font-medium text-center px-1 bg-transparent border-transparent shadow-none hover:border-input focus-visible:border-input focus-visible:ring-1 focus-visible:bg-background"
                  placeholder="Từ"
                />

                {/* Translation (Bottom) */}
                <AutoResizeInput
                  value={segment.translation}
                  onChange={(e: any) => {
                    const newSegments = [...(sentence.segments || [])];
                    newSegments[idx] = { ...newSegments[idx], translation: e.target.value };
                    onUpdate(sentence.id, { segments: newSegments });
                  }}
                  className="h-5 text-[10px] text-center px-1 text-muted-foreground/70 bg-transparent border-transparent shadow-none hover:border-input focus-visible:border-input focus-visible:ring-1 focus-visible:bg-background"
                  placeholder="Nghĩa"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 absolute -top-2 -right-2 opacity-0 group-hover/segment:opacity-100 bg-destructive text-destructive-foreground rounded-full shadow-sm hover:bg-destructive/90 z-10"
                  onClick={() => {
                    const newSegments = sentence.segments?.filter((_, i) => i !== idx) || [];
                    const newText = newSegments.map(s => s.text).join('');
                    onUpdate(sentence.id, { segments: newSegments, text: newText });
                  }}
                >
                  <IconTrash className="h-2 w-2" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="h-full min-h-[60px] border-dashed"
              onClick={() => {
                const newSegments = [...(sentence.segments || []), { text: '', pinyin: '', translation: '' }];
                onUpdate(sentence.id, { segments: newSegments });
              }}
            >
              <IconPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tone & Emotion */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Giọng điệu</Label>
            <Select
              value={sentence.tone || '__none__'}
              onValueChange={value => onUpdate(sentence.id, { tone: value === '__none__' ? '' : value })}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Chọn giọng điệu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Không</SelectItem>
                {tones.map(tone => (
                  <SelectItem key={tone} value={tone}>
                    {tone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Cảm xúc</Label>
            <Select
              value={sentence.emotion || '__none__'}
              onValueChange={value => onUpdate(sentence.id, { emotion: value === '__none__' ? '' : value })}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Chọn cảm xúc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Không</SelectItem>
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
  );
}

export default function ConversationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const conversationId = params.id as string;

  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [sentences, setSentences] = useState<DialogueSentence[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isGenerateVideoOpen, setIsGenerateVideoOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversation(conversationId),
  });

  const { data: voicesData } = useQuery({
    queryKey: ['voices'],
    queryFn: fetchVoices,
  });

  useEffect(() => {
    if (conversation) {
      setParticipants(conversation.participants || []);
      // Migrate existing sentences to have segments if missing
      setSentences((conversation.sentences || []).map(s => ({
        ...s,
        segments: (s.segments && s.segments.length > 0) ? s.segments : (s.text ? [{ text: s.text, pinyin: '', translation: '' }] : [{ text: '', pinyin: '', translation: '' }])
      })));
    }
  }, [conversation]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Conversation>) => updateConversation(conversationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      toast.success('Đã lưu hội thoại');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generateAudio(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      toast.success('Tạo âm thanh thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ participants, sentences });
  };

  const handleGenerate = async () => {
    // Save first, then generate
    if (hasChanges) {
      await updateMutation.mutateAsync({ participants, sentences });
    }
    generateMutation.mutate();
  };

  const handleDownload = async () => {
    try {
      const url = await downloadAudio(conversationId);
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDownloadResource = async (key: string, name: string) => {
    // We need a way to get signed url for any key.
    // The existing downloadAudio uses /api/conversations/[id]/download which redirects to audioUrl
    // We might need a generic download endpoint or just use the same pattern.
    // For now, let's create a generic helper or just assume the server exposes a way.
    // Actually the user wants "allow downloading those resources".
    // I will add specific endpoints or just use the view_file tool to see how downloadAudio works.
    // fetch(`/api/conversations/${id}/download?type=video`) etc.
    // But for now, let's just assume I can't easily add that without backend change.
    // Wait, I can just use a new function that calls a new API route or modifies the existing one.
    // For simplicity, I'll pass - I will implement the UI logic later correctly.
    // Just putting placeholders for now.
    // Update: I'll use a direct link logic handled by a new helper I'll write in a sec.
  };

  const handleVideoSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
  };

  const updateParticipant = (role: ParticipantRole, updates: Partial<ConversationParticipant>) => {
    setParticipants(prev => prev.map(p => (p.role === role ? { ...p, ...updates } : p)));
    setHasChanges(true);
  };

  const addSentence = (role: ParticipantRole) => {
    const newSentence: DialogueSentence = {
      id: crypto.randomUUID(),
      participantRole: role,
      text: '',
      segments: [{ text: '', pinyin: '', translation: '' }],
      tone: '',
      emotion: '',
      order: sentences.length,
    };
    setSentences(prev => [...prev, newSentence]);
    setHasChanges(true);
  };

  const updateSentence = (id: string, updates: Partial<DialogueSentence>) => {
    setSentences(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    setHasChanges(true);
  };

  const deleteSentence = (id: string) => {
    setSentences(prev => prev.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSentences(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order values
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
      setHasChanges(true);
    }
  };

  const handleGenerateDialogue = (newSentences: DialogueSentence[]) => {
    setSentences(prev => [...prev, ...newSentences]);
    setHasChanges(true);
  };

  const handleImportDialogue = (newSentences: DialogueSentence[], updatedParticipants: ConversationParticipant[]) => {
    setSentences(prev => [...prev, ...newSentences]);
    setParticipants(updatedParticipants);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canGenerate = sentences.length > 0 && participants.every(p => p.voiceId) && sentences.every(s => s.text.trim());

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
              {conversation?.description || 'Chỉnh sửa hội thoại của bạn'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              <IconDeviceFloppy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}</span>
            </Button>
          )}
          {conversation?.status === ConversationStatus.Completed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconDownload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Tải xuống</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conversation?.audioUrl && (
                  <DropdownMenuItem asChild>
                    <a
                      href={`/api/utils/download?key=${conversation.audioUrl}&contentType=audio/mpeg&filename=${conversation.name}.mp3`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <IconMicrophone className="mr-2 h-4 w-4" />
                      Audio (MP3)
                    </a>
                  </DropdownMenuItem>
                )}
                {conversation?.videoUrl && (
                  <DropdownMenuItem asChild>
                    <a
                      href={`/api/utils/download?key=${conversation.videoUrl}&contentType=video/mp4&filename=${conversation.name}.mp4`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <IconVideo className="mr-2 h-4 w-4" />
                      Video (MP4)
                    </a>
                  </DropdownMenuItem>
                )}
                {conversation?.subtitleUrl && (
                  <DropdownMenuItem asChild>
                    <a
                      href={`/api/utils/download?key=${conversation.subtitleUrl}&contentType=application/json&filename=${conversation.name}.json`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <IconFileText className="mr-2 h-4 w-4" />
                      Subtitles (JSON)
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {conversation?.audioUrl && (
            <Button size="sm" variant="secondary" onClick={() => setIsGenerateVideoOpen(true)}>
              <IconVideo className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Tạo Video</span>
            </Button>
          )}
          <Button size="sm" onClick={handleGenerate} disabled={!canGenerate || generateMutation.isPending}>
            {generateMutation.isPending ? (
              <>
                <IconLoader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Đang tạo...</span>
              </>
            ) : (
              <>
                <IconSparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Tạo âm thanh</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Participants Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Người tham gia</CardTitle>
              <CardDescription>Cấu hình người nói và giọng đọc</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {participants.map(participant => (
                <div
                  key={participant.role}
                  className={cn(
                    'space-y-3 p-3 rounded-lg border',
                    participant.role === ParticipantRole.Speaker1
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-green-500/30 bg-green-500/5'
                  )}
                >
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tên</Label>
                    <Input
                      value={participant.name}
                      onChange={e => updateParticipant(participant.role, { name: e.target.value })}
                      placeholder="Tên người nói"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Giọng đọc</Label>
                    <Select
                      value={participant.voiceId}
                      onValueChange={value => {
                        const voice = voicesData?.voices.find(v => v.voice_id === value);
                        updateParticipant(participant.role, {
                          voiceId: value,
                          voiceName: voice?.name,
                        });
                      }}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder="Chọn một giọng đọc" />
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
              <CardTitle className="text-lg">Thêm nhanh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mb-2"
                onClick={() => setIsGenerateDialogOpen(true)}
              >
                <IconSparkles className="h-4 w-4 mr-2" />
                Tạo bằng AI
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <IconFileText className="h-4 w-4 mr-2" />
                Nhập từ văn bản
              </Button>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Hoặc thủ công</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start border-blue-500/30 hover:bg-blue-500/10"
                onClick={() => addSentence(ParticipantRole.Speaker1)}
              >
                <IconPlus className="h-4 w-4 mr-2 text-blue-500" />
                Thêm dòng {participants.find(p => p.role === ParticipantRole.Speaker1)?.name || 'Người nói 1'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-green-500/30 hover:bg-green-500/10"
                onClick={() => addSentence(ParticipantRole.Speaker2)}
              >
                <IconPlus className="h-4 w-4 mr-2 text-green-500" />
                Thêm dòng {participants.find(p => p.role === ParticipantRole.Speaker2)?.name || 'Người nói 2'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sentences List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription>Kéo và thả để sắp xếp lại các câu</CardDescription>
              </div>
              <Badge variant="secondary">{sentences.length} câu</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sentences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
                <IconPlayerPlay className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-3">Chưa có hội thoại nào được thêm</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addSentence(ParticipantRole.Speaker1)}>
                    <IconPlus className="h-4 w-4 mr-1" />
                    Thêm dòng đầu tiên
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
      <GenerateDialogueDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        participants={participants}
        onGenerate={handleGenerateDialogue}
      />
      <GenerateVideoDialog
        open={isGenerateVideoOpen}
        onOpenChange={setIsGenerateVideoOpen}
        conversationId={conversationId}
        onSuccess={handleVideoSuccess}
      />
      <ImportDialogueDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        participants={participants}
        onImport={handleImportDialogue}
      />
    </div>
  );
}
