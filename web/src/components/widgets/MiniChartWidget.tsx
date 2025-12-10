'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * MiniChartWidget - Compact sparkline chart widget
 *
 * Features:
 * - Displays last 20 price points as a simple line chart
 * - Shows current price and % change
 * - Auto-updates with market data store
 * - Height: ~100px
 *
 * Usage:
 * <MiniChartWidget symbol="SPY" />
 */

interface MiniChartWidgetProps {
  symbol?: string;
  className?: string;
}

export function MiniChartWidget({ symbol = 'SPY', className }: MiniChartWidgetProps) {
  const { quotes, getBars } = useMarketDataStore();
  const quote = quotes[symbol];
  const bars = getBars(symbol);

  // Get last 20 price points for sparkline
  const pricePoints = useMemo(() => {
    if (!bars || bars.length === 0) return [];
    return bars.slice(-20).map((bar) => bar.close);
  }, [bars]);

  // Calculate min/max for scaling
  const { min, max } = useMemo(() => {
    if (pricePoints.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...pricePoints),
      max: Math.max(...pricePoints),
    };
  }, [pricePoints]);

  // Generate SVG path
  const svgPath = useMemo(() => {
    if (pricePoints.length === 0) return '';

    const width = 100;
    const height = 40;
    const padding = 2;
    const range = max - min || 1;

    const points = pricePoints.map((price, i) => {
      const x = (i / (pricePoints.length - 1)) * width;
      const y = height - ((price - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [pricePoints, min, max]);

  const changePercent = quote?.changePercent ?? 0;
  const isPositive = changePercent >= 0;
  const currentPrice = quote?.last ?? 0;

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-3 flex flex-col gap-2',
        className
      )}
      style={{ height: '100px' }}
    >
      {/* Header with Symbol and Price */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{symbol}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-mono font-semibold">
            ${currentPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Sparkline Chart */}
      <div className="flex-1 relative">
        {pricePoints.length > 0 ? (
          <svg
            viewBox="0 0 100 40"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d={svgPath}
              fill="none"
              stroke={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            No data
          </div>
        )}
      </div>

      {/* Change Percentage */}
      <div className="flex items-center justify-end gap-1">
        <span
          className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            isPositive ? 'text-profit' : 'text-loss'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isPositive ? '+' : ''}
          {changePercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default MiniChartWidget;
