'use client';

import React, { useState } from 'react';
import { type JournalEntry } from '@/lib/stores/journal-store';
import { type ThesisEntry } from '@/lib/stores/thesis-store';
import { useJournalSync } from '@/hooks/useJournalSync';
import { useThesisSync } from '@/hooks/useThesisSync';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JournalEntryDialog } from './JournalEntryDialog';
import { Plus, TrendingUp, TrendingDown, Calendar, Trash2, Edit, ArrowLeft, Loader2, Cloud, CloudOff, Link2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMOTION_EMOJIS: Record<string, string> = {
    confident: '💪',
    anxious: '😰',
    greedy: '🤑',
    fearful: '😨',
    fomo: '😱',
    regret: '😔',
    relief: '😌',
    neutral: '😐',
    excited: '🤩',
    frustrated: '😤',
};

export function JournalList() {
    const { entries, addEntry, updateEntry, deleteEntry, isLoading, isOnline, error } = useJournalSync();
    const { theses, getThesisById } = useThesisSync();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | undefined>(undefined);

    const handleEdit = (id: string) => {
        setEditingId(id);
        setDialogOpen(true);
    };

    const handleNew = () => {
        setEditingId(undefined);
        setDialogOpen(true);
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = '/'}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Trade Journal</h1>
                        <p className="text-muted-foreground text-sm flex items-center gap-2">
                            Track your trades and learn from your patterns
                            {isOnline ? (
                                <span title="Synced with cloud">
                                    <Cloud className="h-4 w-4 text-green-500" />
                                </span>
                            ) : (
                                <span title="Using local storage">
                                    <CloudOff className="h-4 w-4 text-yellow-500" />
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <Button onClick={handleNew} disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4 mr-2" />
                    )}
                    New Entry
                </Button>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-500 text-sm">
                    {error}
                </div>
            )}

            {/* Entry List */}
            {entries.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No journal entries yet</p>
                        <p className="text-sm mt-1">Start documenting your trades to discover patterns</p>
                        <Button className="mt-4" onClick={handleNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Entry
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {entries.map((entry) => (
                        <JournalEntryCard
                            key={entry.id}
                            entry={entry}
                            linkedThesis={entry.thesisId ? getThesisById(entry.thesisId) : undefined}
                            onEdit={() => handleEdit(entry.id)}
                            onDelete={() => deleteEntry(entry.id)}
                        />
                    ))}
                </div>
            )}

            <JournalEntryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                editingId={editingId}
                existingEntry={editingId ? entries.find(e => e.id === editingId) : undefined}
                onAddEntry={addEntry}
                onUpdateEntry={updateEntry}
                activeTheses={theses}
            />
        </div>
    );
}

interface JournalEntryCardProps {
    entry: JournalEntry;
    linkedThesis?: ThesisEntry;
    onEdit: () => void;
    onDelete: () => void;
}

function JournalEntryCard({ entry, linkedThesis, onEdit, onDelete }: JournalEntryCardProps) {
    const isProfit = entry.pnl && entry.pnl > 0;
    const isLoss = entry.pnl && entry.pnl < 0;

    return (
        <Card className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-4">
                {/* Direction Icon */}
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    entry.direction === 'long' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                )}>
                    {entry.direction === 'long' ? (
                        <TrendingUp className="h-5 w-5" />
                    ) : (
                        <TrendingDown className="h-5 w-5" />
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{entry.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                            {entry.direction.toUpperCase()}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                            {new Date(entry.tradeDate).toLocaleDateString()}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>Entry: ${entry.entryPrice.toFixed(2)}</span>
                        {entry.exitPrice && <span>Exit: ${entry.exitPrice.toFixed(2)}</span>}
                        <span>Qty: {entry.quantity}</span>
                    </div>

                    {/* Emotions */}
                    <div className="flex items-center gap-2 text-sm">
                        <span>Entry: {EMOTION_EMOJIS[entry.emotionAtEntry]} {entry.emotionAtEntry}</span>
                        {entry.emotionAtExit && (
                            <span className="text-muted-foreground">
                                → Exit: {EMOTION_EMOJIS[entry.emotionAtExit]} {entry.emotionAtExit}
                            </span>
                        )}
                    </div>

                    {/* Linked Thesis Badge */}
                    {linkedThesis && (
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                <span className="font-medium">{linkedThesis.symbol}</span>
                                <span className="text-muted-foreground">|</span>
                                <span className="truncate max-w-[150px]">{linkedThesis.title}</span>
                            </Badge>
                        </div>
                    )}

                    {/* Notes Preview */}
                    {entry.notes && (
                        <div
                            className="mt-2 text-sm text-muted-foreground line-clamp-2 prose prose-sm prose-invert"
                            dangerouslySetInnerHTML={{ __html: entry.notes }}
                        />
                    )}

                    {/* Screenshot Thumbnails */}
                    {entry.screenshotUrls && entry.screenshotUrls.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <div className="flex gap-2 overflow-x-auto">
                                {entry.screenshotUrls.slice(0, 3).map((url, idx) => (
                                    <div
                                        key={idx}
                                        className="h-12 w-16 rounded overflow-hidden border bg-muted shrink-0"
                                    >
                                        <img
                                            src={url}
                                            alt={`Screenshot ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                                {entry.screenshotUrls.length > 3 && (
                                    <div className="h-12 w-12 rounded bg-muted border flex items-center justify-center text-xs text-muted-foreground shrink-0">
                                        +{entry.screenshotUrls.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* P&L */}
                {entry.pnl !== undefined && (
                    <div className={cn(
                        "text-right shrink-0",
                        isProfit && "text-green-500",
                        isLoss && "text-red-500"
                    )}>
                        <div className="font-bold text-lg">
                            {isProfit ? '+' : ''}${entry.pnl.toFixed(2)}
                        </div>
                        {entry.pnlPercent !== undefined && (
                            <div className="text-sm opacity-80">
                                {isProfit ? '+' : ''}{entry.pnlPercent.toFixed(2)}%
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={onEdit}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
