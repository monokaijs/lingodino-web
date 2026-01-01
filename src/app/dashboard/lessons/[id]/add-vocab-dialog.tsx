'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';

async function fetchVocabCollections() {
  const res = await fetch('/api/vocabulary-collections?limit=100');
  const json = await res.json();
  return json.data;
}

async function fetchVocabItems(collectionId: string, search: string) {
  if (!collectionId) return [];
  const res = await fetch(`/api/vocabulary-collections/${collectionId}/items?limit=100&search=${search}`);
  const json = await res.json();
  return json.data;
}

interface AddVocabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (selectedIds: string[]) => void;
}

export function AddVocabDialog({ open, onOpenChange, onAdd }: AddVocabDialogProps) {
  const [selectedCol, setSelectedCol] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: collections = [] } = useQuery({
    queryKey: ['vocab-cols'],
    queryFn: fetchVocabCollections,
    enabled: open,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['vocab-items', selectedCol, search],
    queryFn: () => fetchVocabItems(selectedCol, search),
    enabled: !!selectedCol,
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleAdd = () => {
    onAdd(selectedIds);
    onOpenChange(false);
    setSelectedIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm từ vựng</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedCol} onValueChange={setSelectedCol}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn bộ từ vựng" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((c: any) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="h-[300px] border rounded-md p-2 overflow-y-auto space-y-2">
            {items.map((item: any) => (
              <div key={item._id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                <Checkbox
                  id={item._id}
                  checked={selectedIds.includes(item._id)}
                  onCheckedChange={() => toggleSelection(item._id)}
                />
                <label htmlFor={item._id} className="flex-1 cursor-pointer">
                  <span className="font-bold">{item.simplified}</span>
                  <span className="ml-2 text-sm text-muted-foreground">({item.pinyin})</span>
                  <span className="ml-2 text-sm text-gray-500">{item.meanings[0]}</span>
                </label>
              </div>
            ))}
            {items.length === 0 && <div className="text-center text-muted-foreground py-8">Không tìm thấy mục nào</div>}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleAdd} disabled={selectedIds.length === 0}>
              Thêm đã chọn ({selectedIds.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
