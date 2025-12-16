'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Loader2, TrendingUp } from 'lucide-react';

/**
 * DeepValuePicksWidget - Displays top undervalued stocks
 *
 * Features:
 * - Fetches stocks from /api/screener and highlights value metrics
 * - Shows 3-4 stocks with value indicators
 *
 * Usage:
 * <DeepValuePicksWidget />
 */

type ValuePick = {
  id: string;
  symbol: string;
  name: string;
  valueScore: number; // 0-100 derived from P/E
  upside: number; // percentage
  price: number;
};

// Calculate value score from P/E ratio (lower P/E = higher score)
function calculateValueScore(peRatio: number | undefined): number {
  if (!peRatio || peRatio <= 0) return 50; // Unknown = neutral
  if (peRatio < 10) return 95;
  if (peRatio < 15) return 85;
  if (peRatio < 20) return 75;
  if (peRatio < 30) return 60;
  if (peRatio < 50) return 40;
  return 20; // High P/E = low value score
}

export function DeepValuePicksWidget() {
  const [picks, setPicks] = useState<ValuePick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchValue() {
      try {
        const response = await fetch('/api/screener');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();

        // Sort by P/E ratio (value investing focus) and take top 4
        const sorted = (data.results || [])
          .filter((s: any) => s.peRatio && s.peRatio > 0)
          .sort((a: any, b: any) => (a.peRatio || 999) - (b.peRatio || 999));

        const mapped: ValuePick[] = sorted.slice(0, 4).map((s: any, idx: number) => ({
          id: `${idx}`,
          symbol: s.symbol,
          name: s.name || s.symbol,
          valueScore: calculateValueScore(s.peRatio),
          upside: Math.max(5, Math.round((30 - (s.peRatio || 20)) * 2)), // Estimated upside
          price: s.price || 0,
        }));

        setPicks(mapped);
      } catch (err) {
        console.error('Value fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchValue();
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
        <p>No value picks available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {picks.map((pick) => {
        const scoreColor =
          pick.valueScore >= 90 ? 'text-profit' :
            pick.valueScore >= 80 ? 'text-yellow-500' :
              'text-muted-foreground';

        return (
          <div
            key={pick.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{pick.symbol}</span>
                <span className={cn("text-xs font-mono font-semibold", scoreColor)}>
                  {pick.valueScore}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {pick.name}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-mono">
                ${pick.price.toFixed(2)}
              </span>
              <div className="flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3 text-profit" />
                <span className="text-xs font-medium text-profit">
                  +{pick.upside}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DeepValuePicksWidget;
