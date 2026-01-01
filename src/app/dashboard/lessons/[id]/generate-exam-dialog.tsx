import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {useState} from 'react';
import {IconWand, IconLoader2} from '@tabler/icons-react';
import {toast} from 'sonner';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {GenerateExamRequest} from '@/lib/types/api/generate-exam';

interface GenerateExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonName?: string;
}

export function GenerateExamDialog({open, onOpenChange, lessonId, lessonName}: GenerateExamDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(`Exam for ${lessonName || 'Lesson'}`);
  const [instructions, setInstructions] = useState('');
  const [counts, setCounts] = useState({
    multipleChoice: 5,
    fillInBlank: 2,
    matching: 2,
    trueFalse: 0,
    shortAnswer: 0,
  });

  // Total questions
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateExamRequest) => {
      const res = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.code !== 200) throw new Error(json.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['exams', lessonId]});
      toast.success('Exam generated successfully!');
      onOpenChange(false);
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  const handleSubmit = () => {
    generateMutation.mutate({
      lessonId,
      name,
      instructions,
      questionCounts: counts,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconWand className="h-5 w-5 text-purple-500" />
            Generate Exam with AI
          </DialogTitle>
          <DialogDescription>
            Automatically create an exam based on this lesson's content (Conversation, Vocabulary, Grammar).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Exam Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="E.g., Focus on HSK 3 vocabulary, ensure questions are tricky..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
            />
          </div>

          <div className="grid gap-3">
            <Label>Question Distribution (Total: {total})</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Multiple Choice</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.multipleChoice}
                  onChange={e => setCounts(c => ({...c, multipleChoice: parseInt(e.target.value) || 0}))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fill in Blank</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.fillInBlank}
                  onChange={e => setCounts(c => ({...c, fillInBlank: parseInt(e.target.value) || 0}))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Matching</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.matching}
                  onChange={e => setCounts(c => ({...c, matching: parseInt(e.target.value) || 0}))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">True/False</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.trueFalse}
                  onChange={e => setCounts(c => ({...c, trueFalse: parseInt(e.target.value) || 0}))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Short Answer</Label>
                <Input
                  type="number"
                  min={0}
                  value={counts.shortAnswer}
                  onChange={e => setCounts(c => ({...c, shortAnswer: parseInt(e.target.value) || 0}))}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={generateMutation.isPending || total === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generateMutation.isPending && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
