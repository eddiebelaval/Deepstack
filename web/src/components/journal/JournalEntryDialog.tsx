'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from './RichTextEditor';
import { type JournalEntry, type EmotionType } from '@/lib/stores/journal-store';
import { Loader2 } from 'lucide-react';

const EMOTIONS: { value: EmotionType; label: string; emoji: string }[] = [
    { value: 'confident', label: 'Confident', emoji: '💪' },
    { value: 'anxious', label: 'Anxious', emoji: '😰' },
    { value: 'greedy', label: 'Greedy', emoji: '🤑' },
    { value: 'fearful', label: 'Fearful', emoji: '😨' },
    { value: 'fomo', label: 'FOMO', emoji: '😱' },
    { value: 'regret', label: 'Regret', emoji: '😔' },
    { value: 'relief', label: 'Relief', emoji: '😌' },
    { value: 'neutral', label: 'Neutral', emoji: '😐' },
    { value: 'excited', label: 'Excited', emoji: '🤩' },
    { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
];

interface JournalEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId?: string;
    existingEntry?: JournalEntry;
    onAddEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<JournalEntry>;
    onUpdateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
}

export function JournalEntryDialog({
    open,
    onOpenChange,
    editingId,
    existingEntry,
    onAddEntry,
    onUpdateEntry,
}: JournalEntryDialogProps) {
    const [isSaving, setIsSaving] = useState(false);

    const [symbol, setSymbol] = useState(existingEntry?.symbol || '');
    const [tradeDate, setTradeDate] = useState(existingEntry?.tradeDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
    const [direction, setDirection] = useState<'long' | 'short'>(existingEntry?.direction || 'long');
    const [entryPrice, setEntryPrice] = useState(existingEntry?.entryPrice?.toString() || '');
    const [exitPrice, setExitPrice] = useState(existingEntry?.exitPrice?.toString() || '');
    const [quantity, setQuantity] = useState(existingEntry?.quantity?.toString() || '');
    const [emotionAtEntry, setEmotionAtEntry] = useState<EmotionType>(existingEntry?.emotionAtEntry || 'neutral');
    const [emotionAtExit, setEmotionAtExit] = useState<EmotionType | undefined>(existingEntry?.emotionAtExit);
    const [notes, setNotes] = useState(existingEntry?.notes || '');
    const [lessonsLearned, setLessonsLearned] = useState(existingEntry?.lessonsLearned || '');

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            const entry = {
                symbol: symbol.toUpperCase(),
                tradeDate,
                direction,
                entryPrice: parseFloat(entryPrice) || 0,
                exitPrice: exitPrice ? parseFloat(exitPrice) : undefined,
                quantity: parseFloat(quantity) || 0,
                emotionAtEntry,
                emotionAtExit,
                notes,
                lessonsLearned,
            };

            if (editingId) {
                await onUpdateEntry(editingId, entry);
            } else {
                await onAddEntry(entry);
            }

            onOpenChange(false);
            // Reset form
            setSymbol('');
            setEntryPrice('');
            setExitPrice('');
            setQuantity('');
            setNotes('');
            setLessonsLearned('');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Edit' : 'New'} Journal Entry</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Trade Details Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="symbol">Symbol</Label>
                            <Input
                                id="symbol"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                placeholder="AAPL"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tradeDate">Date</Label>
                            <Input
                                id="tradeDate"
                                type="date"
                                value={tradeDate}
                                onChange={(e) => setTradeDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="direction">Direction</Label>
                            <Select value={direction} onValueChange={(v) => setDirection(v as 'long' | 'short')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="long">Long 📈</SelectItem>
                                    <SelectItem value="short">Short 📉</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="100"
                            />
                        </div>
                    </div>

                    {/* Price Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="entryPrice">Entry Price</Label>
                            <Input
                                id="entryPrice"
                                type="number"
                                step="0.01"
                                value={entryPrice}
                                onChange={(e) => setEntryPrice(e.target.value)}
                                placeholder="150.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exitPrice">Exit Price (optional)</Label>
                            <Input
                                id="exitPrice"
                                type="number"
                                step="0.01"
                                value={exitPrice}
                                onChange={(e) => setExitPrice(e.target.value)}
                                placeholder="155.00"
                            />
                        </div>
                    </div>

                    {/* Emotion Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Emotion at Entry</Label>
                            <Select value={emotionAtEntry} onValueChange={(v) => setEmotionAtEntry(v as EmotionType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EMOTIONS.map((e) => (
                                        <SelectItem key={e.value} value={e.value}>
                                            {e.emoji} {e.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Emotion at Exit (optional)</Label>
                            <Select value={emotionAtExit || ''} onValueChange={(v) => setEmotionAtExit(v as EmotionType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EMOTIONS.map((e) => (
                                        <SelectItem key={e.value} value={e.value}>
                                            {e.emoji} {e.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Trade Notes</Label>
                        <RichTextEditor
                            content={notes}
                            onChange={setNotes}
                            placeholder="What was your reasoning for this trade? What were the market conditions?"
                        />
                    </div>

                    {/* Lessons Learned */}
                    <div className="space-y-2">
                        <Label>Lessons Learned</Label>
                        <RichTextEditor
                            content={lessonsLearned}
                            onChange={setLessonsLearned}
                            placeholder="What did you learn from this trade? What would you do differently?"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={!symbol || !entryPrice || isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>{editingId ? 'Update' : 'Save'} Entry</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
