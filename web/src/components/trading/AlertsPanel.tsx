'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Bell,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  BellOff,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAlertsSync } from '@/hooks/useAlertsSync';
import { AlertCondition, PriceAlert } from '@/lib/stores/alerts-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { Loader2, Cloud, CloudOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function AlertsPanel() {
  const { alerts, addAlert, removeAlert, clearTriggered, isLoading, isOnline, error } = useAlertsSync();
  const { activeSymbol } = useTradingStore();

  const [newSymbol, setNewSymbol] = useState(activeSymbol || '');
  const [newPrice, setNewPrice] = useState('');
  const [newCondition, setNewCondition] = useState<AlertCondition>('above');
  const [newNote, setNewNote] = useState('');

  const activeAlerts = alerts.filter((a) => a.isActive);
  const triggeredAlerts = alerts.filter((a) => !a.isActive);

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !newPrice) return;

    addAlert({
      symbol: newSymbol.toUpperCase().trim(),
      targetPrice: parseFloat(newPrice),
      condition: newCondition,
      note: newNote || undefined,
    });

    setNewSymbol(activeSymbol || '');
    setNewPrice('');
    setNewNote('');
  };

  const getConditionIcon = (condition: AlertCondition) => {
    switch (condition) {
      case 'above':
        return <TrendingUp className="h-3 w-3" />;
      case 'below':
        return <TrendingDown className="h-3 w-3" />;
      case 'crosses':
        return <ArrowUpDown className="h-3 w-3" />;
    }
  };

  const getConditionLabel = (condition: AlertCondition) => {
    switch (condition) {
      case 'above':
        return 'Price Above';
      case 'below':
        return 'Price Below';
      case 'crosses':
        return 'Crosses';
    }
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
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Price Alerts</h2>
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
          {activeAlerts.length} active
        </Badge>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {/* Create Alert Form */}
      <Card className="flex-shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Alert
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <form onSubmit={handleAddAlert} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Symbol</Label>
                <Input
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="SPY"
                  className="h-8 text-sm mt-1 uppercase"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Condition</Label>
                <Select value={newCondition} onValueChange={(v) => setNewCondition(v as AlertCondition)}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above</SelectItem>
                    <SelectItem value="below">Below</SelectItem>
                    <SelectItem value="crosses">Crosses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Target Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-sm mt-1"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Optional note..."
                className="h-8 text-sm flex-1"
              />
              <Button type="submit" size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Tabs defaultValue="active" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
          <TabsTrigger value="active" className="gap-1">
            <Bell className="h-3.5 w-3.5" />
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="triggered" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Triggered ({triggeredAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="flex-1 min-h-0 mt-2">
          {activeAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BellOff className="h-8 w-8 opacity-50" />
              <p className="text-sm">No active alerts</p>
              <p className="text-xs">Create an alert above</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {activeAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onDelete={removeAlert} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="triggered" className="flex-1 min-h-0 mt-2">
          {triggeredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <CheckCircle2 className="h-8 w-8 opacity-50" />
              <p className="text-sm">No triggered alerts</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {triggeredAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDelete={removeAlert}
                      isTriggered
                    />
                  ))}
                </div>
              </ScrollArea>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 flex-shrink-0"
                onClick={clearTriggered}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear All Triggered
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlertCard({
  alert,
  onDelete,
  isTriggered = false,
}: {
  alert: PriceAlert;
  onDelete: (id: string) => void;
  isTriggered?: boolean;
}) {
  const getConditionIcon = (condition: AlertCondition) => {
    switch (condition) {
      case 'above':
        return <TrendingUp className="h-3 w-3" />;
      case 'below':
        return <TrendingDown className="h-3 w-3" />;
      case 'crosses':
        return <ArrowUpDown className="h-3 w-3" />;
    }
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-card',
        isTriggered && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{alert.symbol}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 gap-0.5',
                alert.condition === 'above' && 'text-green-500 border-green-500/30',
                alert.condition === 'below' && 'text-red-500 border-red-500/30',
                alert.condition === 'crosses' && 'text-blue-500 border-blue-500/30'
              )}
            >
              {getConditionIcon(alert.condition)}
              {alert.condition}
            </Badge>
          </div>
          <div className="text-lg font-mono">${alert.targetPrice.toFixed(2)}</div>
          {alert.note && (
            <div className="text-xs text-muted-foreground mt-1">{alert.note}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {isTriggered && alert.triggeredAt ? (
              <>Triggered: {new Date(alert.triggeredAt).toLocaleString()}</>
            ) : (
              <>Created: {new Date(alert.createdAt).toLocaleString()}</>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(alert.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
