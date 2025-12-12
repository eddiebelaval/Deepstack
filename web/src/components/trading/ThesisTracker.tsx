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
  Lightbulb,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2, Cloud, CloudOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type ThesisStatus = 'active' | 'validated' | 'invalidated' | 'monitoring';
export type ThesisTimeframe = 'short' | 'medium' | 'long';

export type Thesis = {
  id: string;
  symbol: string;
  title: string;
  hypothesis: string;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: ThesisTimeframe;
  status: ThesisStatus;
  keyFactors: string[];
  outcome?: string;
  createdAt: string;
  updatedAt: string;
};

// Mock hook for demo - in real app, this would come from a custom hook
function useThesisTracker() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [isLoading] = useState(false);
  const [isOnline] = useState(true);
  const [error] = useState<string | null>(null);

  const addThesis = (thesis: Omit<Thesis, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setTheses([
      {
        ...thesis,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      },
      ...theses,
    ]);
  };

  const removeThesis = (id: string) => {
    setTheses(theses.filter((t) => t.id !== id));
  };

  const updateThesis = (id: string, updates: Partial<Thesis>) => {
    setTheses(
      theses.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    );
  };

  return {
    theses,
    addThesis,
    removeThesis,
    updateThesis,
    isLoading,
    isOnline,
    error,
  };
}

export function ThesisTracker() {
  const { theses, addThesis, removeThesis, updateThesis, isLoading, isOnline, error } =
    useThesisTracker();

  const [newSymbol, setNewSymbol] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newHypothesis, setNewHypothesis] = useState('');
  const [newTargetPrice, setNewTargetPrice] = useState('');
  const [newStopLoss, setNewStopLoss] = useState('');
  const [newTimeframe, setNewTimeframe] = useState<ThesisTimeframe>('medium');
  const [newStatus, setNewStatus] = useState<ThesisStatus>('active');
  const [newKeyFactors, setNewKeyFactors] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeTheses = theses.filter((t) => t.status === 'active');
  const validatedTheses = theses.filter((t) => t.status === 'validated');
  const invalidatedTheses = theses.filter((t) => t.status === 'invalidated');
  const monitoringTheses = theses.filter((t) => t.status === 'monitoring');

  const handleAddThesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !newTitle.trim() || !newHypothesis.trim()) return;

    const keyFactorsArray = newKeyFactors
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (editingId) {
      updateThesis(editingId, {
        symbol: newSymbol.toUpperCase().trim(),
        title: newTitle.trim(),
        hypothesis: newHypothesis.trim(),
        targetPrice: newTargetPrice ? parseFloat(newTargetPrice) : undefined,
        stopLoss: newStopLoss ? parseFloat(newStopLoss) : undefined,
        timeframe: newTimeframe,
        status: newStatus,
        keyFactors: keyFactorsArray,
      });
      setEditingId(null);
    } else {
      addThesis({
        symbol: newSymbol.toUpperCase().trim(),
        title: newTitle.trim(),
        hypothesis: newHypothesis.trim(),
        targetPrice: newTargetPrice ? parseFloat(newTargetPrice) : undefined,
        stopLoss: newStopLoss ? parseFloat(newStopLoss) : undefined,
        timeframe: newTimeframe,
        status: newStatus,
        keyFactors: keyFactorsArray,
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewSymbol('');
    setNewTitle('');
    setNewHypothesis('');
    setNewTargetPrice('');
    setNewStopLoss('');
    setNewTimeframe('medium');
    setNewStatus('active');
    setNewKeyFactors('');
  };

  const handleEdit = (thesis: Thesis) => {
    setEditingId(thesis.id);
    setNewSymbol(thesis.symbol);
    setNewTitle(thesis.title);
    setNewHypothesis(thesis.hypothesis);
    setNewTargetPrice(thesis.targetPrice?.toString() || '');
    setNewStopLoss(thesis.stopLoss?.toString() || '');
    setNewTimeframe(thesis.timeframe);
    setNewStatus(thesis.status);
    setNewKeyFactors(thesis.keyFactors.join(', '));
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
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Thesis Tracker</h2>
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
          {activeTheses.length} active
        </Badge>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {/* Thesis Form */}
      <Card className="flex-shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {editingId ? (
              <>
                <Edit2 className="h-4 w-4" />
                Edit Thesis
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                New Thesis
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <form onSubmit={handleAddThesis} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Symbol</Label>
                <Input
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="h-8 text-sm mt-1 uppercase"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Brief thesis title"
                  className="h-8 text-sm mt-1"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Hypothesis</Label>
              <Textarea
                value={newHypothesis}
                onChange={(e) => setNewHypothesis(e.target.value)}
                placeholder="Detailed thesis hypothesis and rationale..."
                className="min-h-[80px] text-sm mt-1"
                required
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Target Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newTargetPrice}
                  onChange={(e) => setNewTargetPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Stop Loss</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newStopLoss}
                  onChange={(e) => setNewStopLoss(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Timeframe</Label>
                <Select value={newTimeframe} onValueChange={(v) => setNewTimeframe(v as ThesisTimeframe)}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (0-3M)</SelectItem>
                    <SelectItem value="medium">Medium (3-12M)</SelectItem>
                    <SelectItem value="long">Long (12M+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ThesisStatus)}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="validated">Validated</SelectItem>
                    <SelectItem value="invalidated">Invalidated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Key Factors (comma-separated)</Label>
              <Input
                value={newKeyFactors}
                onChange={(e) => setNewKeyFactors(e.target.value)}
                placeholder="earnings growth, market share, new product"
                className="h-8 text-sm mt-1"
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

      {/* Theses List */}
      <Tabs defaultValue="active" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
          <TabsTrigger value="active">
            Active ({activeTheses.length})
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            Monitoring ({monitoringTheses.length})
          </TabsTrigger>
          <TabsTrigger value="validated">
            Validated ({validatedTheses.length})
          </TabsTrigger>
          <TabsTrigger value="invalidated">
            Invalidated ({invalidatedTheses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="flex-1 min-h-0 mt-2">
          {activeTheses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Lightbulb className="h-8 w-8 opacity-50" />
              <p className="text-sm">No active theses</p>
              <p className="text-xs">Create your first investment thesis</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {activeTheses.map((thesis) => (
                  <ThesisCard
                    key={thesis.id}
                    thesis={thesis}
                    onDelete={removeThesis}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="flex-1 min-h-0 mt-2">
          {monitoringTheses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Clock className="h-8 w-8 opacity-50" />
              <p className="text-sm">No monitoring theses</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {monitoringTheses.map((thesis) => (
                  <ThesisCard
                    key={thesis.id}
                    thesis={thesis}
                    onDelete={removeThesis}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="validated" className="flex-1 min-h-0 mt-2">
          {validatedTheses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <CheckCircle2 className="h-8 w-8 opacity-50" />
              <p className="text-sm">No validated theses</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {validatedTheses.map((thesis) => (
                  <ThesisCard
                    key={thesis.id}
                    thesis={thesis}
                    onDelete={removeThesis}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="invalidated" className="flex-1 min-h-0 mt-2">
          {invalidatedTheses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <XCircle className="h-8 w-8 opacity-50" />
              <p className="text-sm">No invalidated theses</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {invalidatedTheses.map((thesis) => (
                  <ThesisCard
                    key={thesis.id}
                    thesis={thesis}
                    onDelete={removeThesis}
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

function ThesisCard({
  thesis,
  onDelete,
  onEdit,
}: {
  thesis: Thesis;
  onDelete: (id: string) => void;
  onEdit: (thesis: Thesis) => void;
}) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{thesis.symbol}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {thesis.timeframe}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                thesis.status === 'active' && 'text-blue-500 border-blue-500/30',
                thesis.status === 'monitoring' && 'text-yellow-500 border-yellow-500/30',
                thesis.status === 'validated' && 'text-green-500 border-green-500/30',
                thesis.status === 'invalidated' && 'text-red-500 border-red-500/30'
              )}
            >
              {thesis.status}
            </Badge>
          </div>
          <div className="text-sm font-medium mb-1">{thesis.title}</div>
          <div className="text-xs text-muted-foreground mb-2">{thesis.hypothesis}</div>
          {(thesis.targetPrice || thesis.stopLoss) && (
            <div className="text-xs font-mono mb-1">
              {thesis.targetPrice && `Target: $${thesis.targetPrice.toFixed(2)}`}
              {thesis.targetPrice && thesis.stopLoss && ' | '}
              {thesis.stopLoss && `Stop: $${thesis.stopLoss.toFixed(2)}`}
            </div>
          )}
          {thesis.keyFactors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {thesis.keyFactors.map((factor, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {factor}
                </Badge>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-2">
            Updated: {new Date(thesis.updatedAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onEdit(thesis)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(thesis.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
