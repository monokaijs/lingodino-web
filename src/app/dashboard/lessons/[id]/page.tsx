'use client';

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {GenerateExamDialog} from './generate-exam-dialog';
import {IconPlus, IconEdit, IconTrash, IconArrowLeft, IconX, IconWand} from '@tabler/icons-react';
import Link from 'next/link';
import {useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {toast} from 'sonner';
import {Lesson} from '@/lib/types/models/lesson';
import {Exam} from '@/lib/types/models/exam';
import {ExamDialog} from './exam-dialog';
import {LessonDialog} from '@/app/dashboard/courses/[id]/lesson-dialog';
import {AddVocabDialog} from './add-vocab-dialog';
import {AddGrammarDialog} from './add-grammar-dialog';
import {Badge} from '@/components/ui/badge';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';
import {cn} from '@/lib/utils/cn';

interface ApiResponse<T> {
  data: T;
  code: number;
  message: string;
}

async function fetchLesson(id: string): Promise<Lesson> {
  const res = await fetch(`/api/lessons/${id}`);
  const json: ApiResponse<Lesson> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchExams(lessonId: string): Promise<Exam[]> {
  const res = await fetch(`/api/exams?lessonId=${lessonId}`);
  const json: ApiResponse<Exam[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchVocabItems(ids: string[]) {
  if (ids.length === 0) return [];
  const res = await fetch(`/api/vocabulary-items?ids=${ids.join(',')}`);
  const json = await res.json();
  return json.data;
}

async function fetchGrammarItems(ids: string[]) {
  if (ids.length === 0) return [];
  const res = await fetch(`/api/grammar-items?ids=${ids.join(',')}`);
  const json = await res.json();
  return json.data;
}

async function fetchConversations() {
  const res = await fetch('/api/conversations?limit=200');
  const json: ApiResponse<any[]> = await res.json();
  return json.data;
}

async function updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson> {
  const res = await fetch(`/api/lessons/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteExam(id: string): Promise<void> {
  const res = await fetch(`/api/exams/${id}`, {method: 'DELETE'});
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);

  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);

  const [vocabDialogOpen, setVocabDialogOpen] = useState(false);
  const [grammarDialogOpen, setGrammarDialogOpen] = useState(false);
  const [genExamOpen, setGenExamOpen] = useState(false);

  const {data: lesson, isLoading: isLessonLoading} = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => fetchLesson(lessonId),
  });

  // Start prefetching conversations IF we don't have them yet or just rely on query
  // We need all conversations first to find the linked one for details
  const {data: conversations = []} = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  const {data: exams, isLoading: isExamsLoading} = useQuery({
    queryKey: ['exams', lessonId],
    queryFn: () => fetchExams(lessonId),
  });

  // Fetch details for lists
  const {data: vocabList = []} = useQuery({
    queryKey: ['lesson-vocab', lesson?.vocabularyIds],
    queryFn: () => fetchVocabItems(lesson?.vocabularyIds || []),
    enabled: !!lesson?.vocabularyIds?.length,
  });

  const {data: grammarList = []} = useQuery({
    queryKey: ['lesson-grammar', lesson?.grammarIds],
    queryFn: () => fetchGrammarItems(lesson?.grammarIds || []),
    enabled: !!lesson?.grammarIds?.length,
  });

  const updateLessonMutation = useMutation({
    mutationFn: (data: Partial<Lesson>) => updateLesson(lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['lesson', lessonId]});
      toast.success('Lesson updated');
    },
    onError: err => toast.error(err.message),
  });

  const deleteExamMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['exams', lessonId]});
      toast.success('Exam deleted');
      setDeleteExamId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleUpdateConversation = (convId: string) => {
    updateLessonMutation.mutate({conversationId: convId});
  };

  const handleRemoveConversation = () => {
    updateLessonMutation.mutate({conversationId: '' as any});
  };

  const handleAddVocab = (newIds: string[]) => {
    if (!lesson) return;
    const currentIds = lesson.vocabularyIds || [];
    const merged = Array.from(new Set([...currentIds, ...newIds]));
    updateLessonMutation.mutate({vocabularyIds: merged});
  };

  const handleRemoveVocab = (id: string) => {
    if (!lesson) return;
    const currentIds = lesson.vocabularyIds || [];
    const filtered = currentIds.filter(vid => vid !== id);
    updateLessonMutation.mutate({vocabularyIds: filtered});
  };

  const handleAddGrammar = (newIds: string[]) => {
    if (!lesson) return;
    const currentIds = lesson.grammarIds || [];
    const merged = Array.from(new Set([...currentIds, ...newIds]));
    updateLessonMutation.mutate({grammarIds: merged});
  };

  const handleRemoveGrammar = (id: string) => {
    if (!lesson) return;
    const currentIds = lesson.grammarIds || [];
    const filtered = currentIds.filter(gid => gid !== id);
    updateLessonMutation.mutate({grammarIds: filtered});
  };

  // --- Handlers ---
  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setExamDialogOpen(true);
  };

  const handleCreateExam = () => {
    setEditingExam(null);
    setExamDialogOpen(true);
  };

  const handleExamDialogClose = () => {
    setExamDialogOpen(false);
    setEditingExam(null);
  };

  // Helper to find conversation name
  const currentConversation = conversations.find((c: any) => c._id === lesson?.conversationId);

  // Use a separate hook or access properties if 'conversations' actually returns list of full objects
  // The API returns list of conversations, but maybe not detailed with videoUrl/audioUrl unless I check the response type.
  // The 'conversations' list usually contains basic info. If videoUrl/audioUrl/sentences are missing, I might need to fetch the specific conversation.
  // Assuming the list returns enough info or at least basic URLs. If not, I might need to fetch `fetchConversation(lesson.conversationId)`.
  // Let's assume list has it. If not, I'll add a specific query.
  // Actually, standard list endpoint usually returns summary. Let's inspect `fetchConversations`.
  // It calls `/api/conversations`. Standard `paginate` returns docs.
  // The Conversation model has `audioUrl`, `videoUrl`, `sentences`.
  // So `currentConversation` should have them.

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={lesson?.courseId ? `/dashboard/courses/${lesson.courseId}` : '/dashboard/lessons'}>
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold truncate text-muted-foreground/70">Lesson Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        {/* CENTER COLUMN: Content, Transcript, Exams */}
        <div className="space-y-6">
          {/* Transcript Card (Only if conversation linked) */}
          {currentConversation && (
            <Card>
              <Accordion type="single" collapsible>
                <AccordionItem value="transcript" className="border-none">
                  <AccordionTrigger className="px-6 hover:no-underline py-4">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-primary">Transcript</span>
                      <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">
                        {currentConversation.sentences?.length || 0} lines
                      </Badge>
                    </CardTitle>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-3 pt-2">
                      {(currentConversation.sentences || []).map((s: any, idx: number) => (
                        <div key={s.id || idx} className="flex gap-4">
                          <span
                            className={cn(
                              'font-bold text-sm w-4 flex-shrink-0 mt-0.5',
                              s.participantRole === 'speaker1' ? 'text-blue-500' : 'text-amber-500'
                            )}
                          >
                            {s.participantRole === 'speaker1' ? 'A:' : 'B:'}
                          </span>
                          <p className="text-base leading-relaxed text-foreground/90">{s.text}</p>
                        </div>
                      ))}
                      {(!currentConversation.sentences || currentConversation.sentences.length === 0) && (
                        <p className="text-muted-foreground italic text-center py-4">
                          No specific dialogue sentences found.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          )}

          {/* Vocabulary Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Vocabulary ({lesson?.vocabularyIds?.length || 0})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setVocabDialogOpen(true)}>
                <IconPlus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vocabList.map((item: any) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-3 rounded border bg-card/50 hover:border-primary/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-lg">{item.simplified}</span>
                        <span className="text-sm text-muted-foreground">[{item.pinyin}]</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.meanings[0]}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveVocab(item._id)}>
                      <IconTrash className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              {vocabList.length === 0 && <p className="text-center text-muted-foreground py-8">No vocabulary added.</p>}
            </CardContent>
          </Card>

          {/* Grammar Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Grammar ({lesson?.grammarIds?.length || 0})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setGrammarDialogOpen(true)}>
                <IconPlus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {grammarList.map((item: any) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-3 rounded border bg-card/50 hover:border-primary/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.code}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveGrammar(item._id)}>
                      <IconTrash className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              {grammarList.length === 0 && <p className="text-center text-muted-foreground py-8">No grammar added.</p>}
            </CardContent>
          </Card>

          {/* Exams Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Exams</CardTitle>
                <CardDescription>Assessments for this lesson</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setGenExamOpen(true)}>
                  <IconWand className="mr-2 h-4 w-4 text-purple-500" />
                  Generate with AI
                </Button>
                <Button onClick={handleCreateExam} size="sm">
                  <IconPlus className="mr-2 h-4 w-4" />
                  Add Exam
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isExamsLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {exams?.map(exam => (
                    <div
                      key={exam._id}
                      className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors flex justify-between items-center group"
                    >
                      <div>
                        <Link
                          href={`/dashboard/exams/${exam._id}`}
                          className="font-semibold hover:underline text-lg block"
                        >
                          {exam.name}
                        </Link>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {exam.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEditExam(exam)}>
                          <IconEdit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteExamId(exam._id)}>
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {exams?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                      No exams found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sidebar (Lesson Info & Media) */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* Lesson Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl">{lesson?.name}</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setLessonDialogOpen(true)}>
                  <IconEdit className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>{lesson?.description || 'No description provided.'}</CardDescription>
            </CardHeader>
          </Card>

          {/* Media / Conversation Control Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-base font-medium flex items-center justify-between">
                Conversation Media
                {lesson?.conversationId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={handleRemoveConversation}
                    title="Unlink"
                  >
                    <IconX className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>

            {/* Player Area */}
            <div className="aspect-video bg-black/5 flex items-center justify-center border-y">
              {currentConversation?.videoUrl ? (
                <video
                  controls
                  className="w-full h-full object-contain"
                  src={`/api/utils/download?key=${currentConversation.videoUrl}`}
                />
              ) : currentConversation?.audioUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-secondary/20 p-6">
                  <audio controls className="w-full" src={`/api/utils/download?key=${currentConversation.audioUrl}`} />
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-sm text-muted-foreground mb-2">No media available</p>
                  {!lesson?.conversationId && (
                    <p className="text-xs text-muted-foreground">Link a conversation to see content</p>
                  )}
                </div>
              )}
            </div>

            <CardContent className="pt-4">
              <div className="space-y-4">
                {/* Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Linked Conversation</label>
                  <Select value={lesson?.conversationId || ''} onValueChange={handleUpdateConversation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select conversation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {conversations.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currentConversation && (
                  <div className="flex justify-end">
                    <Link
                      href={`/dashboard/conversations/${currentConversation._id}`}
                      className="text-xs flex items-center gap-1 text-primary hover:underline"
                    >
                      Edit Conversation <IconArrowLeft className="h-3 w-3 rotate-180" />
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ExamDialog open={examDialogOpen} onOpenChange={handleExamDialogClose} lessonId={lessonId} exam={editingExam} />

      {lesson && (
        <LessonDialog
          open={lessonDialogOpen}
          onOpenChange={open => {
            setLessonDialogOpen(open);
            if (!open) queryClient.invalidateQueries({queryKey: ['lesson', lessonId]});
          }}
          courseId={lesson.courseId}
          lesson={lesson}
        />
      )}

      <AddVocabDialog open={vocabDialogOpen} onOpenChange={setVocabDialogOpen} onAdd={handleAddVocab} />

      <AddGrammarDialog open={grammarDialogOpen} onOpenChange={setGrammarDialogOpen} onAdd={handleAddGrammar} />

      <AlertDialog open={!!deleteExamId} onOpenChange={() => setDeleteExamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will also delete all questions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild onClick={() => deleteExamId && deleteExamMutation.mutate(deleteExamId)}>
              <Button variant="destructive">Delete</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GenerateExamDialog
        open={genExamOpen}
        onOpenChange={setGenExamOpen}
        lessonId={lessonId}
        lessonName={lesson?.name}
      />
    </div>
  );
}
