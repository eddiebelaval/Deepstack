'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, Loader2, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * InsiderTradesWidget - Compact SEC insider trading feed
 *
 * Fetches from /api/signals/insider and displays a compact table.
 * If a symbol prop is passed, filters to that ticker.
 *
 * Usage:
 * <InsiderTradesWidget />             -- all recent insider trades
 * <InsiderTradesWidget symbol="AAPL" /> -- AAPL insider trades only
 */

interface InsiderTrade {
  insider_name: string;
  ticker: string;
  company_name: string;
  transaction_type: string; // "purchase" | "sale" | "P-Purchase" | "S-Sale"
  shares: number;
  value: number;
  filing_date: string;
  source_url?: string;
}

interface InsiderTradesWidgetProps {
  className?: string;
  symbol?: string;
}

function isBuy(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('purchase') || t.includes('buy') || t === 'p-purchase' || t.startsWith('p');
}

function formatValue(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function formatShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function InsiderTradesWidget({ className, symbol }: InsiderTradesWidgetProps) {
  const [trades, setTrades] = useState<InsiderTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsiderTrades() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ limit: '20' });
        if (symbol) params.set('ticker', symbol.toUpperCase());

        const response = await fetch(`/api/signals/insider?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        setTrades(data.trades || data || []);
        setError(null);
      } catch (err) {
        console.error('InsiderTradesWidget fetch error:', err);
        setError('Could not load insider trades');
        setTrades([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInsiderTrades();
  }, [symbol]);

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl flex flex-col overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Insider Trades{symbol ? ` - ${symbol}` : ''}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="text-xs text-muted-foreground text-center py-6">
          {error}
        </div>
      ) : trades.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">
          No insider trades found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left font-medium px-3 py-1.5">Insider</th>
                <th className="text-left font-medium px-2 py-1.5">Company</th>
                <th className="text-left font-medium px-2 py-1.5">Type</th>
                <th className="text-right font-medium px-2 py-1.5">Shares</th>
                <th className="text-right font-medium px-2 py-1.5">Value</th>
                <th className="text-right font-medium px-3 py-1.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => {
                const buy = isBuy(trade.transaction_type);
                return (
                  <tr
                    key={`${trade.ticker}-${trade.insider_name}-${idx}`}
                    className={cn(
                      'border-b border-border/20 hover:bg-muted/30 transition-colors',
                      buy ? 'border-l-2 border-l-green-500/50' : 'border-l-2 border-l-red-500/50',
                    )}
                  >
                    <td className="px-3 py-1.5 max-w-[140px] truncate">
                      <div className="flex items-center gap-1">
                        <span className="truncate">{trade.insider_name}</span>
                        {trade.source_url && (
                          <a
                            href={trade.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary flex-shrink-0"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-mono font-medium">{trade.ticker}</span>
                      <span className="text-muted-foreground ml-1 hidden sm:inline">
                        {trade.company_name}
                      </span>
                    </td>
                    <td className={cn(
                      'px-2 py-1.5 font-medium',
                      buy ? 'text-green-500' : 'text-red-500',
                    )}>
                      {buy ? 'Buy' : 'Sell'}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {formatShares(trade.shares)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {trade.value ? formatValue(trade.value) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {formatDate(trade.filing_date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InsiderTradesWidget;
