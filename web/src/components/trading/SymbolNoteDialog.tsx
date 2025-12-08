"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type SymbolNoteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    symbol: string | null;
    watchlistId: string | null;
};

export function SymbolNoteDialog({
    open,
    onOpenChange,
    symbol,
    watchlistId,
}: SymbolNoteDialogProps) {
    const { updateSymbolNotes, getActiveWatchlist } = useWatchlistSync();
    const [note, setNote] = useState("");

    // Load existing note when dialog opens
    useEffect(() => {
        if (open && symbol && watchlistId) {
            const watchlist = getActiveWatchlist();
            const item = watchlist?.items.find((i) => i.symbol === symbol);
            setNote(item?.notes || "");
        }
    }, [open, symbol, watchlistId, getActiveWatchlist]);

    const handleSave = async () => {
        if (symbol && watchlistId) {
            await updateSymbolNotes(watchlistId, symbol, note.trim());
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Note for {symbol}</DialogTitle>
                    <DialogDescription>
                        Add notes, trading ideas, or reminders for this symbol
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="note">Notes</Label>
                        <Textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g., Watching for breakout above $150, support at $140..."
                            rows={6}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Note</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
