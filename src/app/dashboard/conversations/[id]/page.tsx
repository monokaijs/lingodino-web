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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { SentenceEditorDialog } from '@/components/conversations/SentenceEditorDialog';
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
  IconPencil,
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
import { ConversationPlayer } from '@/components/conversations/ConversationPlayer';

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

async function generateAudio(id: string, speed: number = 1.0): Promise<any> {
  const res = await fetch(`/api/conversations/${id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed }),
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

interface SortableSentenceProps {
  sentence: DialogueSentence;
  participants: ConversationParticipant[];
  tones: string[];
  emotions: string[];
  onUpdate: (id: string, updates: Partial<DialogueSentence>) => void;
  onDelete: (id: string) => void;
  onEdit: (sentence: DialogueSentence) => void;
  activeSegmentIndex?: number;
  isActive?: boolean;
}

function SortableSentence({ sentence, participants, tones, emotions, onUpdate, onDelete, onEdit, activeSegmentIndex, isActive }: SortableSentenceProps) {
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
        'group relative flex gap-3 p-4 rounded-lg border bg-card transition-all duration-300',
        isDragging && 'opacity-50 shadow-lg',
        isActive && 'ring-2 ring-primary border-primary bg-primary/5',
        sentence.participantRole === ParticipantRole.Speaker1
          ? 'border-l-4 border-l-blue-500'
          : 'border-l-4 border-l-green-500'
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded self-start mt-1"
      >
        <IconGripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {/* Speaker & Text */}
        <div className="flex flex-col gap-3">
          <div className="shrink-0 flex justify-between items-start">
            <Badge
              variant={sentence.participantRole === ParticipantRole.Speaker1 ? 'default' : 'secondary'}
              className="min-w-[80px] justify-center"
            >
              <IconUser className="h-3 w-3 mr-1" />
              {participant?.name || sentence.participantRole}
            </Badge>

            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEdit(sentence)}
            >
              <IconPencil className="h-4 w-4" />
            </Button>
          </div>

          {/* Segment Display (Read Only) */}
          <div
            className="flex flex-wrap gap-2 items-start bg-muted/30 p-2 rounded-lg border min-h-[60px] cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onEdit(sentence)}
          >
            {sentence.segments?.map((segment, idx) => {
              const isSegmentActive = isActive && activeSegmentIndex === idx;
              return (
                <div
                  key={idx}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 p-1 px-2 rounded transition-all duration-200",
                    isSegmentActive ? "bg-yellow-400/30 scale-105 shadow-sm ring-1 ring-yellow-400/50 fill-mode-forwards" : "hover:bg-background"
                  )}
                >
                  {/* Pinyin */}
                  <span className="text-xs text-muted-foreground font-mono">{segment.pinyin || '\u00A0'}</span>

                  {/* Text */}
                  <span className={cn("text-lg font-medium", isSegmentActive && "text-primary font-bold")}>
                    {segment.text}
                  </span>
                </div>
              )
            })}
            {(sentence.segments?.length === 0 || !sentence.segments) && (
              <span className="text-muted-foreground italic text-sm self-center px-2">Chưa có nội dung. Nhấn để chỉnh sửa.</span>
            )}
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
  const [editingSentence, setEditingSentence] = useState<DialogueSentence | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isGenerateVideoOpen, setIsGenerateVideoOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);

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
    mutationFn: (vars: { speed: number }) => generateAudio(conversationId, vars.speed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      toast.success('Tạo âm thanh thành công!');
      setIsSpeedPopoverOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ participants, sentences });
  };

  const handleGenerate = async (speed: number = 1.0) => {
    // Save first, then generate
    if (hasChanges) {
      await updateMutation.mutateAsync({ participants, sentences });
    }
    generateMutation.mutate({ speed });
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
    // Placeholder
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
  const showPlayer = conversation?.audioUrl && conversation?.alignment;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6 pb-48 relative min-h-screen">
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

          <Popover open={isSpeedPopoverOpen} onOpenChange={setIsSpeedPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" disabled={!canGenerate || generateMutation.isPending}>
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
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Cài đặt âm thanh</h4>
                  <p className="text-sm text-muted-foreground">Điều chỉnh tốc độ giọng đọc.</p>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="speed">Tốc độ</Label>
                    <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                      {audioSpeed}x
                    </span>
                  </div>
                  <Slider
                    id="speed"
                    max={1.5}
                    min={0.5}
                    step={0.05}
                    value={[audioSpeed]}
                    onValueChange={(value) => setAudioSpeed(value[0])}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                  />
                </div>
                <Button onClick={() => handleGenerate(audioSpeed)} disabled={generateMutation.isPending} className="w-full">
                  {generateMutation.isPending ? 'Đang xử lý...' : 'Bắt đầu tạo'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
                    {sentences.map(sentence => {
                      const alignmentSent = conversation?.alignment?.segments.find(s => s.sentenceId === sentence.id);
                      let isActive = false;
                      let activeSegmentIndex = -1;

                      if (alignmentSent && currentAudioTime >= alignmentSent.startTime && currentAudioTime <= alignmentSent.endTime) {
                        isActive = true;
                        activeSegmentIndex = alignmentSent.words.findIndex(w => currentAudioTime >= w.start && currentAudioTime <= w.end);
                      }

                      return (
                        <SortableSentence
                          key={sentence.id}
                          sentence={sentence}
                          participants={participants}
                          tones={voicesData?.tones || []}
                          emotions={voicesData?.emotions || []}
                          onUpdate={updateSentence}
                          onDelete={deleteSentence}
                          onEdit={setEditingSentence}
                          isActive={isActive}
                          activeSegmentIndex={activeSegmentIndex}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {showPlayer && (
        <div className="sticky bottom-0 -mx-4 lg:-mx-6 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-10 flex justify-center mt-auto">
          <div className="w-full max-w-4xl">
            <ConversationPlayer
              audioUrl={conversation.audioUrl}
              onTimeUpdate={setCurrentAudioTime}
              duration={conversation.alignment?.totalDuration}
            />
          </div>
        </div>
      )}

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
      <SentenceEditorDialog
        open={!!editingSentence}
        onOpenChange={(open) => !open && setEditingSentence(null)}
        sentence={editingSentence}
        onSave={updateSentence}
      />
    </div>
  );
}
