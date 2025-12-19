'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, RefreshCw, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { ChatTip } from '@/components/ui/chat-tip';
import { cn } from '@/lib/utils';
import { useScreenerStore, ScreenerResult } from '@/lib/stores/screener-store';
import { useTradingStore } from '@/lib/stores/trading-store';

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Industrials',
  'Energy',
  'Utilities',
  'Materials',
  'Real Estate',
  'Communication Services',
];

export function ScreenerPanel() {
  const {
    filters,
    results,
    isLoading,
    error,
    setFilter,
    resetFilters,
    runScreener,
  } = useScreenerStore();
  const { setActiveSymbol } = useTradingStore();

  // Run initial screener on mount
  useEffect(() => {
    if (results.length === 0) {
      runScreener();
    }
  }, [results.length, runScreener]);

  const handleSymbolClick = (symbol: string) => {
    setActiveSymbol(symbol);
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Stock Screener</h2>
          </div>
          <ChatTip
            example="Find stocks under $20 with high volume"
            moreExamples={['Screen for tech stocks', 'Show momentum plays']}
            className="mt-0.5 ml-7"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
          <Button size="sm" onClick={runScreener} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5 mr-1" />
            )}
            Screen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="flex-shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs">Min Price</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.priceMin ?? ''}
                onChange={(e) => setFilter('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Max Price</Label>
              <Input
                type="number"
                placeholder="Any"
                value={filters.priceMax ?? ''}
                onChange={(e) => setFilter('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Min Volume</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.volumeMin ?? ''}
                onChange={(e) => setFilter('volumeMin', e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Sector</Label>
              <Select
                value={filters.sector ?? 'all'}
                onValueChange={(v) => setFilter('sector', v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sort By</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(v) => setFilter('sortBy', v as any)}
              >
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="change">% Change</SelectItem>
                  <SelectItem value="marketCap">Market Cap</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Order</Label>
              <Select
                value={filters.sortOrder}
                onValueChange={(v) => setFilter('sortOrder', v as 'asc' | 'desc')}
              >
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex-1 min-h-0">
        {error ? (
          <div className="h-full flex items-center justify-center text-destructive">
            {error}
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <BarChart3 className="h-8 w-8 opacity-50" />
            <p className="text-sm">No results found</p>
            <p className="text-xs">Adjust filters and run screener</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {results.map((stock) => (
                <StockRow
                  key={stock.symbol}
                  stock={stock}
                  onClick={() => handleSymbolClick(stock.symbol)}
                  formatMarketCap={formatMarketCap}
                  formatVolume={formatVolume}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Results count */}
      {results.length > 0 && (
        <div className="flex-shrink-0 text-xs text-muted-foreground text-center">
          {results.length} results
        </div>
      )}
    </div>
  );
}

function StockRow({
  stock,
  onClick,
  formatMarketCap,
  formatVolume,
}: {
  stock: ScreenerResult;
  onClick: () => void;
  formatMarketCap: (v: number) => string;
  formatVolume: (v: number) => string;
}) {
  const isPositive = stock.changePercent >= 0;

  return (
    <button
      onClick={onClick}
      className="w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{stock.symbol}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {stock.sector}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm">${stock.price.toFixed(2)}</div>
        <div
          className={cn(
            'flex items-center justify-end gap-0.5 text-xs font-medium',
            isPositive ? 'text-green-500' : 'text-red-500'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isPositive ? '+' : ''}
          {stock.changePercent.toFixed(2)}%
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground hidden sm:block">
        <div>Vol: {formatVolume(stock.volume)}</div>
        <div>Cap: {formatMarketCap(stock.marketCap)}</div>
      </div>
    </button>
  );
}
