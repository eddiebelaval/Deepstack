'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptionsStrategyStore, createLegsForTemplate } from '@/lib/stores/options-strategy-store';
import {
  OptionLeg,
  StrategyTemplate,
  StrategyInfo,
  STRATEGY_TEMPLATES,
  getDirectionColor,
} from '@/lib/types/options';
import { PayoffDiagram } from './PayoffDiagram';

// Get default expiration date (30 days from now, on a Friday)
function getDefaultExpiration(): string {
  const today = new Date();
  const target = new Date(today);
  target.setDate(today.getDate() + 30);
  // Adjust to next Friday
  const dayOfWeek = target.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  target.setDate(target.getDate() + daysUntilFriday);
  return target.toISOString().split('T')[0];
}

export function OptionsStrategyBuilder() {
  const {
    symbol,
    underlyingPrice,
    expirationDate,
    selectedTemplate,
    legs,
    calculation,
    isCalculating,
    error,
    showGreeks,
    setSymbol,
    setUnderlyingPrice,
    setExpirationDate,
    selectTemplate,
    addLeg,
    updateLeg,
    removeLeg,
    clearLegs,
    calculate,
    setShowGreeks,
    reset,
  } = useOptionsStrategyStore();

  // Track previous legs count for auto-calculate
  const prevLegsRef = useRef<number>(legs.length);
  const autoCalculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set default expiration on mount if not set
  useEffect(() => {
    if (!expirationDate) {
      setExpirationDate(getDefaultExpiration());
    }
  }, [expirationDate, setExpirationDate]);

  // Fetch underlying price when symbol changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (!symbol) return;
      try {
        const res = await fetch(`/api/market/quotes?symbol=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          if (data.last) {
            setUnderlyingPrice(data.last);
          }
        }
      } catch {
        // Use mock price
        setUnderlyingPrice(450 + Math.random() * 50);
      }
    };
    fetchPrice();
  }, [symbol, setUnderlyingPrice]);

  // Auto-calculate P&L when legs change (debounced)
  const triggerAutoCalculate = useCallback(() => {
    if (autoCalculateTimeoutRef.current) {
      clearTimeout(autoCalculateTimeoutRef.current);
    }
    autoCalculateTimeoutRef.current = setTimeout(() => {
      if (legs.length > 0 && underlyingPrice > 0 && expirationDate) {
        calculate();
      }
    }, 500); // 500ms debounce
  }, [legs.length, underlyingPrice, expirationDate, calculate]);

  // Trigger auto-calculate when legs are added/removed
  useEffect(() => {
    if (legs.length !== prevLegsRef.current && legs.length > 0) {
      triggerAutoCalculate();
    }
    prevLegsRef.current = legs.length;
  }, [legs.length, triggerAutoCalculate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCalculateTimeoutRef.current) {
        clearTimeout(autoCalculateTimeoutRef.current);
      }
    };
  }, []);

  const handleTemplateSelect = (template: StrategyTemplate) => {
    selectTemplate(template);
    if (template !== 'custom' && underlyingPrice > 0) {
      // Round strike to nearest $5
      const roundedStrike = Math.round(underlyingPrice / 5) * 5;
      // Estimate premium based on underlying price (roughly 1-2% ATM)
      const estimatedPremium = underlyingPrice * 0.015;
      const templateLegs = createLegsForTemplate(template, roundedStrike, estimatedPremium);
      clearLegs();
      templateLegs.forEach((leg) => addLeg(leg));
      // Auto-calculate will trigger from legs change effect
    }
  };

  const handleAddLeg = () => {
    addLeg({
      strike: Math.round(underlyingPrice / 5) * 5,
      option_type: 'call',
      action: 'buy',
      quantity: 1,
      premium: 2.50,
    });
    selectTemplate('custom');
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Strategy Builder
            <Badge variant="outline" className="text-xs font-normal">
              P&L Visualization
            </Badge>
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Build and analyze options strategies
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isCalculating && (
            <Badge variant="secondary" className="gap-1 animate-pulse">
              <Zap className="h-3 w-3" />
              Auto-calculating...
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={reset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={() => calculate()}
            disabled={isCalculating || legs.length === 0}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            {isCalculating ? 'Calculating...' : 'Calculate P&L'}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left: Strategy Selection & Inputs */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Symbol & Price Inputs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Position Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Symbol</Label>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="SPY"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Underlying Price</Label>
                <Input
                  type="number"
                  value={underlyingPrice || ''}
                  onChange={(e) => setUnderlyingPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Expiration Date</Label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Strategy Templates */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Strategy Templates</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-2">
                  {STRATEGY_TEMPLATES.map((strat) => (
                    <StrategyCard
                      key={strat.id}
                      strategy={strat}
                      isSelected={selectedTemplate === strat.id}
                      onSelect={() => handleTemplateSelect(strat.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Center: Payoff Diagram */}
        <div className="lg:col-span-1">
          <PayoffDiagram
            calculation={calculation}
            underlyingPrice={underlyingPrice}
            showGreeks={showGreeks}
            className="h-full"
          />
        </div>

        {/* Right: Legs Editor */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Legs */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Position Legs</CardTitle>
                {legs.length > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                    {legs.length}
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleAddLeg} className="h-7">
                <Plus className="h-3 w-3 mr-1" />
                Add Leg
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 pb-4">
                {legs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No legs added</p>
                    <p className="text-xs mt-1">Select a template or add legs manually</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {legs.map((leg, index) => (
                      <LegEditor
                        key={index}
                        leg={leg}
                        onUpdate={(updates) => updateLeg(index, updates)}
                        onRemove={() => removeLeg(index)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Display Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Greeks</Label>
                <Button
                  variant={showGreeks ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowGreeks(!showGreeks)}
                >
                  {showGreeks ? 'On' : 'Off'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Strategy Card Component
interface StrategyCardProps {
  strategy: StrategyInfo;
  isSelected: boolean;
  onSelect: () => void;
}

function StrategyCard({ strategy, isSelected, onSelect }: StrategyCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-colors',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-sm">{strategy.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{strategy.description}</div>
        </div>
        <Badge
          variant="outline"
          className={cn('text-xs', getDirectionColor(strategy.direction))}
        >
          {strategy.direction}
        </Badge>
      </div>
      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
        <span>{strategy.legs} leg{strategy.legs !== 1 ? 's' : ''}</span>
        <span>|</span>
        <span className="text-green-500">+{strategy.maxProfit}</span>
        <span className="text-red-500">-{strategy.maxLoss}</span>
      </div>
    </button>
  );
}

// Leg Editor Component
interface LegEditorProps {
  leg: OptionLeg;
  onUpdate: (updates: Partial<OptionLeg>) => void;
  onRemove: () => void;
}

function LegEditor({ leg, onUpdate, onRemove }: LegEditorProps) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={leg.action === 'buy' ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              leg.action === 'buy' ? 'bg-green-600' : 'bg-red-600'
            )}
          >
            {leg.action === 'buy' ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {leg.action.toUpperCase()}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              leg.option_type === 'call' ? 'text-green-500' : 'text-red-500'
            )}
          >
            {leg.option_type.toUpperCase()}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Strike</Label>
          <Input
            type="number"
            value={leg.strike}
            onChange={(e) => onUpdate({ strike: parseFloat(e.target.value) || 0 })}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Premium</Label>
          <Input
            type="number"
            step="0.01"
            value={leg.premium}
            onChange={(e) => onUpdate({ premium: parseFloat(e.target.value) || 0 })}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Action</Label>
          <Select
            value={leg.action}
            onValueChange={(v) => onUpdate({ action: v as 'buy' | 'sell' })}
          >
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select
            value={leg.option_type}
            onValueChange={(v) => onUpdate({ option_type: v as 'call' | 'put' })}
          >
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="put">Put</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Quantity</Label>
          <div className="flex items-center gap-2 mt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onUpdate({ quantity: Math.max(1, leg.quantity - 1) })}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={leg.quantity}
              onChange={(e) => onUpdate({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="h-8 text-center text-sm"
              min={1}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onUpdate({ quantity: leg.quantity + 1 })}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
