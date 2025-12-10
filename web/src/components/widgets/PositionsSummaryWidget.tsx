'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Briefcase } from 'lucide-react';

/**
 * PositionsSummaryWidget - Portfolio positions summary widget
 *
 * Features:
 * - Shows top 3-4 open positions
 * - Displays symbol, shares, P&L
 * - Compact design for widget panel
 * - Height: ~120px
 *
 * Usage:
 * <PositionsSummaryWidget positions={positions} />
 */

export interface Position {
  symbol: string;
  shares: number;
  pnl: number;
  pnlPercent: number;
}

interface PositionsSummaryWidgetProps {
  positions?: Position[];
  className?: string;
}

// Mock positions for demo - replace with real data from store
const MOCK_POSITIONS: Position[] = [
  { symbol: 'AAPL', shares: 50, pnl: 1245.50, pnlPercent: 8.5 },
  { symbol: 'NVDA', shares: 25, pnl: -342.75, pnlPercent: -2.3 },
  { symbol: 'TSLA', shares: 15, pnl: 567.25, pnlPercent: 5.2 },
  { symbol: 'AMD', shares: 100, pnl: 89.50, pnlPercent: 1.1 },
];

export function PositionsSummaryWidget({
  positions = MOCK_POSITIONS,
  className
}: PositionsSummaryWidgetProps) {
  // Show top 3-4 positions
  const topPositions = positions.slice(0, 4);

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-3 flex flex-col gap-2',
        className
      )}
      style={{ minHeight: '120px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Open Positions
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {positions.length} total
        </span>
      </div>

      {/* Positions List */}
      <div className="space-y-1.5">
        {topPositions.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">
            No open positions
          </div>
        ) : (
          topPositions.map((position) => {
            const isProfit = position.pnl >= 0;
            return (
              <div
                key={position.symbol}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium">{position.symbol}</span>
                  <span className="text-xs text-muted-foreground">
                    {position.shares} sh
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-mono font-medium',
                      isProfit ? 'text-profit' : 'text-loss'
                    )}
                  >
                    {isProfit ? '+' : ''}${Math.abs(position.pnl).toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] font-medium',
                      isProfit ? 'text-profit' : 'text-loss'
                    )}
                  >
                    {isProfit ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {isProfit ? '+' : ''}
                    {position.pnlPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PositionsSummaryWidget;
