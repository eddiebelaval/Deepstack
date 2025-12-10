'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

/**
 * DeepValuePicksWidget - Displays top undervalued stocks
 *
 * Shows 3-4 stocks with value scores and potential upside
 * Mock data for now - ready for API integration
 *
 * Usage:
 * <DeepValuePicksWidget />
 */

type ValuePick = {
  id: string;
  symbol: string;
  name: string;
  valueScore: number; // 0-100
  upside: number; // percentage
  price: number;
};

const MOCK_VALUE_PICKS: ValuePick[] = [
  {
    id: '1',
    symbol: 'INTC',
    name: 'Intel Corp',
    valueScore: 92,
    upside: 38,
    price: 24.50,
  },
  {
    id: '2',
    symbol: 'BAC',
    name: 'Bank of America',
    valueScore: 88,
    upside: 28,
    price: 32.15,
  },
  {
    id: '3',
    symbol: 'F',
    name: 'Ford Motor',
    valueScore: 85,
    upside: 42,
    price: 11.20,
  },
  {
    id: '4',
    symbol: 'GOLD',
    name: 'Barrick Gold',
    valueScore: 81,
    upside: 25,
    price: 17.85,
  },
];

export function DeepValuePicksWidget() {
  return (
    <div className="space-y-1.5">
      {MOCK_VALUE_PICKS.map((pick) => {
        const scoreColor =
          pick.valueScore >= 90 ? 'text-profit' :
          pick.valueScore >= 80 ? 'text-yellow-500' :
          'text-muted-foreground';

        return (
          <div
            key={pick.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{pick.symbol}</span>
                <span className={cn("text-xs font-mono font-semibold", scoreColor)}>
                  {pick.valueScore}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {pick.name}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-mono">
                ${pick.price.toFixed(2)}
              </span>
              <div className="flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3 text-profit" />
                <span className="text-xs font-medium text-profit">
                  +{pick.upside}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DeepValuePicksWidget;
