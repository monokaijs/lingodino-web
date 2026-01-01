import {useState} from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {IconVideo, IconLoader2, IconMusic, IconPhoto} from '@tabler/icons-react';
import {toast} from 'sonner';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

interface GenerateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onSuccess: () => void;
}

export function GenerateVideoDialog({open, onOpenChange, conversationId, onSuccess}: GenerateVideoDialogProps) {
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
      toast.error('Please upload an image');
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
        throw new Error(json.message || 'Failed to generate video');
      }

      toast.success('Video generated successfully!');
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
          <DialogTitle>Generate Video</DialogTitle>
          <DialogDescription>
            Create a video from your conversation audio. Upload an image to loop and optional background music.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Background Image (Required)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={e => setImageFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
            {imageFile && <p className="text-xs text-muted-foreground">Selected: {imageFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="intro-upload">Intro Image (Optional)</Label>
            <Input
              id="intro-upload"
              type="file"
              accept="image/*"
              onChange={e => setIntroImageFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            {introImageFile && <p className="text-xs text-muted-foreground">Selected: {introImageFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="outro-upload">Outro Video (Optional)</Label>
            <Input
              id="outro-upload"
              type="file"
              accept="video/*"
              onChange={e => setOutroVideoFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            {outroVideoFile && <p className="text-xs text-muted-foreground">Selected: {outroVideoFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Output Resolution</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger>
                <SelectValue placeholder="Select resolution" />
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
            <Label htmlFor="music-upload">Background Music (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="music-upload"
                type="file"
                accept="audio/*"
                onChange={e => setMusicFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
            {musicFile && <p className="text-xs text-muted-foreground">Selected: {musicFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="offset">Intro Duration (Seconds)</Label>
            <Input
              id="offset"
              type="number"
              step="0.1"
              min="0"
              value={offset}
              onChange={e => setOffset(e.target.value)}
              placeholder="2.0"
            />
            <p className="text-xs text-muted-foreground">Intro Image will fade to video. Default 2 seconds.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <IconVideo className="mr-2 h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
