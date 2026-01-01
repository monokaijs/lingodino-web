'use client';

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {Button} from '@/components/ui/button';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {IconPlus, IconEdit, IconTrash, IconArrowLeft, IconGripVertical} from '@tabler/icons-react';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useParams} from 'next/navigation';
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
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {toast} from 'sonner';
import {Course} from '@/lib/types/models/course';
import {Lesson} from '@/lib/types/models/lesson';
import {LessonDialog} from './lesson-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {restrictToVerticalAxis} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

interface ApiResponse<T> {
  data: T;
  code: number;
  message: string;
}

async function fetchCourse(id: string): Promise<Course> {
  const res = await fetch(`/api/courses/${id}`);
  const json: ApiResponse<Course> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchLessons(courseId: string): Promise<Lesson[]> {
  const res = await fetch(`/api/lessons?courseId=${courseId}`);
  const json: ApiResponse<Lesson[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteLesson(id: string): Promise<void> {
  const res = await fetch(`/api/lessons/${id}`, {method: 'DELETE'});
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

async function updateLessonOrder(id: string, order: number): Promise<void> {
  const res = await fetch(`/api/lessons/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({order}),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

interface SortableRowProps {
  children: React.ReactNode;
  id: string;
}

function SortableRow({children, id}: SortableRowProps) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as 'relative',
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="w-[40px]">
        <Button size="icon-sm" variant="ghost" className="cursor-grab" {...listeners}>
          <IconGripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const {data: course} = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId),
  });

  const [optimisticLessons, setOptimisticLessons] = useState<Lesson[]>([]);

  const {data: lessons, isLoading} = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => fetchLessons(courseId),
  });

  // Sync optimistic lessons with fetched lessons
  if (lessons && optimisticLessons.length === 0 && lessons.length > 0) {
    setOptimisticLessons(lessons);
  }
  // Also sync if lessons length changes or if we are not dragging?
  // Proper sync way:
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (lessons) {
      setOptimisticLessons(lessons);
    }
  }, [lessons]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const deleteMutation = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['lessons', courseId]});
      toast.success('Lesson deleted');
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const {active, over} = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      setOptimisticLessons(items => {
        const oldIndex = items.findIndex(item => item._id === active.id);
        const newIndex = items.findIndex(item => item._id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Calculate new order
        let newOrder: number;
        if (newItems.length === 1) {
          newOrder = Date.now();
        } else if (newIndex === 0) {
          // First item
          newOrder = newItems[1].order - 60000; // Subtract 1 minute roughly
        } else if (newIndex === newItems.length - 1) {
          // Last item
          newOrder = newItems[newItems.length - 2].order + 60000;
        } else {
          // Middle
          const prevOrder = newItems[newIndex - 1].order;
          const nextOrder = newItems[newIndex + 1].order;
          newOrder = (prevOrder + nextOrder) / 2;
        }

        // Update the item in local state immediately so UI reflects it?
        // arrayMove moved it, but didn't update the order property value in the object.
        // We probably don't need to update the order property in UI strictly, as long as position is correct.
        // But for consistency we should.
        newItems[newIndex] = {...newItems[newIndex], order: newOrder};

        // Fire API update
        updateLessonOrder(active.id as string, newOrder).catch(err => {
          toast.error('Failed to save order');
          queryClient.invalidateQueries({queryKey: ['lessons', courseId]});
        });

        return newItems;
      });
    }
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLesson(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingLesson(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/courses">
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{course?.name}</h1>
          <p className="text-muted-foreground">{course?.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lessons</CardTitle>
            <CardDescription>Manage lessons for this course</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />
            Add Lesson
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragStart={event => setActiveId(event.active.id as string)}
              modifiers={[restrictToVerticalAxis]}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={optimisticLessons.map(l => l._id)} strategy={verticalListSortingStrategy}>
                    {optimisticLessons?.map(lesson => (
                      <SortableRow key={lesson._id} id={lesson._id}>
                        <TableCell className="font-medium">
                          <Link href={`/dashboard/lessons/${lesson._id}`} className="hover:underline">
                            {lesson.name}
                          </Link>
                        </TableCell>
                        <TableCell>{lesson.description}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(lesson)}>
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(lesson._id)}>
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </SortableRow>
                    ))}
                  </SortableContext>
                  {optimisticLessons?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No lessons found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <DragOverlay>
                {activeId ? (
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="w-[40px]">
                          <Button size="icon-sm" variant="ghost" className="cursor-grabbing">
                            <IconGripVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium w-[var(--radix-table-cell-width)]">
                          {optimisticLessons.find(l => l._id === activeId)?.name}
                        </TableCell>
                        <TableCell>{optimisticLessons.find(l => l._id === activeId)?.description}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon-sm">
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm">
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <LessonDialog open={dialogOpen} onOpenChange={handleDialogClose} courseId={courseId} lesson={editingLesson} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              <Button variant="destructive">Delete</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
