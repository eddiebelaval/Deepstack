'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ExternalLink, AlertCircle, Eye } from 'lucide-react';
import { fetchTrendingMarkets } from '@/lib/api/prediction-markets';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import type { PredictionMarket } from '@/lib/types/prediction-markets';
import { PlatformBadge } from './PlatformBadge';
import { ProbabilityBar } from './ProbabilityBar';

/**
 * PredictionMarketsWidget - Dashboard widget showing trending prediction markets
 *
 * Features:
 * - Shows top 5 trending markets by volume
 * - Displays probability bars and platform badges
 * - Shows watchlist count
 * - Auto-refreshes every 60 seconds
 * - Skeleton loading state
 * - Error state with retry
 *
 * Usage:
 * <PredictionMarketsWidget />
 */
export function PredictionMarketsWidget() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchlist = usePredictionMarketsStore((state) => state.watchlist);

  const loadMarkets = async () => {
    try {
      setError(null);
      const { markets: trendingMarkets } = await fetchTrendingMarkets({ limit: 5 });
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
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Prediction Markets
          </CardTitle>
          {watchlist.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Eye className="h-3 w-3" />
              {watchlist.length}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading && <LoadingState />}

        {error && !loading && (
          <ErrorState error={error} onRetry={loadMarkets} />
        )}

        {!loading && !error && markets.length === 0 && (
          <EmptyState />
        )}

        {!loading && !error && markets.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              {markets.map((market) => (
                <MarketItem key={market.id} market={market} />
              ))}
            </div>

            <Link href="/prediction-markets" className="block">
              <Button variant="outline" size="sm" className="w-full">
                View All Markets
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * MarketItem - Individual market row in the widget
 */
function MarketItem({ market }: { market: PredictionMarket }) {
  const truncateTitle = (title: string, maxLength = 50) => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength) + '...';
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 hover:bg-slate-900 transition-colors">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="text-sm font-medium text-slate-200 leading-tight"
            title={market.title}
          >
            {truncateTitle(market.title)}
          </h4>
          <PlatformBadge platform={market.platform} />
        </div>

        <ProbabilityBar yesPrice={market.yesPrice} compact />

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{market.category}</span>
          <span>Vol: ${formatVolume(market.volume)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * LoadingState - Skeleton loading state
 */
function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2 p-3 rounded-lg border border-slate-800">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ErrorState - Error display with retry button
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
      <p className="text-sm text-slate-400 mb-4">{error}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/**
 * EmptyState - No markets available
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <TrendingUp className="h-8 w-8 text-slate-600 mb-2" />
      <p className="text-sm text-slate-400">No markets available</p>
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
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toFixed(0);
}
