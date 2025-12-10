'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, TrendingUp, TrendingDown } from 'lucide-react';

// Mock data for hedged positions summary
const MOCK_HEDGES = [
  { symbol: 'SPY', type: 'Put Spread', coverage: 85, delta: -0.35 },
  { symbol: 'QQQ', type: 'Collar', coverage: 100, delta: -0.15 },
];

export function HedgedSummaryWidget() {
  const totalCoverage = Math.round(
    MOCK_HEDGES.reduce((acc, h) => acc + h.coverage, 0) / MOCK_HEDGES.length
  );
  const netDelta = MOCK_HEDGES.reduce((acc, h) => acc + h.delta, 0);

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Portfolio Protection</span>
        </div>
        <span className={cn(
          'text-sm font-mono font-medium',
          totalCoverage >= 80 ? 'text-profit' : totalCoverage >= 50 ? 'text-yellow-500' : 'text-loss'
        )}>
          {totalCoverage}%
        </span>
      </div>

      {/* Net Delta */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Net Delta</span>
        <span className={cn(
          'font-mono',
          netDelta < 0 ? 'text-profit' : 'text-loss'
        )}>
          {netDelta >= 0 ? '+' : ''}{netDelta.toFixed(2)}
        </span>
      </div>

      {/* Hedged positions */}
      <div className="space-y-1.5">
        {MOCK_HEDGES.map((hedge) => (
          <div
            key={hedge.symbol}
            className="flex items-center justify-between py-1 px-2 rounded-lg bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{hedge.symbol}</span>
              <span className="text-xs text-muted-foreground">{hedge.type}</span>
            </div>
            <div className="flex items-center gap-2">
              {hedge.delta < 0 ? (
                <TrendingDown className="h-3 w-3 text-profit" />
              ) : (
                <TrendingUp className="h-3 w-3 text-loss" />
              )}
              <span className="text-xs font-mono">{hedge.coverage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HedgedSummaryWidget;
