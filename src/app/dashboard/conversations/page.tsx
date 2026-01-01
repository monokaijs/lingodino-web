'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconPlayerPlay,
  IconDownload,
  IconLoader2,
  IconCheck,
  IconX,
  IconWaveSquare,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Conversation, ConversationStatus } from '@/lib/types/models/conversation';
import { cn } from '@/lib/utils/cn';

interface ApiResponse<T> {
  data: T;
  pagination?: any;
  code: number;
  message: string;
}

async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations');
  const json: ApiResponse<Conversation[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function createConversation(data: { name: string; description?: string }): Promise<Conversation> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<Conversation> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
}

async function downloadAudio(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${id}/download`);
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);

  // Open download URL in new tab
  window.open(json.data.url, '_blank');
}

function getStatusIcon(status: ConversationStatus) {
  switch (status) {
    case ConversationStatus.Draft:
      return <IconEdit className="h-3 w-3" />;
    case ConversationStatus.Generating:
      return <IconLoader2 className="h-3 w-3 animate-spin" />;
    case ConversationStatus.Completed:
      return <IconCheck className="h-3 w-3" />;
    case ConversationStatus.Failed:
      return <IconX className="h-3 w-3" />;
  }
}

function getStatusVariant(status: ConversationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case ConversationStatus.Draft:
      return 'secondary';
    case ConversationStatus.Generating:
      return 'outline';
    case ConversationStatus.Completed:
      return 'default';
    case ConversationStatus.Failed:
      return 'destructive';
  }
}

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  const createMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Tạo hội thoại thành công');
      setCreateDialogOpen(false);
      setNewName('');
      setNewDescription('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Xóa hội thoại thành công');
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Vui lòng nhập tên hội thoại');
      return;
    }
    createMutation.mutate({ name: newName, description: newDescription });
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadAudio(id);
      toast.success('Bắt đầu tải xuống');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hội thoại âm thanh</h1>
          <p className="text-muted-foreground">Tạo và quản lý âm thanh hội thoại sử dụng AI ElevenLabs</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <IconPlus className="mr-2 h-4 w-4" />
          Thêm hội thoại mới
        </Button>
      </div>

      {/* Conversations Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : conversations?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <IconWaveSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">Chưa có hội thoại nào</h3>
            <p className="text-muted-foreground text-sm mb-4">Tạo hội thoại đầu tiên của bạn</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <IconPlus className="mr-2 h-4 w-4" />
              Tạo hội thoại
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conversations?.map(conversation => (
            <Card
              key={conversation._id}
              className={cn(
                'group relative transition-all hover:shadow-md',
                conversation.status === ConversationStatus.Completed && 'border-primary/30'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/conversations/${conversation._id}`}>
                      <CardTitle className="text-lg hover:text-primary transition-colors truncate">
                        {conversation.name}
                      </CardTitle>
                    </Link>
                    <CardDescription className="line-clamp-2 mt-1">
                      {conversation.description || 'Không có mô tả'}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(conversation.status)} className="shrink-0">
                    {getStatusIcon(conversation.status)}
                    <span className="ml-1 capitalize">{conversation.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{conversation.sentences?.length || 0} câu</span>
                    <span>•</span>
                    <span>{conversation.participants?.length || 0} người nói</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/dashboard/conversations/${conversation._id}`}>
                      <IconEdit className="h-4 w-4 mr-1" />
                      Sửa
                    </Link>
                  </Button>
                  {conversation.status === ConversationStatus.Completed && (
                    <Button variant="outline" size="sm" onClick={() => handleDownload(conversation._id)}>
                      <IconDownload className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(conversation._id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm hội thoại mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên</Label>
              <Input
                id="name"
                placeholder="Ví dụ: Hội thoại nhà hàng"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả (tùy chọn)</Label>
              <Textarea
                id="description"
                placeholder="Mô tả hội thoại..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hội thoại</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa hội thoại này không? Âm thanh đã tạo cũng sẽ bị xóa. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
