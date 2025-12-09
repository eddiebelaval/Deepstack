'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from './PlatformBadge';
import type { PredictionMarket, MarketPricePoint } from '@/lib/types/prediction-markets';
import { TrendingUp, TrendingDown, Minus, Star, StarOff, Loader2 } from 'lucide-react';

/**
 * BetsCarouselCard - Compact market card with probability sparkline chart
 *
 * Features:
 * - SVG sparkline showing YES probability over time
 * - Market title, current YES%, volume
 * - Platform badge
 * - Watchlist toggle
 * - Click to view market details
 *
 * Designed to fit within ~200px height for HomeWidgets carousel
 */

interface BetsCarouselCardProps {
  market: PredictionMarket;
  isWatched?: boolean;
  onToggleWatch?: () => void;
  onClick?: () => void;
  className?: string;
}

export function BetsCarouselCard({
  market,
  isWatched = false,
  onToggleWatch,
  onClick,
  className,
}: BetsCarouselCardProps) {
  const [priceHistory, setPriceHistory] = useState<MarketPricePoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch price history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Pass current price to API so it can generate synthetic history if needed
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

  const yesPercent = Math.round(market.yesPrice * 100);
  const priceChange = calculatePriceChange(priceHistory, market.yesPrice);

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
        <PlatformBadge platform={market.platform} size="sm" />
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

      {/* Title - single line with ellipsis */}
      <h3
        className="text-xs font-semibold text-foreground leading-tight line-clamp-2 mb-2 min-h-[2rem] shrink-0"
        title={market.title}
      >
        {market.title}
      </h3>

      {/* Sparkline Chart - flexible height */}
      <div className="flex-1 min-h-[50px] max-h-[70px] bg-muted/20 rounded-lg overflow-hidden mb-2">
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

      {/* Stats Row - compact */}
      <div className="flex items-end justify-between shrink-0">
        {/* Left: Price and change */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'text-xl font-bold tabular-nums leading-none',
                yesPercent >= 50 ? 'text-green-500' : 'text-red-500'
              )}
            >
              {yesPercent}%
            </span>
            <span className="text-[10px] text-muted-foreground">YES</span>
          </div>
          {priceChange !== null && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <PriceChangeIcon change={priceChange} />
              <span
                className={cn(
                  'text-[10px] font-medium',
                  priceChange > 0 ? 'text-green-500' : priceChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                )}
              >
                {priceChange > 0 ? '+' : ''}{priceChange}%
              </span>
            </div>
          )}
        </div>

        {/* Right: Volume */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-foreground leading-none">
            ${formatVolume(market.volume)}
          </span>
          <span className="text-[10px] text-muted-foreground">vol</span>
        </div>
      </div>
    </div>
  );
}

/**
 * SVG Sparkline for probability history
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
 * Price change icon
 */
function PriceChangeIcon({ change }: { change: number }) {
  if (change > 0) return <TrendingUp className="h-2.5 w-2.5 text-green-500" />;
  if (change < 0) return <TrendingDown className="h-2.5 w-2.5 text-red-500" />;
  return <Minus className="h-2.5 w-2.5 text-muted-foreground" />;
}

/**
 * Calculate 24h price change percentage
 */
function calculatePriceChange(history: MarketPricePoint[], currentPrice: number): number | null {
  if (history.length < 2) return null;

  // Find price from ~24h ago
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find the closest data point to 24h ago
  let oldestRelevant = history[0];
  for (const point of history) {
    const pointDate = new Date(point.timestamp);
    if (pointDate <= oneDayAgo) {
      oldestRelevant = point;
    } else {
      break;
    }
  }

  const oldPrice = oldestRelevant.yesPrice;
  if (oldPrice === 0) return null;

  const change = ((currentPrice - oldPrice) / oldPrice) * 100;
  return Math.round(change);
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

export default BetsCarouselCard;
