'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * PredictionMarketsWidget - Displays top prediction markets
 *
 * Shows 3-4 top markets with current probability and platform
 * Mock data for now - ready for API integration
 *
 * Usage:
 * <PredictionMarketsWidget />
 */

type PredictionMarket = {
  id: string;
  question: string;
  probability: number;
  platform: 'Kalshi' | 'Polymarket';
  direction: 'up' | 'down';
};

const MOCK_MARKETS: PredictionMarket[] = [
  {
    id: '1',
    question: 'Fed cuts rates in March',
    probability: 68,
    platform: 'Kalshi',
    direction: 'up',
  },
  {
    id: '2',
    question: 'Bitcoin above $100K by Q1',
    probability: 42,
    platform: 'Polymarket',
    direction: 'down',
  },
  {
    id: '3',
    question: 'SPY reaches new ATH in Feb',
    probability: 55,
    platform: 'Polymarket',
    direction: 'up',
  },
  {
    id: '4',
    question: 'Unemployment below 4%',
    probability: 73,
    platform: 'Kalshi',
    direction: 'up',
  },
];

export function PredictionMarketsWidget() {
  return (
    <div className="space-y-2">
      {MOCK_MARKETS.map((market) => {
        const isHighProbability = market.probability >= 50;

        return (
          <div
            key={market.id}
            className="flex flex-col gap-1 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium leading-tight flex-1">
                {market.question}
              </span>
              <div className="flex items-center gap-1">
                {market.direction === 'up' ? (
                  <TrendingUp className={cn(
                    "h-3 w-3",
                    isHighProbability ? "text-profit" : "text-muted-foreground"
                  )} />
                ) : (
                  <TrendingDown className={cn(
                    "h-3 w-3",
                    !isHighProbability ? "text-loss" : "text-muted-foreground"
                  )} />
                )}
                <span className={cn(
                  "text-sm font-mono font-semibold",
                  isHighProbability ? "text-profit" : "text-muted-foreground"
                )}>
                  {market.probability}%
                </span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {market.platform}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default PredictionMarketsWidget;
