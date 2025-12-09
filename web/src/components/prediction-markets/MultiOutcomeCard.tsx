'use client';

import { cn } from '@/lib/utils';
import { PlatformBadge } from './PlatformBadge';
import type { PredictionMarket, MarketOutcome } from '@/lib/types/prediction-markets';
import { Star, StarOff, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * MultiOutcomeCard - Displays markets with 3+ outcomes (polling/election style)
 *
 * Features:
 * - Horizontal stacked bar showing all outcome probabilities
 * - List of top outcomes with prices
 * - Color-coded outcomes
 * - Platform badge, volume
 * - Watchlist toggle
 *
 * Designed for markets like:
 * - "Who will be the next UK Prime Minister?" (multiple candidates)
 * - "Which party wins the election?" (multiple parties)
 * - Date-based markets with multiple outcomes
 */

interface MultiOutcomeCardProps {
  market: PredictionMarket;
  isWatched?: boolean;
  onToggleWatch?: () => void;
  onClick?: () => void;
  className?: string;
  /** Max outcomes to display (rest collapsed) */
  maxOutcomes?: number;
}

// Color palette for outcomes (cycle through these)
const OUTCOME_COLORS = [
  { bg: 'bg-blue-500', text: 'text-blue-500', fill: '#3b82f6' },
  { bg: 'bg-purple-500', text: 'text-purple-500', fill: '#a855f7' },
  { bg: 'bg-green-500', text: 'text-green-500', fill: '#22c55e' },
  { bg: 'bg-orange-500', text: 'text-orange-500', fill: '#f97316' },
  { bg: 'bg-pink-500', text: 'text-pink-500', fill: '#ec4899' },
  { bg: 'bg-cyan-500', text: 'text-cyan-500', fill: '#06b6d4' },
  { bg: 'bg-yellow-500', text: 'text-yellow-500', fill: '#eab308' },
  { bg: 'bg-red-500', text: 'text-red-500', fill: '#ef4444' },
];

export function MultiOutcomeCard({
  market,
  isWatched = false,
  onToggleWatch,
  onClick,
  className,
  maxOutcomes = 4,
}: MultiOutcomeCardProps) {
  // Get outcomes with fallback to Yes/No from legacy fields
  const outcomes = market.outcomes || [
    { name: 'Yes', price: market.yesPrice },
    { name: 'No', price: market.noPrice },
  ];

  // Sort outcomes by price (highest first)
  const sortedOutcomes = [...outcomes].sort((a, b) => b.price - a.price);
  const displayedOutcomes = sortedOutcomes.slice(0, maxOutcomes);
  const remainingCount = sortedOutcomes.length - maxOutcomes;

  // Calculate total for normalization (should be ~1 but might not be exactly)
  const total = sortedOutcomes.reduce((sum, o) => sum + o.price, 0);

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
            {outcomes.length} outcomes
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

      {/* Stacked bar visualization */}
      <div className="h-3 rounded-full overflow-hidden bg-muted/30 mb-2 flex">
        {displayedOutcomes.map((outcome, i) => {
          const width = total > 0 ? (outcome.price / total) * 100 : 0;
          const color = OUTCOME_COLORS[i % OUTCOME_COLORS.length];
          return (
            <div
              key={outcome.name}
              className={cn(color.bg, 'h-full transition-all')}
              style={{ width: `${width}%` }}
              title={`${outcome.name}: ${Math.round(outcome.price * 100)}%`}
            />
          );
        })}
        {remainingCount > 0 && (
          <div
            className="bg-muted-foreground/30 h-full"
            style={{
              width: `${sortedOutcomes.slice(maxOutcomes).reduce((s, o) => s + (o.price / total) * 100, 0)}%`,
            }}
            title={`+${remainingCount} more`}
          />
        )}
      </div>

      {/* Outcomes list */}
      <div className="flex-1 space-y-1 min-h-[60px]">
        {displayedOutcomes.map((outcome, i) => {
          const color = OUTCOME_COLORS[i % OUTCOME_COLORS.length];
          const percent = Math.round(outcome.price * 100);
          return (
            <OutcomeRow key={outcome.name} outcome={outcome} color={color} rank={i + 1} />
          );
        })}
        {remainingCount > 0 && (
          <div className="text-[10px] text-muted-foreground pt-0.5">
            +{remainingCount} more outcome{remainingCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Footer: Volume */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-border/30 shrink-0">
        <span className="text-[10px] text-muted-foreground">Volume</span>
        <span className="text-xs font-semibold text-foreground">
          ${formatVolume(market.volume)}
        </span>
      </div>
    </div>
  );
}

/**
 * Single outcome row with color indicator and percentage
 */
interface OutcomeRowProps {
  outcome: MarketOutcome;
  color: typeof OUTCOME_COLORS[number];
  rank: number;
}

function OutcomeRow({ outcome, color, rank }: OutcomeRowProps) {
  const percent = Math.round(outcome.price * 100);
  const isLeading = rank === 1;

  return (
    <div className="flex items-center gap-1.5">
      {/* Color indicator */}
      <div className={cn('w-2 h-2 rounded-full shrink-0', color.bg)} />

      {/* Name (truncated) */}
      <span
        className={cn(
          'text-[11px] flex-1 truncate',
          isLeading ? 'font-medium text-foreground' : 'text-muted-foreground'
        )}
        title={outcome.name}
      >
        {outcome.name}
      </span>

      {/* Percentage */}
      <span
        className={cn(
          'text-[11px] font-semibold tabular-nums shrink-0',
          isLeading ? color.text : 'text-muted-foreground'
        )}
      >
        {percent}%
      </span>
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

export default MultiOutcomeCard;
