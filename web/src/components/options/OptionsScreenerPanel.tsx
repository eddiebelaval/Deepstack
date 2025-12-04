'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Play,
  Filter,
  ChevronDown,
  X,
  Plus,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptionsScreenerStore } from '@/lib/stores/options-screener-store';
import { useOptionsStrategyStore } from '@/lib/stores/options-strategy-store';
import {
  OptionContract,
  formatStrike,
  formatDelta,
  formatIV,
  formatSpread,
  getMoneyessLabel,
} from '@/lib/types/options';

export function OptionsScreenerPanel() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [symbolInput, setSymbolInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    filters,
    results,
    totalCount,
    isLoading,
    hasRun,
    error,
    selectedContracts,
    setUnderlyingSymbols,
    addSymbol,
    removeSymbol,
    setOptionTypes,
    setDteRange,
    setMinVolume,
    setMinOpenInterest,
    setDeltaRange,
    setIvRange,
    setMaxBidAskSpread,
    setMoneyness,
    setSortBy,
    setSortOrder,
    setLimit,
    runScreen,
    selectContract,
    deselectContract,
    clearSelection,
  } = useOptionsScreenerStore();

  const { addLegFromContract } = useOptionsStrategyStore();

  const handleAddSymbol = () => {
    if (symbolInput.trim()) {
      addSymbol(symbolInput.trim());
      setSymbolInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSymbol();
    }
  };

  const handleAddToStrategy = (contract: OptionContract, action: 'buy' | 'sell') => {
    addLegFromContract(contract, action);
  };

  return (
    <div className="h-full flex flex-col p-4 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Options Screener
            <Badge variant="outline" className="text-xs font-normal">
              Filter & Analyze
            </Badge>
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Screen options by volume, Greeks, IV, and more
          </p>
        </div>
        <Button
          onClick={() => runScreen()}
          disabled={isLoading || filters.underlying_symbols.length === 0}
          size="lg"
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {isLoading ? 'Screening...' : 'Run Screen'}
        </Button>
      </div>

      {/* Symbols Input */}
      <div className="mb-4">
        <Label className="text-sm font-medium mb-2 block">Underlying Symbols</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Add symbol (e.g., SPY, AAPL)"
            className="max-w-xs"
          />
          <Button variant="outline" size="icon" onClick={handleAddSymbol}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.underlying_symbols.map((symbol) => (
            <Badge key={symbol} variant="secondary" className="gap-1 pr-1">
              {symbol}
              <button
                onClick={() => removeSymbol(symbol)}
                className="ml-1 hover:bg-muted rounded-sm p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', filtersOpen && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Option Type */}
                <div>
                  <Label className="text-xs">Option Type</Label>
                  <Select
                    value={filters.option_types?.join(',') || 'all'}
                    onValueChange={(v) =>
                      setOptionTypes(v === 'all' ? undefined : v.split(',') as ('call' | 'put')[])
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="call">Calls Only</SelectItem>
                      <SelectItem value="put">Puts Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* DTE Range */}
                <div>
                  <Label className="text-xs">Min DTE</Label>
                  <Input
                    type="number"
                    value={filters.min_dte}
                    onChange={(e) => setDteRange(parseInt(e.target.value) || 0, filters.max_dte)}
                    className="mt-1"
                    min={0}
                  />
                </div>
                <div>
                  <Label className="text-xs">Max DTE</Label>
                  <Input
                    type="number"
                    value={filters.max_dte}
                    onChange={(e) => setDteRange(filters.min_dte, parseInt(e.target.value) || 60)}
                    className="mt-1"
                    min={0}
                  />
                </div>

                {/* Min Volume */}
                <div>
                  <Label className="text-xs">Min Volume</Label>
                  <Input
                    type="number"
                    value={filters.min_volume}
                    onChange={(e) => setMinVolume(parseInt(e.target.value) || 0)}
                    className="mt-1"
                    min={0}
                  />
                </div>

                {/* Min OI */}
                <div>
                  <Label className="text-xs">Min Open Interest</Label>
                  <Input
                    type="number"
                    value={filters.min_open_interest}
                    onChange={(e) => setMinOpenInterest(parseInt(e.target.value) || 0)}
                    className="mt-1"
                    min={0}
                  />
                </div>

                {/* Delta Range */}
                <div>
                  <Label className="text-xs">Min Delta</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={filters.min_delta ?? ''}
                    onChange={(e) =>
                      setDeltaRange(e.target.value ? parseFloat(e.target.value) : undefined, filters.max_delta)
                    }
                    className="mt-1"
                    placeholder="-1 to 1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Delta</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={filters.max_delta ?? ''}
                    onChange={(e) =>
                      setDeltaRange(filters.min_delta, e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="mt-1"
                    placeholder="-1 to 1"
                  />
                </div>

                {/* IV Range */}
                <div>
                  <Label className="text-xs">Min IV (%)</Label>
                  <Input
                    type="number"
                    step="5"
                    value={filters.min_iv ? filters.min_iv * 100 : ''}
                    onChange={(e) =>
                      setIvRange(e.target.value ? parseFloat(e.target.value) / 100 : undefined, filters.max_iv)
                    }
                    className="mt-1"
                    placeholder="e.g., 20"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max IV (%)</Label>
                  <Input
                    type="number"
                    step="5"
                    value={filters.max_iv ? filters.max_iv * 100 : ''}
                    onChange={(e) =>
                      setIvRange(filters.min_iv, e.target.value ? parseFloat(e.target.value) / 100 : undefined)
                    }
                    className="mt-1"
                    placeholder="e.g., 80"
                  />
                </div>

                {/* Max Spread */}
                <div>
                  <Label className="text-xs">Max Spread (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={filters.max_bid_ask_spread_pct ?? ''}
                    onChange={(e) =>
                      setMaxBidAskSpread(e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="mt-1"
                    placeholder="e.g., 10"
                  />
                </div>

                {/* Moneyness */}
                <div>
                  <Label className="text-xs">Moneyness</Label>
                  <Select
                    value={filters.moneyness?.join(',') || 'all'}
                    onValueChange={(v) =>
                      setMoneyness(v === 'all' ? undefined : v.split(',') as ('itm' | 'atm' | 'otm')[])
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="itm">ITM Only</SelectItem>
                      <SelectItem value="atm">ATM Only</SelectItem>
                      <SelectItem value="otm">OTM Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div>
                  <Label className="text-xs">Sort By</Label>
                  <Select value={filters.sort_by} onValueChange={(v) => setSortBy(v as typeof filters.sort_by)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume">Volume</SelectItem>
                      <SelectItem value="open_interest">Open Interest</SelectItem>
                      <SelectItem value="delta">Delta</SelectItem>
                      <SelectItem value="iv">IV</SelectItem>
                      <SelectItem value="dte">DTE</SelectItem>
                      <SelectItem value="bid_ask_spread">Spread</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {!hasRun && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-card/50">
          <Filter className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Ready to Screen</p>
          <p className="text-sm max-w-md text-center mt-2">
            Add symbols and configure filters to find options matching your criteria.
          </p>
        </div>
      )}

      {hasRun && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Found {totalCount} contracts
            </span>
            {selectedContracts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear Selection ({selectedContracts.length})
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 -mx-4" viewportRef={scrollRef}>
            <div className="px-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 pr-2">Symbol</th>
                    <th className="pb-2 pr-2">Type</th>
                    <th className="pb-2 pr-2 text-right">Strike</th>
                    <th className="pb-2 pr-2 text-right">Exp</th>
                    <th className="pb-2 pr-2 text-right">DTE</th>
                    <th className="pb-2 pr-2 text-right">Bid</th>
                    <th className="pb-2 pr-2 text-right">Ask</th>
                    <th className="pb-2 pr-2 text-right">Vol</th>
                    <th className="pb-2 pr-2 text-right">OI</th>
                    <th className="pb-2 pr-2 text-right">Delta</th>
                    <th className="pb-2 pr-2 text-right">IV</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((contract) => (
                    <tr
                      key={contract.symbol}
                      className={cn(
                        'border-b border-border/50 hover:bg-muted/50',
                        selectedContracts.some((c) => c.symbol === contract.symbol) && 'bg-primary/10'
                      )}
                    >
                      <td className="py-2 pr-2 font-mono text-xs">{contract.underlying_symbol}</td>
                      <td className="py-2 pr-2">
                        <Badge
                          variant={contract.option_type === 'call' ? 'default' : 'secondary'}
                          className={cn(
                            'text-xs',
                            contract.option_type === 'call'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-red-600 hover:bg-red-700'
                          )}
                        >
                          {contract.option_type === 'call' ? 'C' : 'P'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 text-right font-mono">{formatStrike(contract.strike_price)}</td>
                      <td className="py-2 pr-2 text-right text-xs">{contract.expiration_date}</td>
                      <td className="py-2 pr-2 text-right">{contract.days_to_expiration}d</td>
                      <td className="py-2 pr-2 text-right font-mono text-green-500">
                        ${contract.bid?.toFixed(2) ?? '--'}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono text-red-500">
                        ${contract.ask?.toFixed(2) ?? '--'}
                      </td>
                      <td className="py-2 pr-2 text-right">{contract.volume?.toLocaleString() ?? '--'}</td>
                      <td className="py-2 pr-2 text-right">{contract.open_interest?.toLocaleString() ?? '--'}</td>
                      <td className="py-2 pr-2 text-right font-mono">{formatDelta(contract.delta)}</td>
                      <td className="py-2 pr-2 text-right">{formatIV(contract.implied_volatility)}</td>
                      <td className="py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-100/50"
                            onClick={() => handleAddToStrategy(contract, 'buy')}
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Buy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-100/50"
                            onClick={() => handleAddToStrategy(contract, 'sell')}
                          >
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Sell
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
