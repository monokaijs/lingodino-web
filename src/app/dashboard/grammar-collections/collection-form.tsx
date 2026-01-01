'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GrammarCollection } from '@/lib/types/models/grammar';
import { useState } from 'react';
import { IconUpload } from '@tabler/icons-react';

const collectionSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc'),
  description: z.string().optional(),
  photo: z.string().optional(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

interface CollectionFormProps {
  collection?: GrammarCollection | null;
  onSuccess: () => void;
}

async function createCollection(data: CollectionFormData): Promise<GrammarCollection> {
  const res = await fetch('/api/grammar-collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function updateCollection(id: string, data: CollectionFormData): Promise<GrammarCollection> {
  const res = await fetch(`/api/grammar-collections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data;
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message);
  return json.data.url;
}

export function CollectionForm({ collection, onSuccess }: CollectionFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!collection;
  const [uploading, setUploading] = useState(false);

  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: collection?.name || '',
      description: collection?.description || '',
      photo: collection?.photo || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CollectionFormData) =>
      isEditing ? updateCollection(collection._id, data) : createCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grammar-collections'] });
      toast.success(isEditing ? 'Cập nhật bộ ngữ pháp thành công' : 'Tạo bộ ngữ pháp thành công');
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: CollectionFormData) => {
    mutation.mutate(data);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadFile(file);
      form.setValue('photo', url);
      toast.success('Tải ảnh lên thành công');
    } catch (error: any) {
      toast.error(error.message || 'Tải ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  const photoUrl = form.watch('photo');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên</FormLabel>
              <FormControl>
                <Input placeholder="Tên bộ ngữ pháp" {...field} />
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
              <FormLabel>Mô tả</FormLabel>
              <FormControl>
                <Textarea placeholder="Mô tả bộ ngữ pháp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="photo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ảnh</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {photoUrl && <img src={photoUrl} alt="Collection" className="w-20 h-20 object-cover rounded-md" />}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      disabled={uploading}
                    >
                      <IconUpload className="mr-2 h-4 w-4" />
                      {uploading ? 'Đang tải lên...' : 'Tải ảnh lên'}
                    </Button>
                  </div>
                  <Input placeholder="Hoặc nhập URL ảnh" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end">
          <Button type="submit" disabled={mutation.isPending || uploading}>
            {mutation.isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
