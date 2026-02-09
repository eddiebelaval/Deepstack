'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  Landmark,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  AlertCircle,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PoliticiansTradePanel - Congressional stock trading tracker
 *
 * Features:
 * - View recent congressional stock trades
 * - Filter by party, chamber, transaction type
 * - Search by politician name or stock symbol
 * - Links to official disclosures
 * - AI analysis of trading patterns
 *
 * Data sources: House/Senate disclosure reports (public record)
 */

// Types
interface PoliticianTrade {
  id: string;
  politician: string;
  party: 'D' | 'R' | 'I';
  chamber: 'House' | 'Senate';
  state: string;
  symbol: string;
  companyName: string;
  transactionType: 'purchase' | 'sale';
  transactionDate: string;
  disclosureDate: string;
  amountMin: number;
  amountMax: number;
  assetType: string;
  sourceUrl?: string;
}

interface TradesResponse {
  trades: PoliticianTrade[];
  total: number;
}

// Party colors
const PARTY_COLORS = {
  D: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  R: 'bg-red-500/20 text-red-600 dark:text-red-400',
  I: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
};

interface PoliticiansTradePanelProps {
  className?: string;
  symbolFilter?: string;
}

export function PoliticiansTradePanel({
  className,
  symbolFilter,
}: PoliticiansTradePanelProps) {
  const [trades, setTrades] = useState<PoliticianTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [partyFilter, setPartyFilter] = useState<string>('all');
  const [chamberFilter, setChamberFilter] = useState<string>('all');
  const [transactionFilter, setTransactionFilter] = useState<string>('all');

  // Fetch trades from DeepSignals congress endpoint
  const fetchTrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (symbolFilter) params.append('ticker', symbolFilter);
      if (partyFilter !== 'all') params.append('party', partyFilter);
      if (chamberFilter !== 'all') params.append('chamber', chamberFilter);
      if (transactionFilter !== 'all') params.append('type', transactionFilter);
      params.append('limit', '50');

      const response = await fetch(`/api/signals/congress?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch political trades');
      }

      const data = await response.json();

      // Backend returns snake_case CongressTrade fields — map to PoliticianTrade
      const rawTrades: Record<string, any>[] = Array.isArray(data)
        ? data
        : (data.trades || []);

      const mapped: PoliticianTrade[] = rawTrades.map((raw, i) => {
        const txType = (raw.transaction_type || raw.transactionType || '').toLowerCase();
        return {
          id: raw.id || `congress-${i}`,
          politician: raw.politician || '',
          party: raw.party || 'I',
          chamber: raw.chamber || 'House',
          state: raw.state || '',
          symbol: (raw.ticker || raw.symbol || '').toUpperCase(),
          companyName: raw.company_name || raw.companyName || '',
          transactionType: txType.includes('sale') ? 'sale' : 'purchase',
          transactionDate: raw.transaction_date || raw.transactionDate || '',
          disclosureDate: raw.disclosure_date || raw.disclosureDate || '',
          amountMin: raw.amount_min || raw.amountMin || 0,
          amountMax: raw.amount_max || raw.amountMax || 0,
          assetType: raw.asset_type || raw.assetType || 'Stock',
          sourceUrl: raw.source_url || raw.sourceUrl,
        };
      });

      // Sort by transaction date (newest first)
      mapped.sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      );

      setTrades(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades');
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  }, [symbolFilter, partyFilter, chamberFilter, transactionFilter]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Filter trades by search query
  const filteredTrades = trades.filter((trade) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trade.politician.toLowerCase().includes(query) ||
      trade.symbol.toLowerCase().includes(query) ||
      trade.companyName.toLowerCase().includes(query)
    );
  });

  // Format amount range
  const formatAmount = (min: number, max: number) => {
    const formatNum = (n: number) => {
      if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
      return `$${n}`;
    };
    return `${formatNum(min)} - ${formatNum(max)}`;
  };

  // Format date
  const formatDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className={cn('h-full flex flex-col p-4 gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Congressional Trading</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTrades}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card className="flex-shrink-0">
        <CardContent className="py-2 px-3">
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search politician or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>

            {/* Party Filter */}
            <Select value={partyFilter} onValueChange={setPartyFilter}>
              <SelectTrigger className="h-8 w-[120px] text-sm">
                <SelectValue placeholder="Party" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parties</SelectItem>
                <SelectItem value="D">Democrat</SelectItem>
                <SelectItem value="R">Republican</SelectItem>
                <SelectItem value="I">Independent</SelectItem>
              </SelectContent>
            </Select>

            {/* Chamber Filter */}
            <Select value={chamberFilter} onValueChange={setChamberFilter}>
              <SelectTrigger className="h-8 w-[120px] text-sm">
                <SelectValue placeholder="Chamber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chambers</SelectItem>
                <SelectItem value="House">House</SelectItem>
                <SelectItem value="Senate">Senate</SelectItem>
              </SelectContent>
            </Select>

            {/* Transaction Filter */}
            <Select value={transactionFilter} onValueChange={setTransactionFilter}>
              <SelectTrigger className="h-8 w-[120px] text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchases</SelectItem>
                <SelectItem value="sale">Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex-1 min-h-0">
        {error ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm">{error}</span>
              <Button variant="outline" size="sm" onClick={fetchTrades}>
                Retry
              </Button>
            </div>
          </Card>
        ) : isLoading ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Loading congressional trades...
              </span>
            </div>
          </Card>
        ) : filteredTrades.length === 0 ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Filter className="h-8 w-8 opacity-50" />
              <span className="text-sm">No trades match your filters</span>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex flex-col">
            <CardHeader className="py-2 px-3 flex-shrink-0">
              <CardTitle className="text-xs text-muted-foreground">
                {filteredTrades.length} trades found
              </CardTitle>
            </CardHeader>

            <Separator />

            <ScrollArea className="flex-1">
              <div className="divide-y">
                {filteredTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Politician & Transaction Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {trade.politician}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px]', PARTY_COLORS[trade.party])}
                          >
                            {trade.party}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {trade.chamber} • {trade.state}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              'text-xs font-medium flex items-center gap-1',
                              trade.transactionType === 'purchase'
                                ? 'text-green-500'
                                : 'text-red-500'
                            )}
                          >
                            {trade.transactionType === 'purchase' ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {trade.transactionType === 'purchase' ? 'Bought' : 'Sold'}
                          </span>
                          <span className="font-mono text-sm font-medium">
                            {trade.symbol}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {trade.companyName}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount & Date */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          {formatAmount(trade.amountMin, trade.amountMax)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatDate(trade.transactionDate)}
                        </div>
                      </div>
                    </div>

                    {/* Source Link */}
                    {trade.sourceUrl && (
                      <a
                        href={trade.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        View Disclosure
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-3 py-2 border-t">
              <span className="text-[10px] text-muted-foreground">
                Data from public congressional disclosure reports. Trading dates may differ from disclosure dates.
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default PoliticiansTradePanel;
