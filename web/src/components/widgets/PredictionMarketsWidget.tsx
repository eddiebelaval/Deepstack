'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchTrendingMarkets } from '@/lib/api/prediction-markets';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

/**
 * PredictionMarketsWidget - Displays top prediction markets
 *
 * Shows 4 top markets by volume with current probability and platform
 * Fetches real data from Kalshi and Polymarket APIs
 *
 * Usage:
 * <PredictionMarketsWidget />
 */

export function PredictionMarketsWidget() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { markets: trendingMarkets } = await fetchTrendingMarkets({ limit: 4 });
      setMarkets(trendingMarkets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markets');
      console.error('Failed to load prediction markets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarkets();
    // Refresh every 2 minutes
    const interval = setInterval(loadMarkets, 120000);
    return () => clearInterval(interval);
  }, [loadMarkets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <AlertCircle className="h-5 w-5 text-red-400 mb-2" />
        <p className="text-xs text-muted-foreground mb-2">{error}</p>
        <button
          onClick={loadMarkets}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <TrendingUp className="h-5 w-5 text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">No markets available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {markets.map((market) => {
        const probability = Math.round(market.yesPrice * 100);
        const isHighProbability = probability >= 50;

        return (
          <a
            key={`${market.platform}-${market.id}`}
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-1 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer block"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium leading-tight flex-1 line-clamp-2">
                {market.title}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isHighProbability ? (
                  <TrendingUp className="h-3 w-3 text-profit" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-loss" />
                )}
                <span className={cn(
                  "text-sm font-mono font-semibold",
                  isHighProbability ? "text-profit" : "text-loss"
                )}>
                  {probability}%
                </span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground capitalize">
              {market.platform}
            </span>
          </a>
        );
      })}
    </div>
  );
}

export default PredictionMarketsWidget;
