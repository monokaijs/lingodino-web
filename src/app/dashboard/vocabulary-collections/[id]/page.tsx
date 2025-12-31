"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IconArrowLeft, IconDownload, IconEye } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { VocabularyCollection, VocabularyItem } from "@/lib/types/models/vocabulary-collection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VocabularyDetailDialog } from "./vocabulary-detail-dialog";

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

async function importVocabulary(id: string, url: string): Promise<{ count: number }> {
  const res = await fetch(`/api/vocabulary-collections/${id}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
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
  const [importUrl, setImportUrl] = useState("");
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);

  const { data: collection } = useQuery({
    queryKey: ["vocabulary-collection", collectionId],
    queryFn: () => fetchCollection(collectionId),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["vocabulary-items", collectionId],
    queryFn: () => fetchItems(collectionId),
  });

  const importMutation = useMutation({
    mutationFn: (url: string) => importVocabulary(collectionId, url),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary-collection", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-items", collectionId] });
      toast.success(`Successfully imported ${data.count} vocabulary items`);
      setImportDialogOpen(false);
      setImportUrl("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleImport = () => {
    if (!importUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    importMutation.mutate(importUrl);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/vocabulary-collections"><IconArrowLeft className="h-4 w-4" /></Link>
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
            <CardTitle>Vocabulary Items</CardTitle>
            <CardDescription>{collection?.itemCount || 0} items in this collection</CardDescription>
          </div>
          <Button onClick={() => setImportDialogOpen(true)}>
            <IconDownload className="mr-2 h-4 w-4" />
            Import from JSON
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Simplified</TableHead>
                  <TableHead>Pinyin</TableHead>
                  <TableHead>Radical</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
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
                            +{item.meanings!.length - 2} more
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
                      No vocabulary items yet. Import from JSON to get started.
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
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Vocabulary from JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-url">JSON URL</Label>
              <Input
                id="import-url"
                placeholder="https://example.com/vocabulary.json"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to a JSON file containing vocabulary data (e.g., HSK wordlists)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
