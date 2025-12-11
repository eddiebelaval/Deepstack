'use client';

import { useEffect, useState } from 'react';
import {
  SquareCard,
  SquareCardHeader,
  SquareCardContent,
  SquareCardFooter,
  SquareCardTitle,
  SquareCardActionButton,
} from '@/components/ui/square-card';
import { PlatformBadge } from './PlatformBadge';
import type { PredictionMarket, MarketPricePoint } from '@/lib/types/prediction-markets';
import { Star, StarOff, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

/**
 * ScalarMarketCard - Displays range/scalar markets with Long/Short outcomes
 *
 * Now uses unified SquareCard component for consistent 1:1 aspect ratio
 *
 * Features:
 * - Sparkline showing implied value movement over time
 * - Visual range bounds (e.g., $5K - $15K)
 * - Current implied price point
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
  const [priceHistory, setPriceHistory] = useState<MarketPricePoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch price history on mount - must be before early return
  useEffect(() => {
    // Guard clause: skip if no bounds (market is invalid)
    if (!market.scalarBounds) {
      return;
    }

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
        console.error('Failed to load price history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [market.platform, market.id, market.yesPrice, market.title, market.scalarBounds]);

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
            Range
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

      {/* Sparkline Chart showing implied value movement */}
      <SquareCardContent className="mb-2">
        <div className="h-full bg-muted/20 rounded-lg overflow-hidden">
          {isLoadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : priceHistory.length > 1 ? (
            <ProbabilitySparkline data={priceHistory} currentPrice={longPrice} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">No data</span>
            </div>
          )}
        </div>
      </SquareCardContent>

      {/* Range indicator with current value */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{formatBound(bounds.lower)}</span>
          <span className="font-medium text-foreground">{formatBound(impliedValue)}</span>
          <span>{formatBound(bounds.upper)}</span>
        </div>
      </div>

      {/* Long/Short sentiment - compact */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 flex items-center gap-1 p-1 rounded bg-green-500/10">
          <ArrowUp className="h-3 w-3 text-green-500 shrink-0" />
          <span className="text-[10px] font-semibold text-green-500 ml-auto">
            {Math.round(longPrice * 100)}%
          </span>
        </div>
        <div className="flex-1 flex items-center gap-1 p-1 rounded bg-red-500/10">
          <ArrowDown className="h-3 w-3 text-red-500 shrink-0" />
          <span className="text-[10px] font-semibold text-red-500 ml-auto">
            {Math.round(shortPrice * 100)}%
          </span>
        </div>
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

export default ScalarMarketCard;
