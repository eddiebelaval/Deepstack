'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, Star, Filter } from 'lucide-react';

/**
 * ScreenerPicksWidget - Displays top screener results
 *
 * Shows 3-4 stocks matching screening criteria with key metrics
 * Mock data for now - ready for API integration
 *
 * Usage:
 * <ScreenerPicksWidget />
 */

type ScreenerPick = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  metric: {
    label: string;
    value: string;
  };
  change: number;
  rating: number; // 1-5 stars
};

const MOCK_SCREENER_PICKS: ScreenerPick[] = [
  {
    id: '1',
    symbol: 'PLTR',
    name: 'Palantir',
    price: 28.45,
    metric: {
      label: 'Growth',
      value: '31%',
    },
    change: 4.2,
    rating: 5,
  },
  {
    id: '2',
    symbol: 'SMCI',
    name: 'Super Micro',
    price: 42.30,
    metric: {
      label: 'P/E',
      value: '12.4',
    },
    change: -1.8,
    rating: 4,
  },
  {
    id: '3',
    symbol: 'COIN',
    name: 'Coinbase',
    price: 185.60,
    metric: {
      label: 'Vol',
      value: '8.2M',
    },
    change: 6.5,
    rating: 4,
  },
  {
    id: '4',
    symbol: 'MSTR',
    name: 'MicroStrategy',
    price: 312.50,
    metric: {
      label: 'RSI',
      value: '68',
    },
    change: 3.1,
    rating: 5,
  },
];

export function ScreenerPicksWidget() {
  return (
    <div className="space-y-1.5">
      {MOCK_SCREENER_PICKS.map((pick) => {
        const isPositive = pick.change >= 0;

        return (
          <div
            key={pick.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{pick.symbol}</span>
                <div className="flex items-center">
                  {Array.from({ length: pick.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {pick.metric.label}:
                </span>
                <span className="text-xs font-mono font-medium">
                  {pick.metric.value}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-mono">
                ${pick.price.toFixed(2)}
              </span>
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                isPositive ? "text-profit" : "text-loss"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3 rotate-180" />
                )}
                {isPositive ? "+" : ""}
                {pick.change.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ScreenerPicksWidget;
