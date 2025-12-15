'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useBarData } from '@/hooks/useBarData';

interface SparklineCardProps {
  /** Stock/ETF symbol */
  symbol: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Whether this card is selected/active */
  isActive?: boolean;
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * SparklineCard - Compact card showing symbol, price, sparkline chart, and change %
 *
 * Used in the Mobile Market Watcher mini mode grid.
 *
 * Features:
 * - Real-time price from market data store
 * - SVG sparkline from last 20 bars
 * - Color-coded change percentage
 * - Tap to select/highlight
 *
 * @example
 * ```tsx
 * <SparklineCard
 *   symbol="SPY"
 *   onClick={() => selectSymbol('SPY')}
 *   isActive={selectedSymbol === 'SPY'}
 * />
 * ```
 */
export function SparklineCard({
  symbol,
  onClick,
  isActive = false,
  className,
  size = 'md',
}: SparklineCardProps) {
  const quotes = useMarketDataStore((state) => state.quotes);
  const quote = quotes[symbol];

  // Fetch bar data for sparkline
  const { data: barResponse, isLoading } = useBarData(symbol, '1d', true);
  const barData = barResponse?.bars;

  // Get last 20 price points for sparkline
  const pricePoints = useMemo(() => {
    if (!barData || barData.length === 0) return [];
    return barData.slice(-20).map((bar) => bar.value);
  }, [barData]);

  // Calculate min/max for scaling
  const { min, max } = useMemo(() => {
    if (pricePoints.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...pricePoints),
      max: Math.max(...pricePoints),
    };
  }, [pricePoints]);

  // Generate SVG path for sparkline
  const svgPath = useMemo(() => {
    if (pricePoints.length < 2) return '';

    const width = 100;
    const height = 30;
    const padding = 2;
    const range = max - min || 1;

    const points = pricePoints.map((price, i) => {
      const x = (i / (pricePoints.length - 1)) * width;
      const y = height - ((price - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [pricePoints, min, max]);

  // Generate area fill path
  const areaPath = useMemo(() => {
    if (!svgPath) return '';
    return `${svgPath} L 100,30 L 0,30 Z`;
  }, [svgPath]);

  const currentPrice = quote?.last ?? 0;
  const changePercent = quote?.changePercent ?? 0;
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const isNeutral = changePercent === 0;

  // Use Deepstack trading colors
  const strokeColor = isPositive
    ? 'oklch(0.65 0.16 145)' // --ds-profit
    : isNegative
    ? 'oklch(0.60 0.18 25)' // --ds-loss
    : 'oklch(0.55 0.008 60)'; // --ds-neutral

  const fillColor = isPositive
    ? 'oklch(0.65 0.16 145 / 0.15)'
    : isNegative
    ? 'oklch(0.60 0.18 25 / 0.15)'
    : 'oklch(0.55 0.008 60 / 0.08)';

  const isSm = size === 'sm';

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex flex-col rounded-xl transition-all tap-target',
        'glass-surface-elevated',
        isActive && 'ring-2 ring-primary/50 border-primary/30 living-surface',
        isSm ? 'p-2 gap-1' : 'p-3 gap-2',
        className
      )}
      style={{
        '--ds-glow': isActive ? 'oklch(0.70 0.18 55 / 15%)' : undefined,
        '--ds-pulse': isActive ? 'oklch(0.65 0.15 50 / 10%)' : undefined,
      } as React.CSSProperties}
    >
      {/* Header: Symbol and Price */}
      <div className="flex items-center justify-between">
        <span className={cn(
          'font-semibold text-foreground',
          isSm ? 'text-xs' : 'text-sm'
        )}>
          {symbol}
        </span>
        <span className={cn(
          'font-mono font-medium',
          isSm ? 'text-[10px]' : 'text-xs'
        )}>
          {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : '—'}
        </span>
      </div>

      {/* Sparkline Chart */}
      <div className={cn('w-full', isSm ? 'h-5' : 'h-7')}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-1 bg-muted/50 rounded animate-pulse" />
          </div>
        ) : pricePoints.length >= 2 ? (
          <svg
            viewBox="0 0 100 30"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Area fill */}
            <path
              d={areaPath}
              fill={fillColor}
            />
            {/* Line */}
            <path
              d={svgPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-3/4 h-px bg-muted-foreground/20" />
          </div>
        )}
      </div>

      {/* Change Percentage */}
      <div className="flex items-center justify-end">
        <span
          className={cn(
            'flex items-center gap-0.5 font-medium',
            isSm ? 'text-[10px]' : 'text-xs',
            isPositive && 'text-profit',
            isNegative && 'text-loss',
            isNeutral && 'text-neutral'
          )}
        >
          {isPositive ? (
            <TrendingUp className={cn(isSm ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
          ) : isNegative ? (
            <TrendingDown className={cn(isSm ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
          ) : (
            <Minus className={cn(isSm ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
          )}
          {isPositive ? '+' : ''}
          {changePercent.toFixed(2)}%
        </span>
      </div>
    </motion.button>
  );
}

export default SparklineCard;
