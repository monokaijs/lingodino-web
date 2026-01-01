import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { IconVideo, IconLoader2, IconMusic, IconPhoto } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GenerateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onSuccess: () => void;
}

export function GenerateVideoDialog({ open, onOpenChange, conversationId, onSuccess }: GenerateVideoDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [introImageFile, setIntroImageFile] = useState<File | null>(null);
  const [outroVideoFile, setOutroVideoFile] = useState<File | null>(null);
  const [offset, setOffset] = useState('2.0');
  const [resolution, setResolution] = useState('1280x720');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error('Vui lòng tải ảnh lên');
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      if (musicFile) {
        formData.append('music', musicFile);
      }
      if (introImageFile) formData.append('introImage', introImageFile);
      if (outroVideoFile) formData.append('outroVideo', outroVideoFile);

      formData.append('offset', offset);
      const [width, height] = resolution.split('x');
      formData.append('width', width);
      formData.append('height', height);

      const response = await fetch(`/api/conversations/${conversationId}/generate-video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.message || 'Tạo video thất bại');
      }

      toast.success('Tạo video thành công!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo Video</DialogTitle>
          <DialogDescription>
            Tạo video từ âm thanh hội thoại. Tải ảnh nền và nhạc nền (tùy chọn).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Ảnh nền (Bắt buộc)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={e => setImageFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
            {imageFile && <p className="text-xs text-muted-foreground">Đã chọn: {imageFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="intro-upload">Ảnh mở đầu (Tùy chọn)</Label>
            <Input
              id="intro-upload"
              type="file"
              accept="image/*"
              onChange={e => setIntroImageFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            {introImageFile && <p className="text-xs text-muted-foreground">Đã chọn: {introImageFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="outro-upload">Video kết thúc (Tùy chọn)</Label>
            <Input
              id="outro-upload"
              type="file"
              accept="video/*"
              onChange={e => setOutroVideoFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            {outroVideoFile && <p className="text-xs text-muted-foreground">Đã chọn: {outroVideoFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Độ phân giải đầu ra</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn độ phân giải" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1280x720">1280x720 (Landscape HD)</SelectItem>
                <SelectItem value="1920x1080">1920x1080 (Landscape FHD)</SelectItem>
                <SelectItem value="720x1280">720x1280 (Portrait HD)</SelectItem>
                <SelectItem value="1080x1920">1080x1920 (Portrait FHD)</SelectItem>
                <SelectItem value="1080x1080">1080x1080 (Square)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="music-upload">Nhạc nền (Tùy chọn)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="music-upload"
                type="file"
                accept="audio/*"
                onChange={e => setMusicFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
            {musicFile && <p className="text-xs text-muted-foreground">Đã chọn: {musicFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="offset">Thời lượng mở đầu (Giây)</Label>
            <Input
              id="offset"
              type="number"
              step="0.1"
              min="0"
              value={offset}
              onChange={e => setOffset(e.target.value)}
              placeholder="2.0"
            />
            <p className="text-xs text-muted-foreground">Ảnh mở đầu sẽ chuyển sang video. Mặc định 2 giây.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Hủy
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <IconVideo className="mr-2 h-4 w-4" />
                  Tạo Video
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
