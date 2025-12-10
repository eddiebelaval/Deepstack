'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';
import { TrendingUp, TrendingDown, List } from 'lucide-react';

export function WatchlistWidget() {
  const { quotes } = useMarketDataStore();
  const { getActiveWatchlist } = useWatchlistStore();
  const watchlist = getActiveWatchlist();

  const symbols = watchlist?.items ?? [
    { symbol: 'SPY' },
    { symbol: 'QQQ' },
    { symbol: 'AAPL' },
    { symbol: 'NVDA' },
    { symbol: 'TSLA' },
    { symbol: 'AMD' },
  ];

  return (
    <div className="space-y-1">
      {symbols.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No symbols in watchlist</p>
        </div>
      ) : (
        symbols.slice(0, 8).map((item) => {
          const quote = quotes[item.symbol];
          const isPositive = (quote?.changePercent ?? 0) >= 0;

          return (
            <div
              key={item.symbol}
              className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <span className="font-medium text-sm">{item.symbol}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  ${quote?.last?.toFixed(2) ?? '—'}
                </span>
                {quote?.changePercent !== undefined && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-medium min-w-[60px] justify-end',
                      isPositive ? 'text-profit' : 'text-loss'
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? '+' : ''}
                    {quote.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Named export for flexibility
export default WatchlistWidget;
