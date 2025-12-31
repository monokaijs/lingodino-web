'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { VocabularyItem, VocabularyExample } from '@/lib/types/models/vocabulary-collection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { IconPlus, IconTrash, IconDeviceFloppy, IconBook } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

interface VocabularyDetailDialogProps {
  item: VocabularyItem | null
  collectionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function updateVocabularyItem(
  collectionId: string,
  itemId: string,
  data: Partial<VocabularyItem>,
): Promise<VocabularyItem> {
  const res = await fetch(`/api/vocabulary-collections/${collectionId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data
}

export function VocabularyDetailDialog({ item, collectionId, open, onOpenChange }: VocabularyDetailDialogProps) {
  const queryClient = useQueryClient()
  const [examples, setExamples] = useState<VocabularyExample[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (item) {
      setExamples(item.examples || [])
      setHasChanges(false)
    }
  }, [item])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<VocabularyItem>) => updateVocabularyItem(collectionId, item!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary-items', collectionId] })
      toast.success('Examples updated successfully')
      setHasChanges(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleAddExample = () => {
    setExamples([...examples, { text: '', meaning: '', explanation: '' }])
    setHasChanges(true)
  }

  const handleRemoveExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleExampleChange = (index: number, field: keyof VocabularyExample, value: string) => {
    const newExamples = [...examples]
    newExamples[index] = { ...newExamples[index], [field]: value }
    setExamples(newExamples)
    setHasChanges(true)
  }

  const handleSave = () => {
    // Filter out empty examples
    const validExamples = examples.filter(ex => ex.text.trim() || ex.meaning.trim() || ex.explanation.trim())
    updateMutation.mutate({ examples: validExamples })
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Vocabulary Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Main Character Display */}
          <div className="flex items-end justify-center gap-4 text-center border-b pb-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Simplified</p>
              <div className="text-6xl font-bold text-primary">{item.simplified}</div>
            </div>
            {item.traditional && item.traditional !== item.simplified && (
              <div className="text-muted-foreground/60">
                <p className="text-xs mb-1">Traditional</p>
                <div className="text-4xl font-medium">{item.traditional}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pronunciation */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Pronunciation</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm font-medium">Pinyin</span>
                  <span className="text-sm text-foreground">{item.pinyin}</span>
                </div>
                {item.pinyinNumeric && (
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-sm font-medium">Numeric</span>
                    <span className="text-sm text-muted-foreground">{item.pinyinNumeric}</span>
                  </div>
                )}
                {item.bopomofo && (
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-sm font-medium">Bopomofo</span>
                    <span className="text-sm text-muted-foreground">{item.bopomofo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Info</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm font-medium">Radical</span>
                  <span className="text-sm text-foreground">{item.radical || '-'}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm font-medium">Frequency</span>
                  <span className="text-sm text-foreground">{item.frequency || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meanings */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Meanings</h3>
            <div className="flex flex-wrap gap-2">
              {item.meanings?.map((meaning, i) => (
                <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                  {meaning}
                </Badge>
              ))}
              {(!item.meanings || item.meanings.length === 0) && (
                <span className="text-sm text-muted-foreground italic">No meanings available</span>
              )}
            </div>
          </div>

          {/* POS & Classifiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Part of Speech</h3>
              <div className="flex flex-wrap gap-2">
                {item.pos?.map((p, i) => (
                  <Badge key={i} variant="outline">
                    {p}
                  </Badge>
                ))}
                {(!item.pos || item.pos.length === 0) && (
                  <span className="text-sm text-muted-foreground italic">-</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Classifiers</h3>
              <div className="flex flex-wrap gap-2">
                {item.classifiers?.map((c, i) => (
                  <Badge key={i} variant="outline">
                    {c}
                  </Badge>
                ))}
                {(!item.classifiers || item.classifiers.length === 0) && (
                  <span className="text-sm text-muted-foreground italic">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Examples Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <IconBook className="h-4 w-4" />
                Examples
              </h3>
              <Button variant="outline" size="sm" onClick={handleAddExample}>
                <IconPlus className="h-4 w-4 mr-1" />
                Add Example
              </Button>
            </div>

            {examples.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No examples yet</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={handleAddExample}>
                  <IconPlus className="h-4 w-4 mr-1" />
                  Add your first example
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className={cn(
                      'relative space-y-3 p-4 rounded-lg border bg-muted/30',
                      'transition-all hover:border-primary/30',
                    )}
                  >
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveExample(index)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 pr-8">
                      <Label htmlFor={`example-text-${index}`} className="text-xs text-muted-foreground">
                        Example Sentence
                      </Label>
                      <Input
                        id={`example-text-${index}`}
                        placeholder="Enter example sentence (e.g., 你好！)"
                        value={example.text}
                        onChange={e => handleExampleChange(index, 'text', e.target.value)}
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`example-meaning-${index}`} className="text-xs text-muted-foreground">
                        Meaning
                      </Label>
                      <Input
                        id={`example-meaning-${index}`}
                        placeholder="Enter meaning (e.g., Hello!)"
                        value={example.meaning}
                        onChange={e => handleExampleChange(index, 'meaning', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`example-explanation-${index}`} className="text-xs text-muted-foreground">
                        Explanation
                      </Label>
                      <Textarea
                        id={`example-explanation-${index}`}
                        placeholder="Explain the usage or context..."
                        value={example.explanation}
                        onChange={e => handleExampleChange(index, 'explanation', e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {hasChanges && (
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <IconDeviceFloppy className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Examples'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
