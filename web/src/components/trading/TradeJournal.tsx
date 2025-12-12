'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  TrendingUp,
  TrendingDown,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2, Cloud, CloudOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type TradeType = 'long' | 'short';
export type TradeOutcome = 'win' | 'loss' | 'breakeven';

export type TradeEntry = {
  id: string;
  symbol: string;
  type: TradeType;
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  outcome?: TradeOutcome;
  notes?: string;
  tags?: string[];
  createdAt: string;
};

// Mock hook for demo - in real app, this would come from a custom hook
function useTradeJournal() {
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [isLoading] = useState(false);
  const [isOnline] = useState(true);
  const [error] = useState<string | null>(null);

  const addEntry = (entry: Omit<TradeEntry, 'id' | 'createdAt'>) => {
    setEntries([
      {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
      ...entries,
    ]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, updates: Partial<TradeEntry>) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  return {
    entries,
    addEntry,
    removeEntry,
    updateEntry,
    isLoading,
    isOnline,
    error,
  };
}

export function TradeJournal() {
  const { entries, addEntry, removeEntry, updateEntry, isLoading, isOnline, error } =
    useTradeJournal();

  const [newSymbol, setNewSymbol] = useState('');
  const [newType, setNewType] = useState<TradeType>('long');
  const [newEntryDate, setNewEntryDate] = useState('');
  const [newExitDate, setNewExitDate] = useState('');
  const [newEntryPrice, setNewEntryPrice] = useState('');
  const [newExitPrice, setNewExitPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newOutcome, setNewOutcome] = useState<TradeOutcome | ''>('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const openTrades = entries.filter((e) => !e.exitDate);
  const closedTrades = entries.filter((e) => !!e.exitDate);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !newEntryDate || !newEntryPrice || !newQuantity) return;

    if (editingId) {
      updateEntry(editingId, {
        symbol: newSymbol.toUpperCase().trim(),
        type: newType,
        entryDate: newEntryDate,
        exitDate: newExitDate || undefined,
        entryPrice: parseFloat(newEntryPrice),
        exitPrice: newExitPrice ? parseFloat(newExitPrice) : undefined,
        quantity: parseFloat(newQuantity),
        outcome: newOutcome || undefined,
        notes: newNotes || undefined,
      });
      setEditingId(null);
    } else {
      addEntry({
        symbol: newSymbol.toUpperCase().trim(),
        type: newType,
        entryDate: newEntryDate,
        exitDate: newExitDate || undefined,
        entryPrice: parseFloat(newEntryPrice),
        exitPrice: newExitPrice ? parseFloat(newExitPrice) : undefined,
        quantity: parseFloat(newQuantity),
        outcome: newOutcome || undefined,
        notes: newNotes || undefined,
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewSymbol('');
    setNewType('long');
    setNewEntryDate('');
    setNewExitDate('');
    setNewEntryPrice('');
    setNewExitPrice('');
    setNewQuantity('');
    setNewOutcome('');
    setNewNotes('');
  };

  const handleEdit = (entry: TradeEntry) => {
    setEditingId(entry.id);
    setNewSymbol(entry.symbol);
    setNewType(entry.type);
    setNewEntryDate(entry.entryDate);
    setNewExitDate(entry.exitDate || '');
    setNewEntryPrice(entry.entryPrice.toString());
    setNewExitPrice(entry.exitPrice?.toString() || '');
    setNewQuantity(entry.quantity.toString());
    setNewOutcome(entry.outcome || '');
    setNewNotes(entry.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Trade Journal</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  {isOnline ? (
                    <Cloud className="h-3 w-3 text-green-500" />
                  ) : (
                    <CloudOff className="h-3 w-3 text-yellow-500" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isOnline ? 'Synced with cloud' : 'Using local storage'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="outline" className="text-xs">
          {entries.length} entries
        </Badge>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {/* Entry Form */}
      <Card className="flex-shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {editingId ? (
              <>
                <Edit2 className="h-4 w-4" />
                Edit Entry
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                New Entry
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <form onSubmit={handleAddEntry} className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label htmlFor="symbol-input" className="text-xs">Symbol</Label>
                <Input
                  id="symbol-input"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="h-8 text-sm mt-1 uppercase"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type-select" className="text-xs">Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as TradeType)}>
                  <SelectTrigger id="type-select" className="h-8 text-sm mt-1" aria-label="Type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="entry-price-input" className="text-xs">Entry Price</Label>
                <Input
                  id="entry-price-input"
                  type="number"
                  step="0.01"
                  value={newEntryPrice}
                  onChange={(e) => setNewEntryPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-sm mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantity-input" className="text-xs">Quantity</Label>
                <Input
                  id="quantity-input"
                  type="number"
                  step="0.01"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm mt-1"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label htmlFor="entry-date-input" className="text-xs">Entry Date</Label>
                <Input
                  id="entry-date-input"
                  type="date"
                  value={newEntryDate}
                  onChange={(e) => setNewEntryDate(e.target.value)}
                  className="h-8 text-sm mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="exit-date-input" className="text-xs">Exit Date</Label>
                <Input
                  id="exit-date-input"
                  type="date"
                  value={newExitDate}
                  onChange={(e) => setNewExitDate(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label htmlFor="exit-price-input" className="text-xs">Exit Price</Label>
                <Input
                  id="exit-price-input"
                  type="number"
                  step="0.01"
                  value={newExitPrice}
                  onChange={(e) => setNewExitPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label htmlFor="outcome-select" className="text-xs">Outcome</Label>
                <Select value={newOutcome} onValueChange={(v) => setNewOutcome(v as TradeOutcome | '')}>
                  <SelectTrigger id="outcome-select" className="h-8 text-sm mt-1" aria-label="Outcome">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="win">Win</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                    <SelectItem value="breakeven">Break Even</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes-textarea" className="text-xs">Notes</Label>
              <Textarea
                id="notes-textarea"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Trade notes and analysis..."
                className="min-h-[60px] text-sm mt-1"
              />
            </div>
            <div className="flex gap-2">
              {editingId && (
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleCancelEdit}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" className="h-8">
                {editingId ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Entries List */}
      <Tabs defaultValue="all" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
          <TabsTrigger value="all">
            All ({entries.length})
          </TabsTrigger>
          <TabsTrigger value="open">
            Open ({openTrades.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closedTrades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 min-h-0 mt-2">
          {entries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-50" />
              <p className="text-sm">No trade entries</p>
              <p className="text-xs">Record your first trade above</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {entries.map((entry) => (
                  <TradeEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={removeEntry}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="open" className="flex-1 min-h-0 mt-2">
          {openTrades.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-50" />
              <p className="text-sm">No open trades</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {openTrades.map((entry) => (
                  <TradeEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={removeEntry}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="closed" className="flex-1 min-h-0 mt-2">
          {closedTrades.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-50" />
              <p className="text-sm">No closed trades</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {closedTrades.map((entry) => (
                  <TradeEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={removeEntry}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TradeEntryCard({
  entry,
  onDelete,
  onEdit,
}: {
  entry: TradeEntry;
  onDelete: (id: string) => void;
  onEdit: (entry: TradeEntry) => void;
}) {
  const calculatePnL = () => {
    if (!entry.exitPrice) return null;
    const pnl = entry.type === 'long'
      ? (entry.exitPrice - entry.entryPrice) * entry.quantity
      : (entry.entryPrice - entry.exitPrice) * entry.quantity;
    return pnl;
  };

  const pnl = calculatePnL();

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{entry.symbol}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 gap-0.5',
                entry.type === 'long' && 'text-green-500 border-green-500/30',
                entry.type === 'short' && 'text-red-500 border-red-500/30'
              )}
            >
              {entry.type === 'long' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {entry.type}
            </Badge>
            {entry.outcome && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0',
                  entry.outcome === 'win' && 'text-green-500 border-green-500/30',
                  entry.outcome === 'loss' && 'text-red-500 border-red-500/30',
                  entry.outcome === 'breakeven' && 'text-yellow-500 border-yellow-500/30'
                )}
              >
                {entry.outcome}
              </Badge>
            )}
          </div>
          <div className="text-sm mt-1 font-mono">
            Entry: ${entry.entryPrice.toFixed(2)} × {entry.quantity}
            {entry.exitPrice && ` → Exit: $${entry.exitPrice.toFixed(2)}`}
          </div>
          {pnl !== null && (
            <div className={cn('text-sm font-semibold', pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
              P&L: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </div>
          )}
          {entry.notes && (
            <div className="text-xs text-muted-foreground mt-1">{entry.notes}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(entry.entryDate).toLocaleDateString()}
            {entry.exitDate && ` → ${new Date(entry.exitDate).toLocaleDateString()}`}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onEdit(entry)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
