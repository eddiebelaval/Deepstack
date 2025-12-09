'use client';

import { useEffect, useState } from 'react';
import { Loader2, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchTrendingMarkets } from '@/lib/api/prediction-markets';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import type { PredictionMarket, Platform } from '@/lib/types/prediction-markets';
import { PlatformBadge } from './PlatformBadge';

/**
 * PredictionMarketsCompact - Compact grid view for HomeWidgets Predictions tab
 *
 * Features:
 * - 2-column grid of top 6 markets by volume
 * - Source filter pills (All | Kalshi | Polymarket)
 * - Each card shows: title (truncated), YES%, volume, platform badge
 * - Click card to select market
 * - "View All" button to open full panel
 *
 * Usage:
 * <PredictionMarketsCompact onViewAll={() => setActiveContent('prediction-markets')} />
 */

interface PredictionMarketsCompactProps {
  onMarketSelect?: (market: PredictionMarket) => void;
  onViewAll?: () => void;
  className?: string;
}

type SourceFilter = 'all' | 'kalshi' | 'polymarket';

export function PredictionMarketsCompact({
  onMarketSelect,
  onViewAll,
  className,
}: PredictionMarketsCompactProps) {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const { addToWatchlist, removeFromWatchlist, isInWatchlist } =
    usePredictionMarketsStore();

  const loadMarkets = async () => {
    try {
      setError(null);
      setLoading(true);
      const { markets: trendingMarkets } = await fetchTrendingMarkets({
        limit: 12, // Fetch extra to have options after filtering
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
      });
      setMarkets(trendingMarkets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markets');
      console.error('Failed to load prediction markets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [sourceFilter]);

  // Filter and slice to 6 for display
  const displayMarkets = markets.slice(0, 6);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with source filter pills and View All */}
      <div className="flex items-center justify-between mb-3">
        {/* Source Filter Pills */}
        <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/30">
          {[
            { key: 'all' as SourceFilter, label: 'All' },
            { key: 'kalshi' as SourceFilter, label: 'Kalshi' },
            { key: 'polymarket' as SourceFilter, label: 'Polymarket' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSourceFilter(filter.key)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-medium rounded-md transition-all',
                sourceFilter === filter.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* View All Button */}
        <button
          onClick={onViewAll}
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View All <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
            <p className="text-xs text-muted-foreground mb-2">{error}</p>
            <button
              onClick={loadMarkets}
              className="text-xs text-primary hover:text-primary/80"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && displayMarkets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <TrendingUp className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No markets available</p>
          </div>
        )}

        {!loading && !error && displayMarkets.length > 0 && (
          <div className="grid grid-cols-2 gap-2 h-full content-start">
            {displayMarkets.map((market) => (
              <CompactMarketCard
                key={market.id}
                market={market}
                isWatched={isInWatchlist(market.platform, market.id)}
                onClick={() => onMarketSelect?.(market)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CompactMarketCard - Individual market card for compact grid
 */
interface CompactMarketCardProps {
  market: PredictionMarket;
  isWatched: boolean;
  onClick: () => void;
}

function CompactMarketCard({ market, isWatched, onClick }: CompactMarketCardProps) {
  const truncateTitle = (title: string, maxLength = 40) => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength) + '...';
  };

  const yesPercent = Math.round(market.yesPrice * 100);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col p-2.5 rounded-lg transition-all duration-200 text-left',
        'border border-border/40 hover:border-border/60',
        'bg-card/60 hover:bg-card/80 hover:shadow-sm',
        isWatched && 'ring-1 ring-primary/30'
      )}
    >
      {/* Title Row with Platform Badge */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <h4
          className="text-[11px] font-medium text-foreground leading-tight line-clamp-2 flex-1"
          title={market.title}
        >
          {truncateTitle(market.title)}
        </h4>
        <PlatformBadge platform={market.platform} className="shrink-0 scale-75 origin-top-right" />
      </div>

      {/* Probability Bar */}
      <div className="flex w-full h-1 rounded-full overflow-hidden bg-muted/50 mb-1.5">
        <div
          className="bg-green-500 transition-all duration-300"
          style={{ width: `${yesPercent}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-300"
          style={{ width: `${100 - yesPercent}%` }}
        />
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-[10px]">
        <span className={cn(
          'font-semibold',
          yesPercent >= 50 ? 'text-green-500' : 'text-red-500'
        )}>
          {yesPercent}% Yes
        </span>
        <span className="text-muted-foreground">
          ${formatVolume(market.volume)}
        </span>
      </div>
    </button>
  );
}

/**
 * Format volume for compact display
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

export default PredictionMarketsCompact;
