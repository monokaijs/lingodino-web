'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IconArrowLeft, IconDownload, IconEye } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { GrammarCollection, GrammarItem } from '@/lib/types/models/grammar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ApiResponse<T> {
  data: T;
  pagination?: any;
  code: number;
  message: string;
}

async function fetchCollection(id: string): Promise<GrammarCollection> {
  const res = await fetch(`/api/grammar-collections/${id}`);
  const json: ApiResponse<GrammarCollection> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchItems(collectionId: string): Promise<GrammarItem[]> {
  const res = await fetch(`/api/grammar-collections/${collectionId}/items?limit=100`);
  const json: ApiResponse<GrammarItem[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function importGrammar(
  id: string,
  payload: { url?: string; data?: any }
): Promise<{ count: number; skipped: number }> {
  const res = await fetch(`/api/grammar-collections/${id}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const collectionId = params.id as string;
  const queryClient = useQueryClient();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importJson, setImportJson] = useState('');
  const [selectedItem, setSelectedItem] = useState<GrammarItem | null>(null);

  const { data: collection } = useQuery({
    queryKey: ['grammar-collection', collectionId],
    queryFn: () => fetchCollection(collectionId),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['grammar-items', collectionId],
    queryFn: () => fetchItems(collectionId),
  });

  const importMutation = useMutation({
    mutationFn: (payload: { url?: string; data?: any }) => importGrammar(collectionId, payload),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['grammar-collection', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['grammar-items', collectionId] });
      toast.success(`Đã nhập ${data.count} quy tắc ngữ pháp${data.skipped > 0 ? ` (${data.skipped} bỏ qua)` : ''}`);
      setImportDialogOpen(false);
      setImportUrl('');
      setImportJson('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleImportFromUrl = () => {
    if (!importUrl.trim()) {
      toast.error('Vui lòng nhập URL');
      return;
    }
    importMutation.mutate({ url: importUrl });
  };

  const handleImportFromJson = () => {
    if (!importJson.trim()) {
      toast.error('Vui lòng dán dữ liệu JSON');
      return;
    }
    try {
      const data = JSON.parse(importJson);
      importMutation.mutate({ data });
    } catch {
      toast.error('Định dạng JSON không hợp lệ');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/grammar-collections">
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          {collection?.photo && (
            <Avatar className="h-12 w-12 rounded-md">
              <AvatarImage src={collection.photo} alt={collection.name} />
              <AvatarFallback className="rounded-md">{collection?.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          <div>
            <h1 className="text-2xl font-bold">{collection?.name}</h1>
            <p className="text-muted-foreground">{collection?.description}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Mục ngữ pháp</CardTitle>
            <CardDescription>{collection?.itemCount || 0} mục trong bộ sưu tập này</CardDescription>
          </div>
          <Button onClick={() => setImportDialogOpen(true)}>
            <IconDownload className="mr-2 h-4 w-4" />
            Nhập từ JSON
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Ngữ pháp</TableHead>
                  <TableHead className="w-[100px]">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map(item => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {item.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">{item.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{item.grammar}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" onClick={() => setSelectedItem(item)}>
                        <IconEye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Chưa có mục ngữ pháp nào. Nhập từ JSON để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grammar Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Mã</Label>
                  <p className="font-mono">{selectedItem.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Ví dụ</Label>
                  <p>{selectedItem.examples?.length || 0}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Mẫu ngữ pháp</Label>
                <p className="text-lg font-medium">{selectedItem.grammar || '-'}</p>
              </div>
              {selectedItem.examples && selectedItem.examples.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Ví dụ</Label>
                  <div className="space-y-3 mt-2">
                    {selectedItem.examples.map((ex, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-1">
                        <p className="text-lg">{ex.structure}</p>
                        {ex.translation && <p className="text-muted-foreground">{ex.translation}</p>}
                        {ex.explanation && <p className="text-sm text-muted-foreground italic">{ex.explanation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nhập quy tắc ngữ pháp</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">Từ URL</TabsTrigger>
              <TabsTrigger value="json">Dán JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="import-url">URL JSON</Label>
                <Input
                  id="import-url"
                  placeholder="https://example.com/grammars.json"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                />
              </div>
              <Button onClick={handleImportFromUrl} disabled={importMutation.isPending} className="w-full">
                {importMutation.isPending ? 'Đang nhập...' : 'Nhập từ URL'}
              </Button>
            </TabsContent>
            <TabsContent value="json" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="import-json">Dữ liệu JSON</Label>
                <Textarea
                  id="import-json"
                  placeholder='[{"code": "G001", "name": "...", "grammar": "..."}]'
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  rows={10}
                  className="font-mono text-sm max-h-[300px] overflow-y-auto"
                />
              </div>
              <Button onClick={handleImportFromJson} disabled={importMutation.isPending} className="w-full">
                {importMutation.isPending ? 'Đang nhập...' : 'Nhập JSON'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
