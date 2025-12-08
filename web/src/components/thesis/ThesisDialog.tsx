'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { type ThesisEntry } from '@/lib/stores/thesis-store';
import { X, Plus, Loader2 } from 'lucide-react';

const TIMEFRAMES = ['Intraday', '1-3 Days', '1 Week', '2-4 Weeks', '1-3 Months', '3+ Months'];

interface ThesisDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId?: string;
    existingThesis?: ThesisEntry;
    onAddThesis: (thesis: Omit<ThesisEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ThesisEntry>;
    onUpdateThesis: (id: string, updates: Partial<ThesisEntry>) => Promise<void>;
}

export function ThesisDialog({
    open,
    onOpenChange,
    editingId,
    existingThesis,
    onAddThesis,
    onUpdateThesis,
}: ThesisDialogProps) {
    const [isSaving, setIsSaving] = useState(false);

    const [title, setTitle] = useState(existingThesis?.title || '');
    const [symbol, setSymbol] = useState(existingThesis?.symbol || '');
    const [hypothesis, setHypothesis] = useState(existingThesis?.hypothesis || '');
    const [timeframe, setTimeframe] = useState(existingThesis?.timeframe || '');
    const [entryTarget, setEntryTarget] = useState(existingThesis?.entryTarget?.toString() || '');
    const [exitTarget, setExitTarget] = useState(existingThesis?.exitTarget?.toString() || '');
    const [stopLoss, setStopLoss] = useState(existingThesis?.stopLoss?.toString() || '');
    const [keyConditions, setKeyConditions] = useState<string[]>(existingThesis?.keyConditions || []);
    const [newCondition, setNewCondition] = useState('');

    const handleAddCondition = () => {
        if (newCondition.trim()) {
            setKeyConditions([...keyConditions, newCondition.trim()]);
            setNewCondition('');
        }
    };

    const handleRemoveCondition = (index: number) => {
        setKeyConditions(keyConditions.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            const thesis = {
                title: title || `${symbol} Thesis`,
                symbol: symbol.toUpperCase(),
                hypothesis,
                timeframe,
                entryTarget: entryTarget ? parseFloat(entryTarget) : undefined,
                exitTarget: exitTarget ? parseFloat(exitTarget) : undefined,
                stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
                keyConditions,
                status: 'drafting' as const,
            };

            if (editingId) {
                await onUpdateThesis(editingId, thesis);
            } else {
                await onAddThesis(thesis);
            }

            onOpenChange(false);
            // Reset form
            setTitle('');
            setSymbol('');
            setHypothesis('');
            setTimeframe('');
            setEntryTarget('');
            setExitTarget('');
            setStopLoss('');
            setKeyConditions([]);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Edit' : 'New'} Thesis</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="symbol">Symbol *</Label>
                            <Input
                                id="symbol"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                placeholder="AAPL"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timeframe">Timeframe</Label>
                            <Select value={timeframe} onValueChange={setTimeframe}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select timeframe..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIMEFRAMES.map((tf) => (
                                        <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., AAPL Bullish on AI Catalyst"
                        />
                    </div>

                    {/* Hypothesis */}
                    <div className="space-y-2">
                        <Label htmlFor="hypothesis">Hypothesis *</Label>
                        <Textarea
                            id="hypothesis"
                            value={hypothesis}
                            onChange={(e) => setHypothesis(e.target.value)}
                            placeholder="What is your thesis? Why do you believe this trade will work?"
                            rows={4}
                        />
                    </div>

                    {/* Price Targets */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="entryTarget">Entry Target</Label>
                            <Input
                                id="entryTarget"
                                type="number"
                                step="0.01"
                                value={entryTarget}
                                onChange={(e) => setEntryTarget(e.target.value)}
                                placeholder="150.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exitTarget">Exit Target</Label>
                            <Input
                                id="exitTarget"
                                type="number"
                                step="0.01"
                                value={exitTarget}
                                onChange={(e) => setExitTarget(e.target.value)}
                                placeholder="165.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stopLoss">Stop Loss</Label>
                            <Input
                                id="stopLoss"
                                type="number"
                                step="0.01"
                                value={stopLoss}
                                onChange={(e) => setStopLoss(e.target.value)}
                                placeholder="145.00"
                            />
                        </div>
                    </div>

                    {/* Key Conditions */}
                    <div className="space-y-2">
                        <Label>Key Conditions</Label>
                        <p className="text-xs text-muted-foreground">What conditions must be true for this thesis to play out?</p>

                        <div className="flex gap-2">
                            <Input
                                value={newCondition}
                                onChange={(e) => setNewCondition(e.target.value)}
                                placeholder="e.g., Volume above 20M, RSI below 70"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCondition())}
                            />
                            <Button type="button" variant="outline" size="icon" onClick={handleAddCondition}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {keyConditions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {keyConditions.map((condition, i) => (
                                    <Badge key={i} variant="secondary" className="pl-2 pr-1 py-1">
                                        {condition}
                                        <button
                                            onClick={() => handleRemoveCondition(i)}
                                            className="ml-1 hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={!symbol || !hypothesis || isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>{editingId ? 'Update' : 'Create'} Thesis</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
