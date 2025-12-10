'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Mock portfolio data
const MOCK_PORTFOLIO_DATA = {
  totalValue: 104230,
  dayPnL: 1240,
  dayPnLPercent: 1.2,
  openPositions: 5,
  buyingPower: 42850,
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function QuickStatsWidget() {
  const { totalValue, dayPnL, dayPnLPercent, openPositions, buyingPower } = MOCK_PORTFOLIO_DATA;
  const isProfitable = dayPnL >= 0;

  return (
    <div className="space-y-2.5">
      {/* Portfolio Value */}
      <div className="flex justify-between py-1">
        <span className="text-sm text-muted-foreground">Portfolio</span>
        <span className="text-sm font-mono font-semibold">{formatCurrency(totalValue)}</span>
      </div>

      {/* Day P&L */}
      <div className="flex justify-between py-1">
        <span className="text-sm text-muted-foreground">Day P&L</span>
        <div className="flex items-center gap-1.5">
          {isProfitable ? (
            <TrendingUp className="h-3 w-3 text-profit" />
          ) : (
            <TrendingDown className="h-3 w-3 text-loss" />
          )}
          <span className={cn('text-sm font-mono font-semibold', isProfitable ? 'text-profit' : 'text-loss')}>
            {isProfitable ? '+' : ''}
            {formatCurrency(dayPnL)}
          </span>
          <span className={cn('text-xs font-medium', isProfitable ? 'text-profit' : 'text-loss')}>
            ({isProfitable ? '+' : ''}
            {dayPnLPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Open Positions */}
      <div className="flex justify-between py-1">
        <span className="text-sm text-muted-foreground">Open Positions</span>
        <span className="text-sm font-mono font-medium">{openPositions}</span>
      </div>

      {/* Buying Power */}
      <div className="flex justify-between py-1">
        <span className="text-sm text-muted-foreground">Buying Power</span>
        <span className="text-sm font-mono font-medium">{formatCurrency(buyingPower)}</span>
      </div>
    </div>
  );
}

// Named export for flexibility
export default QuickStatsWidget;
