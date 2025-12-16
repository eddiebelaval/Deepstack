'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, Star, Loader2 } from 'lucide-react';

/**
 * ScreenerPicksWidget - Displays top screener results
 *
 * Features:
 * - Fetches real stock data from /api/screener
 * - Shows 3-4 top stocks with key metrics
 *
 * Usage:
 * <ScreenerPicksWidget />
 */

type ScreenerPick = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  metric: {
    label: string;
    value: string;
  };
  change: number;
  rating: number; // 1-5 stars based on performance
};

// Format volume to human-readable (e.g., 1.2M, 500K)
function formatVolume(vol: number): string {
  if (!vol) return '—';
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return vol.toString();
}

// Get star rating based on change percent
function getStarRating(changePercent: number): number {
  const absChange = Math.abs(changePercent || 0);
  if (absChange >= 5) return 5;
  if (absChange >= 3) return 4;
  if (absChange >= 1) return 3;
  if (absChange > 0) return 2;
  return 1;
}

export function ScreenerPicksWidget() {
  const [picks, setPicks] = useState<ScreenerPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchScreener() {
      try {
        const response = await fetch('/api/screener?sortBy=volume&sortOrder=desc');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();

        const mapped: ScreenerPick[] = (data.results || []).slice(0, 4).map((s: any, idx: number) => ({
          id: `${idx}`,
          symbol: s.symbol,
          name: s.name || s.symbol,
          price: s.price || 0,
          metric: {
            label: 'Vol',
            value: formatVolume(s.volume),
          },
          change: s.changePercent || 0,
          rating: getStarRating(s.changePercent),
        }));

        setPicks(mapped);
      } catch (err) {
        console.error('Screener fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScreener();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (picks.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No screener results</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {picks.map((pick) => {
        const isPositive = pick.change >= 0;

        return (
          <div
            key={pick.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{pick.symbol}</span>
                <div className="flex items-center">
                  {Array.from({ length: pick.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {pick.metric.label}:
                </span>
                <span className="text-xs font-mono font-medium">
                  {pick.metric.value}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-mono">
                ${pick.price.toFixed(2)}
              </span>
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                isPositive ? "text-profit" : "text-loss"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3 rotate-180" />
                )}
                {isPositive ? "+" : ""}
                {pick.change.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ScreenerPicksWidget;
