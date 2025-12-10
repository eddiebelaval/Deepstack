'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Activity } from 'lucide-react';

/**
 * OptionsOpportunitiesWidget - Displays notable options activity
 *
 * Shows 3-4 unusual options flow with strike, type, and volume
 * Mock data for now - ready for API integration
 *
 * Usage:
 * <OptionsOpportunitiesWidget />
 */

type OptionsFlow = {
  id: string;
  symbol: string;
  strike: number;
  type: 'call' | 'put';
  expiry: string;
  volume: number;
  premium: number;
  sentiment: 'bullish' | 'bearish';
};

const MOCK_OPTIONS_FLOW: OptionsFlow[] = [
  {
    id: '1',
    symbol: 'NVDA',
    strike: 500,
    type: 'call',
    expiry: '2/16',
    volume: 12450,
    premium: 8.50,
    sentiment: 'bullish',
  },
  {
    id: '2',
    symbol: 'TSLA',
    strike: 180,
    type: 'put',
    expiry: '2/23',
    volume: 8920,
    premium: 5.20,
    sentiment: 'bearish',
  },
  {
    id: '3',
    symbol: 'SPY',
    strike: 580,
    type: 'call',
    expiry: '3/15',
    volume: 15670,
    premium: 12.30,
    sentiment: 'bullish',
  },
  {
    id: '4',
    symbol: 'AMD',
    strike: 140,
    type: 'call',
    expiry: '2/9',
    volume: 6340,
    premium: 3.75,
    sentiment: 'bullish',
  },
];

export function OptionsOpportunitiesWidget() {
  return (
    <div className="space-y-1.5">
      {MOCK_OPTIONS_FLOW.map((flow) => {
        const isCall = flow.type === 'call';
        const isBullish = flow.sentiment === 'bullish';

        return (
          <div
            key={flow.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{flow.symbol}</span>
                <div className="flex items-center gap-1">
                  {isBullish ? (
                    <ArrowUp className="h-3 w-3 text-profit" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-loss" />
                  )}
                  <span className={cn(
                    "text-xs font-medium uppercase",
                    isCall ? "text-profit" : "text-loss"
                  )}>
                    {flow.type}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">${flow.strike}</span>
                <span>{flow.expiry}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-mono">
                  {(flow.volume / 1000).toFixed(1)}K
                </span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                ${flow.premium.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default OptionsOpportunitiesWidget;
