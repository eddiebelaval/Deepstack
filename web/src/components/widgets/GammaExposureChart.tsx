'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * GammaExposureChart - Horizontal bar chart of GEX by strike price
 *
 * Features:
 * - Fetches GEX data from /api/signals/gex?ticker={symbol}
 * - Horizontal bars: positive GEX (teal) vs negative GEX (red)
 * - Header stats: total GEX, regime, flip point
 * - Highlights max gamma strike, put wall, call wall
 * - Spot price marker row
 * - Loading skeleton + error state
 *
 * Usage:
 * <GammaExposureChart symbol="SPY" />
 */

// --- Types ---

interface GEXStrike {
  strike: number;
  gex: number;
  call_gex: number;
  put_gex: number;
}

interface GEXData {
  ticker: string;
  spot_price: number;
  total_gex: number;
  regime: string;
  flip_point: number | null;
  max_gamma_strike: number;
  put_wall: number;
  call_wall: number;
  strikes: GEXStrike[];
}

interface GammaExposureChartProps {
  symbol?: string;
  className?: string;
  maxBars?: number;
}

// --- Helpers ---

function formatGex(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatStrike(strike: number): string {
  return strike % 1 === 0 ? `$${strike}` : `$${strike.toFixed(1)}`;
}

// --- Loading Skeleton ---

function ChartSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {/* Header skeleton */}
      <div className="flex gap-4 mb-3">
        <div className="h-4 w-20 bg-muted/50 rounded" />
        <div className="h-4 w-16 bg-muted/50 rounded" />
        <div className="h-4 w-24 bg-muted/50 rounded" />
      </div>
      {/* Bar skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-3 w-10 bg-muted/50 rounded" />
          <div
            className="h-4 bg-muted/30 rounded"
            style={{ width: `${30 + Math.random() * 50}%` }}
          />
        </div>
      ))}
    </div>
  );
}

// --- Component ---

export function GammaExposureChart({
  symbol = 'SPY',
  className,
  maxBars = 25,
}: GammaExposureChartProps) {
  const [data, setData] = useState<GEXData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchGex() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/signals/gex?ticker=${symbol}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch GEX data (${response.status})`);
        }

        const json = await response.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('GEX fetch error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load GEX data');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchGex();
    return () => { cancelled = true; };
  }, [symbol]);

  // Filter and sort strikes around spot price
  const visibleStrikes = useMemo(() => {
    if (!data?.strikes?.length) return [];

    // Sort by strike ascending
    const sorted = [...data.strikes].sort((a, b) => a.strike - b.strike);

    // If too many, center around spot price
    if (sorted.length <= maxBars) return sorted;

    const spotIdx = sorted.findIndex((s) => s.strike >= data.spot_price);
    const center = spotIdx >= 0 ? spotIdx : Math.floor(sorted.length / 2);
    const half = Math.floor(maxBars / 2);
    const start = Math.max(0, Math.min(center - half, sorted.length - maxBars));

    return sorted.slice(start, start + maxBars);
  }, [data, maxBars]);

  // Max absolute GEX for scaling bars
  const maxAbsGex = useMemo(() => {
    if (!visibleStrikes.length) return 1;
    return Math.max(...visibleStrikes.map((s) => Math.abs(s.gex)), 1);
  }, [visibleStrikes]);

  // --- Render ---

  if (isLoading) {
    return (
      <div className={cn('glass-surface rounded-2xl p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Loading GEX for {symbol}...
          </span>
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={cn('glass-surface rounded-2xl p-4', className)}>
        <div className="text-center py-6 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-1">Could not load GEX data</p>
          <p className="text-xs text-muted-foreground/70">
            {error || 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  const isLongGamma = data.regime?.toLowerCase().includes('long');

  return (
    <div className={cn('glass-surface rounded-2xl p-4 flex flex-col gap-3', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          GEX - {symbol}
        </span>
      </div>

      {/* Key Levels */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Total GEX</span>
          <span className={cn(
            'font-mono font-semibold',
            data.total_gex >= 0 ? 'text-teal-400' : 'text-red-400'
          )}>
            {formatGex(data.total_gex)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Regime</span>
          <span className={cn(
            'font-semibold px-1.5 py-0.5 rounded text-[10px]',
            isLongGamma
              ? 'bg-teal-500/10 text-teal-400'
              : 'bg-red-500/10 text-red-400'
          )}>
            {data.regime}
          </span>
        </div>

        {data.flip_point != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Flip</span>
            <span className="font-mono font-medium">
              {formatStrike(data.flip_point)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Spot</span>
          <span className="font-mono font-medium">
            {formatStrike(data.spot_price)}
          </span>
        </div>
      </div>

      {/* Key Strikes Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span>
          Max Gamma: <span className="font-mono font-medium text-foreground">{formatStrike(data.max_gamma_strike)}</span>
        </span>
        <span>
          Put Wall: <span className="font-mono font-medium text-red-400">{formatStrike(data.put_wall)}</span>
        </span>
        <span>
          Call Wall: <span className="font-mono font-medium text-teal-400">{formatStrike(data.call_wall)}</span>
        </span>
      </div>

      {/* Chart */}
      <div className="space-y-[3px]">
        {visibleStrikes.map((strike) => {
          const barWidth = Math.abs(strike.gex) / maxAbsGex;
          const isPositive = strike.gex >= 0;
          const isSpot = Math.abs(strike.strike - data.spot_price) <=
            (visibleStrikes.length > 1
              ? Math.abs(visibleStrikes[1].strike - visibleStrikes[0].strike) / 2
              : 1);
          const isMaxGamma = strike.strike === data.max_gamma_strike;
          const isPutWall = strike.strike === data.put_wall;
          const isCallWall = strike.strike === data.call_wall;
          const hasLabel = isMaxGamma || isPutWall || isCallWall;

          return (
            <div
              key={strike.strike}
              className={cn(
                'flex items-center gap-1.5 group',
                isSpot && 'bg-primary/5 rounded -mx-1 px-1'
              )}
            >
              {/* Strike label */}
              <span
                className={cn(
                  'text-[10px] font-mono w-12 text-right flex-shrink-0',
                  isSpot ? 'font-bold text-primary' : 'text-muted-foreground'
                )}
              >
                {strike.strike}
              </span>

              {/* Bar container - centered layout with negative left, positive right */}
              <div className="flex-1 flex items-center h-[14px]">
                {/* Negative side (left half) */}
                <div className="w-1/2 flex justify-end">
                  {!isPositive && (
                    <div
                      className={cn(
                        'h-[12px] rounded-l transition-all',
                        'bg-red-500/70 group-hover:bg-red-500'
                      )}
                      style={{ width: `${barWidth * 100}%` }}
                    />
                  )}
                </div>

                {/* Center line */}
                <div className="w-px h-[14px] bg-border flex-shrink-0" />

                {/* Positive side (right half) */}
                <div className="w-1/2 flex justify-start">
                  {isPositive && (
                    <div
                      className={cn(
                        'h-[12px] rounded-r transition-all',
                        'bg-teal-500/70 group-hover:bg-teal-500'
                      )}
                      style={{ width: `${barWidth * 100}%` }}
                    />
                  )}
                </div>
              </div>

              {/* GEX value on hover / key strikes labeled */}
              <span
                className={cn(
                  'text-[9px] font-mono w-12 flex-shrink-0',
                  hasLabel ? 'visible' : 'invisible group-hover:visible',
                  isPositive ? 'text-teal-400' : 'text-red-400'
                )}
              >
                {formatGex(strike.gex)}
                {isMaxGamma && ' *'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spot price indicator note */}
      {data.spot_price > 0 && (
        <div className="text-[9px] text-muted-foreground/60 text-center">
          Highlighted row = current spot price ({formatStrike(data.spot_price)})
        </div>
      )}
    </div>
  );
}

export default GammaExposureChart;
