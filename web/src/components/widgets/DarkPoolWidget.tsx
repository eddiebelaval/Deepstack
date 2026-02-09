'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { EyeOff, Loader2, AlertTriangle } from 'lucide-react';

interface DarkPoolDay {
  date: string;
  short_volume: number;
  total_volume: number;
  short_ratio: number;
}

interface DarkPoolWidgetProps {
  symbol: string;
  className?: string;
}

const BEARISH_THRESHOLD = 0.5; // 50% short ratio

export function DarkPoolWidget({ symbol, className }: DarkPoolWidgetProps) {
  const [data, setData] = useState<DarkPoolDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDarkPool = useCallback(async () => {
    if (!symbol) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/signals/darkpool?ticker=${encodeURIComponent(symbol)}&days=14`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const days: DarkPoolDay[] = (json.data || json || []).map((d: any) => ({
        date: d.date || '',
        short_volume: d.short_volume ?? 0,
        total_volume: d.total_volume ?? 0,
        short_ratio: d.short_ratio ?? 0,
      }));

      // Ensure chronological order for the bar chart
      days.sort((a, b) => a.date.localeCompare(b.date));
      setData(days);
    } catch (err) {
      console.error('Dark pool fetch error:', err);
      setError('Failed to load dark pool data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchDarkPool();
  }, [fetchDarkPool]);

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const maxRatio = data.length > 0 ? Math.max(...data.map((d) => d.short_ratio), 0.6) : 1;

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-3 flex flex-col gap-2',
        className
      )}
      style={{ minHeight: '140px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Dark Pool Activity
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-medium">
          {symbol}
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && data.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">
          No dark pool data available
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && data.length > 0 && latest && (
        <>
          {/* Current ratio - prominent display */}
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-2xl font-bold font-mono',
                latest.short_ratio > BEARISH_THRESHOLD
                  ? 'text-red-500'
                  : 'text-foreground'
              )}
            >
              {(latest.short_ratio * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              short ratio
            </span>
            {latest.short_ratio > BEARISH_THRESHOLD && (
              <span className="text-[9px] text-red-500/80 font-medium ml-auto">
                Elevated
              </span>
            )}
          </div>

          {/* Bar chart - 14 day sparkline */}
          <div className="flex items-end gap-[3px] h-12">
            {data.map((day, idx) => {
              const height = maxRatio > 0 ? (day.short_ratio / maxRatio) * 100 : 0;
              const isBearish = day.short_ratio > BEARISH_THRESHOLD;

              return (
                <div
                  key={day.date || idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  <div
                    className={cn(
                      'w-full rounded-t-sm transition-colors',
                      isBearish
                        ? 'bg-red-500/70 group-hover:bg-red-500'
                        : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                    )}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                    <div className="bg-popover border border-border rounded px-1.5 py-0.5 text-[9px] font-mono whitespace-nowrap shadow-lg">
                      {day.date.slice(5)}: {(day.short_ratio * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 50% threshold line label */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/60">14-day range</span>
            <span className="text-[9px] text-red-500/40">50% threshold</span>
          </div>

          {/* Disclaimer */}
          <p className="text-[9px] text-muted-foreground/50 text-center">
            Prior trading day data via FINRA
          </p>
        </>
      )}
    </div>
  );
}

export default DarkPoolWidget;
