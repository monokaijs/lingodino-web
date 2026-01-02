'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IconArrowLeft, IconDownload, IconEye, IconFileUpload, IconLink, IconClipboard, IconFileExport } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { VocabularyCollection, VocabularyItem } from '@/lib/types/models/vocabulary-collection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { VocabularyDetailDialog } from './vocabulary-detail-dialog';

interface ApiResponse<T> {
  data: T;
  pagination?: any;
  code: number;
  message: string;
}

async function fetchCollection(id: string): Promise<VocabularyCollection> {
  const res = await fetch(`/api/vocabulary-collections/${id}`);
  const json: ApiResponse<VocabularyCollection> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function fetchItems(collectionId: string): Promise<VocabularyItem[]> {
  const res = await fetch(`/api/vocabulary-collections/${collectionId}/items?limit=100`);
  const json: ApiResponse<VocabularyItem[]> = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function importVocabulary(id: string, payload: { url?: string; data?: any }): Promise<{ count: number }> {
  const res = await fetch(`/api/vocabulary-collections/${id}/import`, {
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

  // Import State
  const [importTab, setImportTab] = useState('url');
  const [importUrl, setImportUrl] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importManual, setImportManual] = useState('');

  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);

  const { data: collection } = useQuery({
    queryKey: ['vocabulary-collection', collectionId],
    queryFn: () => fetchCollection(collectionId),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['vocabulary-items', collectionId],
    queryFn: () => fetchItems(collectionId),
  });

  const importMutation = useMutation({
    mutationFn: (payload: { url?: string; data?: any }) => importVocabulary(collectionId, payload),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary-collection', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['vocabulary-items', collectionId] });
      toast.success(`Đã nhập thành công ${data.count} mục từ vựng`);
      setImportDialogOpen(false);
      setImportUrl('');
      setImportFile(null);
      setImportManual('');
      setImportFile(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleImport = async () => {
    if (importTab === 'url') {
      if (!importUrl.trim()) {
        toast.error('Vui lòng nhập URL');
        return;
      }
      importMutation.mutate({ url: importUrl });
    } else if (importTab === 'file') {
      if (!importFile) {
        toast.error('Vui lòng chọn tệp');
        return;
      }

      try {
        const text = await importFile.text();
        const json = JSON.parse(text);
        if (!Array.isArray(json)) {
          toast.error('JSON không hợp lệ: Gốc phải là một mảng');
          return;
        }
        importMutation.mutate({ data: json });
      } catch (e) {
        toast.error('Không thể phân tích tệp JSON');
      }
    } else {
      if (!importManual.trim()) {
        toast.error('Vui lòng nhập JSON');
        return;
      }
      try {
        const json = JSON.parse(importManual);
        if (!Array.isArray(json)) {
          toast.error('JSON không hợp lệ: Gốc phải là một mảng');
          return;
        }
        importMutation.mutate({ data: json });
      } catch (e) {
        toast.error('JSON không hợp lệ');
      }
    }
  };

  const handleExport = () => {
    if (!items || items.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collection?.name || 'vocabulary-collection'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/vocabulary-collections">
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
            <CardTitle>Mục từ vựng</CardTitle>
            <CardDescription>{collection?.itemCount || 0} mục trong bộ sưu tập này</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <IconDownload className="mr-2 h-4 w-4" />
              Xuất JSON
            </Button>
            <Button onClick={() => setImportDialogOpen(true)}>
              <IconFileUpload className="mr-2 h-4 w-4" />
              Nhập từ JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Giản thể</TableHead>
                  <TableHead>Bính âm</TableHead>
                  <TableHead>Bộ thủ</TableHead>
                  <TableHead>Nghĩa</TableHead>
                  <TableHead className="w-[100px]">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map(item => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium text-lg">{item.simplified}</TableCell>
                    <TableCell>{item.pinyin}</TableCell>
                    <TableCell className="text-lg">{item.radical}</TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="flex flex-wrap gap-1">
                        {item.meanings?.slice(0, 2).map((meaning, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {meaning}
                          </Badge>
                        ))}
                        {(item.meanings?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.meanings!.length - 2} thêm
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" onClick={() => setSelectedItem(item)}>
                        <IconEye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Chưa có mục từ vựng nào. Nhập từ JSON để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VocabularyDetailDialog
        item={selectedItem}
        collectionId={collectionId}
        open={!!selectedItem}
        onOpenChange={open => !open && setSelectedItem(null)}
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nhập từ vựng</DialogTitle>
          </DialogHeader>

          <Tabs value={importTab} onValueChange={setImportTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url">
                <IconLink className="mr-2 h-4 w-4" /> URL
              </TabsTrigger>
              <TabsTrigger value="file">
                <IconFileUpload className="mr-2 h-4 w-4" /> Tệp
              </TabsTrigger>
              <TabsTrigger value="manual">
                <IconClipboard className="mr-2 h-4 w-4" /> Thủ công
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="import-url">URL JSON</Label>
                <Input
                  id="import-url"
                  placeholder="https://example.com/vocabulary.json"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Nhập URL đến tệp JSON chứa dữ liệu từ vựng.</p>
              </div>
            </TabsContent>

            <TabsContent value="file" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="import-file">Tải tệp JSON lên</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">Chọn tệp JSON từ máy tính của bạn.</p>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="import-manual">Dán JSON</Label>
                <Textarea
                  id="import-manual"
                  className="font-mono text-xs"
                  rows={10}
                  placeholder='[{"simplified": "...", ...}]'
                  value={importManual}
                  onChange={e => setImportManual(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Dán nội dung JSON trực tiếp vào đây.</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? 'Đang nhập...' : 'Nhập'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
