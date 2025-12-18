"use client";

import { useState } from "react";
import { useWatchlistSync } from "@/hooks/useWatchlistSync";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    Download,
    Upload,
    Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type WatchlistManagementDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function WatchlistManagementDialog({
    open,
    onOpenChange,
}: WatchlistManagementDialogProps) {
    const {
        watchlists,
        activeWatchlistId,
        createWatchlist,
        deleteWatchlist,
        renameWatchlist,
        setActiveWatchlist,
        importSymbols,
        addSymbol,
    } = useWatchlistSync();

    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [addingSymbolId, setAddingSymbolId] = useState<string | null>(null);
    const [symbolInput, setSymbolInput] = useState("");

    const handleCreate = async () => {
        if (newName.trim()) {
            await createWatchlist(newName.trim());
            setNewName("");
            setIsCreating(false);
        }
    };

    const handleRename = async (id: string) => {
        if (editName.trim()) {
            await renameWatchlist(id, editName.trim());
            setEditingId(null);
            setEditName("");
        }
    };

    const handleDelete = async () => {
        if (deleteId) {
            await deleteWatchlist(deleteId);
            setDeleteId(null);
        }
    };

    const handleIndividualAdd = async (watchlistId: string) => {
        if (symbolInput.trim()) {
            await addSymbol(watchlistId, symbolInput.trim().toUpperCase());
            setSymbolInput("");
            setAddingSymbolId(null);
        }
    };

    const handleExport = (watchlistId: string) => {
        const watchlist = watchlists.find((w) => w.id === watchlistId);
        if (!watchlist) return;

        const csv = [
            "Symbol,Added At,Notes",
            ...watchlist.items.map(
                (item) =>
                    `${item.symbol},${item.addedAt},"${item.notes?.replace(/"/g, '""') || ""}"`
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${watchlist.name.replace(/\s+/g, "_")}_watchlist.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (watchlistId: string) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv,.txt";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const text = await file.text();
            const lines = text.split("\n").slice(1); // Skip header
            const symbols = lines
                .map((line) => {
                    const match = line.match(/^([A-Z0-9]+)/);
                    return match ? match[1] : null;
                })
                .filter((s): s is string => s !== null);

            if (symbols.length > 0) {
                await importSymbols(watchlistId, symbols);
            }
        };
        input.click();
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Manage Watchlists</DialogTitle>
                        <DialogDescription>
                            Create, edit, and organize your watchlists
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[400px] pr-4">
                        <div className="space-y-2">
                            {watchlists.map((watchlist) => (
                                <div key={watchlist.id} className="space-y-1">
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 p-3 rounded-lg border",
                                            activeWatchlistId === watchlist.id
                                                ? "border-primary bg-accent"
                                                : "border-border"
                                        )}
                                    >
                                        {editingId === watchlist.id ? (
                                            <>
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleRename(watchlist.id);
                                                        if (e.key === "Escape") setEditingId(null);
                                                    }}
                                                    className="flex-1"
                                                    autoFocus
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleRename(watchlist.id)}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <div
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() => {
                                                        setActiveWatchlist(watchlist.id);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {activeWatchlistId === watchlist.id && (
                                                            <Star className="h-3 w-3 fill-primary text-primary" />
                                                        )}
                                                        <span className="font-medium">{watchlist.name}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {watchlist.items.length} symbol
                                                        {watchlist.items.length !== 1 ? "s" : ""}
                                                    </span>
                                                </div>

                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setAddingSymbolId(watchlist.id);
                                                        setSymbolInput("");
                                                    }}
                                                    title="Add Symbol"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditingId(watchlist.id);
                                                        setEditName(watchlist.name);
                                                    }}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleExport(watchlist.id)}
                                                    title="Export to CSV"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleImport(watchlist.id)}
                                                    title="Import from CSV"
                                                >
                                                    <Upload className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setDeleteId(watchlist.id)}
                                                    disabled={watchlists.length === 1}
                                                    title={
                                                        watchlists.length === 1
                                                            ? "Cannot delete the last watchlist"
                                                            : "Delete watchlist"
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                    {addingSymbolId === watchlist.id && (
                                        <div className="flex items-center gap-2 p-2 mx-4 rounded-lg border border-dashed bg-accent/30">
                                            <Input
                                                value={symbolInput}
                                                onChange={(e) => setSymbolInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleIndividualAdd(watchlist.id);
                                                    if (e.key === "Escape") setAddingSymbolId(null);
                                                }}
                                                placeholder="Symbol (e.g. AAPL)..."
                                                className="flex-1 h-8 text-sm"
                                                autoFocus
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => handleIndividualAdd(watchlist.id)}
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => setAddingSymbolId(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Create New Watchlist */}
                            {isCreating ? (
                                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed">
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleCreate();
                                            if (e.key === "Escape") {
                                                setIsCreating(false);
                                                setNewName("");
                                            }
                                        }}
                                        placeholder="Watchlist name..."
                                        className="flex-1"
                                        autoFocus
                                    />
                                    <Button size="icon" variant="ghost" onClick={handleCreate}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewName("");
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full border-dashed"
                                    onClick={() => setIsCreating(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New Watchlist
                                </Button>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Watchlist?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the watchlist &quot;
                            {watchlists.find((w) => w.id === deleteId)?.name}&quot; and all its
                            symbols. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
