"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VocabularyItem } from "@/lib/types/models/vocabulary-collection";
import { Badge } from "@/components/ui/badge";

interface VocabularyDetailDialogProps {
  item: VocabularyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VocabularyDetailDialog({ item, open, onOpenChange }: VocabularyDetailDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
                  <span className="text-sm text-foreground">{item.radical || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm font-medium">Frequency</span>
                  <span className="text-sm text-foreground">{item.frequency || "-"}</span>
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
                  <Badge key={i} variant="outline">{p}</Badge>
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
                  <Badge key={i} variant="outline">{c}</Badge>
                ))}
                {(!item.classifiers || item.classifiers.length === 0) && (
                  <span className="text-sm text-muted-foreground italic">-</span>
                )}
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
