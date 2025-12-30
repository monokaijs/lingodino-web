"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { VocabularyCollection } from "@/lib/types/models/vocabulary-collection";
import { CollectionForm } from "./collection-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ApiResponse<T> {
    data: T;
    pagination?: any;
    code: number;
    message: string;
}

async function fetchCollections(): Promise<VocabularyCollection[]> {
    const res = await fetch("/api/vocabulary-collections");
    const json: ApiResponse<VocabularyCollection[]> = await res.json();
    if (json.code !== 200) throw new Error(json.message);
    return json.data;
}

async function deleteCollection(id: string): Promise<void> {
    const res = await fetch(`/api/vocabulary-collections/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.message);
}

export default function VocabularyCollectionsPage() {
    const queryClient = useQueryClient();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<VocabularyCollection | null>(null);

    const { data: collections, isLoading } = useQuery({
        queryKey: ["vocabulary-collections"],
        queryFn: fetchCollections,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCollection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vocabulary-collections"] });
            toast.success("Collection deleted successfully");
            setDeleteId(null);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handleCreate = () => {
        setEditingCollection(null);
        setDialogOpen(true);
    };

    const handleEdit = (collection: VocabularyCollection) => {
        setEditingCollection(collection);
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingCollection(null);
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Vocabulary Collections</CardTitle>
                    <Button onClick={handleCreate}>
                        <IconPlus className="mr-2 h-4 w-4" />
                        Add Collection
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Collection</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {collections?.map((collection) => (
                                    <TableRow key={collection._id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 rounded-md">
                                                    <AvatarImage src={collection.photo} alt={collection.name} />
                                                    <AvatarFallback className="rounded-md">{collection.name[0]?.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <Link href={`/dashboard/vocabulary-collections/${collection._id}`} className="font-medium hover:underline">
                                                    {collection.name}
                                                </Link>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[300px] truncate">{collection.description}</TableCell>
                                        <TableCell>{collection.itemCount}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(collection)}>
                                                    <IconEdit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(collection._id)}>
                                                    <IconTrash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {collections?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            No collections found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCollection ? "Edit Collection" : "New Collection"}</DialogTitle>
                    </DialogHeader>
                    <CollectionForm collection={editingCollection} onSuccess={handleDialogClose} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this collection? All vocabulary items will be deleted. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
