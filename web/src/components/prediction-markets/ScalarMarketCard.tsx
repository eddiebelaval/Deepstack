'use client';

import { cn } from '@/lib/utils';
import { PlatformBadge } from './PlatformBadge';
import type { PredictionMarket } from '@/lib/types/prediction-markets';
import { Star, StarOff, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * ScalarMarketCard - Displays range/scalar markets with Long/Short outcomes
 *
 * Features:
 * - Visual range indicator showing bounds (e.g., $5K - $15K)
 * - Current implied price point on the range
 * - Long/Short sentiment percentages
 * - Volume stats
 *
 * Designed for markets like:
 * - "What will Bitcoin price be on date X?" (range: $5K-$15K)
 * - "What will GDP growth be?" (range: -5% to +10%)
 */

interface ScalarMarketCardProps {
  market: PredictionMarket;
  isWatched?: boolean;
  onToggleWatch?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ScalarMarketCard({
  market,
  isWatched = false,
  onToggleWatch,
  onClick,
  className,
}: ScalarMarketCardProps) {
  const bounds = market.scalarBounds;
  if (!bounds) {
    // Fallback if no bounds - shouldn't happen for scalar markets
    return null;
  }

  // Get outcomes with fallback
  const outcomes = market.outcomes || [];

  // Get Long/Short prices from outcomes
  const longOutcome = outcomes.find(o => o.name.toLowerCase() === 'long');
  const shortOutcome = outcomes.find(o => o.name.toLowerCase() === 'short');
  // Fallback to yesPrice/noPrice for Long/Short if not in outcomes array
  const longPrice = longOutcome?.price ?? market.yesPrice ?? 0.5;
  const shortPrice = shortOutcome?.price ?? market.noPrice ?? 0.5;

  // Calculate implied value based on long price
  // Long price represents probability of being above midpoint
  const range = bounds.upper - bounds.lower;
  const impliedValue = bounds.lower + (longPrice * range);

  // Format bounds for display
  const formatBound = (value: number) => {
    const formatType = bounds.formatType || 'number';
    if (formatType === 'decimal') {
      return value.toFixed(2);
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  // Calculate position percentage for the indicator
  const indicatorPosition = ((impliedValue - bounds.lower) / range) * 100;

  return (
    <div
      className={cn(
        'relative flex flex-col h-full p-3 rounded-xl transition-all duration-200',
        'border border-border/50 hover:border-border/80',
        'bg-card/80 hover:bg-card hover:shadow-lg',
        'cursor-pointer group overflow-hidden',
        isWatched && 'ring-2 ring-primary/30',
        className
      )}
      onClick={onClick}
    >
      {/* Header: Platform badge + Watchlist */}
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <PlatformBadge platform={market.platform} size="sm" />
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted/50 rounded">
            Range
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatch?.();
          }}
          className={cn(
            'p-1 rounded-full transition-all',
            isWatched
              ? 'text-yellow-500 hover:text-yellow-400'
              : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100'
          )}
          title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isWatched ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Title */}
      <h3
        className="text-xs font-semibold text-foreground leading-tight line-clamp-2 mb-2 min-h-[2rem] shrink-0"
        title={market.title}
      >
        {market.title}
      </h3>

      {/* Range visualization */}
      <div className="flex-1 min-h-[50px] flex flex-col justify-center mb-2">
        {/* Range bar with gradient */}
        <div className="relative h-6 rounded-full bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-green-500/20 overflow-hidden">
          {/* Track */}
          <div className="absolute inset-0 rounded-full border border-border/30" />

          {/* Implied value indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-lg transition-all"
            style={{ left: `calc(${indicatorPosition}% - 6px)` }}
          />
        </div>

        {/* Range labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{formatBound(bounds.lower)}</span>
          <span className="text-[10px] font-medium text-foreground">
            ~{formatBound(impliedValue)}
          </span>
          <span className="text-[10px] text-muted-foreground">{formatBound(bounds.upper)}</span>
        </div>
      </div>

      {/* Long/Short sentiment */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 flex items-center gap-1.5 p-1.5 rounded-lg bg-green-500/10">
          <ArrowUp className="h-3 w-3 text-green-500" />
          <span className="text-[10px] text-muted-foreground">Long</span>
          <span className="text-xs font-semibold text-green-500 ml-auto">
            {Math.round(longPrice * 100)}%
          </span>
        </div>
        <div className="flex-1 flex items-center gap-1.5 p-1.5 rounded-lg bg-red-500/10">
          <ArrowDown className="h-3 w-3 text-red-500" />
          <span className="text-[10px] text-muted-foreground">Short</span>
          <span className="text-xs font-semibold text-red-500 ml-auto">
            {Math.round(shortPrice * 100)}%
          </span>
        </div>
      </div>

      {/* Footer: Volume */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30 shrink-0">
        <span className="text-[10px] text-muted-foreground">Volume</span>
        <span className="text-xs font-semibold text-foreground">
          ${formatVolume(market.volume)}
        </span>
      </div>
    </div>
  );
}

/**
 * Format volume for display
 */
function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(0)}K`;
  }
  return volume.toFixed(0);
}

export default ScalarMarketCard;
