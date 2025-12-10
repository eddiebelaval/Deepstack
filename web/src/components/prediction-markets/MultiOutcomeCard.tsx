'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  SquareCard,
  SquareCardHeader,
  SquareCardContent,
  SquareCardFooter,
  SquareCardTitle,
  SquareCardActionButton,
} from '@/components/ui/square-card';
import { PlatformBadge } from './PlatformBadge';
import type { PredictionMarket, MarketOutcome, MarketPricePoint } from '@/lib/types/prediction-markets';
import { Star, StarOff, Loader2 } from 'lucide-react';

/**
 * MultiOutcomeCard - Displays markets with 3+ outcomes (polling/election style)
 *
 * Now uses unified SquareCard component for consistent 1:1 aspect ratio
 *
 * Features:
 * - Mini sparklines for each outcome showing price trends
 * - List of top outcomes with current percentages
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
  maxOutcomes = 3,
}: MultiOutcomeCardProps) {
  const [priceHistory, setPriceHistory] = useState<MarketPricePoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Get outcomes with fallback to Yes/No from legacy fields
  const outcomes = market.outcomes || [
    { name: 'Yes', price: market.yesPrice },
    { name: 'No', price: market.noPrice },
  ];

  // Sort outcomes by price (highest first)
  const sortedOutcomes = [...outcomes].sort((a, b) => b.price - a.price);
  const displayedOutcomes = sortedOutcomes.slice(0, maxOutcomes);
  const remainingCount = sortedOutcomes.length - maxOutcomes;

  // Fetch price history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const params = new URLSearchParams({
          yesPrice: market.yesPrice.toString(),
          title: market.title,
        });
        const response = await fetch(
          `/api/prediction-markets/${market.platform}/${market.id}?${params.toString()}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const { market: detail } = await response.json();
        if (detail?.priceHistory) {
          setPriceHistory(detail.priceHistory);
        }
      } catch (err) {
        // Silently fail - chart will just not show
        console.error('Failed to load price history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [market.platform, market.id, market.yesPrice, market.title]);

  return (
    <SquareCard
      onClick={onClick}
      isHighlighted={isWatched}
      className={className}
    >
      {/* Header: Platform badge + Watchlist */}
      <SquareCardHeader>
        <div className="flex items-center gap-1.5">
          <PlatformBadge platform={market.platform} size="sm" />
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted/50 rounded">
            {outcomes.length} outcomes
          </span>
        </div>
        <SquareCardActionButton
          onClick={() => onToggleWatch?.()}
          isActive={isWatched}
          activeClassName="text-yellow-500 hover:text-yellow-400"
          title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isWatched ? (
            <Star className="h-3.5 w-3.5 fill-current" />
          ) : (
            <StarOff className="h-3.5 w-3.5" />
          )}
        </SquareCardActionButton>
      </SquareCardHeader>

      {/* Title */}
      <SquareCardTitle className="mb-2">{market.title}</SquareCardTitle>

      {/* Combined sparkline chart showing all outcomes */}
      <SquareCardContent className="mb-2">
        <div className="h-full bg-muted/20 rounded-lg overflow-hidden">
          {isLoadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : priceHistory.length > 1 ? (
            <ProbabilitySparkline data={priceHistory} currentPrice={market.yesPrice} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">No data</span>
            </div>
          )}
        </div>
      </SquareCardContent>

      {/* Outcomes list - compact */}
      <div className="space-y-1 mb-2">
        {displayedOutcomes.map((outcome, i) => {
          const color = OUTCOME_COLORS[i % OUTCOME_COLORS.length];
          return (
            <OutcomeRow key={outcome.name} outcome={outcome} color={color} rank={i + 1} />
          );
        })}
        {remainingCount > 0 && (
          <div className="text-[10px] text-muted-foreground">
            +{remainingCount} more
          </div>
        )}
      </div>

      {/* Footer: Volume */}
      <SquareCardFooter className="pt-2 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground">Volume</span>
        <span className="text-xs font-semibold text-foreground">
          ${formatVolume(market.volume)}
        </span>
      </SquareCardFooter>
    </SquareCard>
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
 * SVG Sparkline for probability history (same as BetsCarouselCard)
 */
interface ProbabilitySparklineProps {
  data: MarketPricePoint[];
  currentPrice: number;
}

function ProbabilitySparkline({ data, currentPrice }: ProbabilitySparklineProps) {
  // Take last 30 data points max for clean visualization
  const points = data.slice(-30);
  if (points.length < 2) return null;

  const width = 200;
  const height = 60;
  const padding = 4;

  // Calculate min/max for y-axis (with some padding)
  const prices = points.map((p) => p.yesPrice);
  const minPrice = Math.max(0, Math.min(...prices) - 0.05);
  const maxPrice = Math.min(1, Math.max(...prices) + 0.05);
  const priceRange = maxPrice - minPrice || 0.1;

  // Generate SVG path
  const pathPoints = points.map((point, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.yesPrice - minPrice) / priceRange) * (height - padding * 2);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate area path (for fill)
  const areaPath = pathPoints + ` L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  // Current price y position
  const currentY = height - padding - ((currentPrice - minPrice) / priceRange) * (height - padding * 2);

  // Determine color based on trend
  const isPositive = prices[prices.length - 1] >= prices[0];
  const lineColor = isPositive ? '#22c55e' : '#ef4444';
  const fillColor = isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      {/* Grid line at 50% */}
      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />

      {/* Area fill */}
      <path d={areaPath} fill={fillColor} />

      {/* Line */}
      <path d={pathPoints} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Current price dot */}
      <circle cx={width - padding} cy={currentY} r={3} fill={lineColor} />
      <circle cx={width - padding} cy={currentY} r={5} fill={lineColor} fillOpacity={0.3} />
    </svg>
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
