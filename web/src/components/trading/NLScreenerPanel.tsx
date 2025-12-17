'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Search,
  Wand2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  History,
  X,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScreener } from '@/lib/stores/perplexity-finance-store';
import { useTradingStore } from '@/lib/stores/trading-store';

/**
 * NLScreenerPanel - Natural Language Stock Screener
 *
 * Features:
 * - Search stocks with natural language queries
 * - Example prompts for common screens
 * - Query history
 * - Click to view stock details
 */

// Example queries
const EXAMPLE_QUERIES = [
  'Tech stocks with P/E under 20 and revenue growth over 15%',
  'Dividend stocks yielding over 4% with low debt',
  'Small cap biotech companies with recent FDA approvals',
  'Value stocks in the energy sector with positive free cash flow',
  'Growth stocks with strong earnings momentum',
];

interface NLScreenerPanelProps {
  className?: string;
}

export function NLScreenerPanel({ className }: NLScreenerPanelProps) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    screenerResult,
    screenerLoading,
    screenerError,
    screenerHistory,
    runScreener,
    clearScreenerResult,
  } = useScreener();

  const { setActiveSymbol } = useTradingStore();

  const handleSearch = () => {
    if (!query.trim()) return;
    runScreener(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    textareaRef.current?.focus();
  };

  const handleHistoryClick = (historicalQuery: string) => {
    setQuery(historicalQuery);
    runScreener(historicalQuery);
  };

  const handleStockClick = (symbol: string) => {
    setActiveSymbol(symbol);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [query]);

  return (
    <div className={cn('h-full flex flex-col p-4 gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Stock Screener</h2>
        </div>
        {screenerResult && (
          <Button variant="ghost" size="sm" onClick={clearScreenerResult}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search Input */}
      <Card className="flex-shrink-0">
        <CardContent className="py-3 px-3">
          <div className="space-y-3">
            <Textarea
              ref={textareaRef}
              placeholder="Describe what kind of stocks you're looking for in plain English..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] max-h-[120px] text-sm resize-none"
              rows={2}
            />

            <div className="flex items-center justify-between gap-2">
              {/* Example Queries */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-1.5">
                  {EXAMPLE_QUERIES.slice(0, 3).map((example, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-6 px-2 whitespace-nowrap"
                      onClick={() => handleExampleClick(example)}
                    >
                      {example.slice(0, 30)}...
                    </Button>
                  ))}
                </div>
              </div>

              {/* Search Button */}
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={!query.trim() || screenerLoading}
              >
                {screenerLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5 mr-1" />
                )}
                Screen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {screenerHistory.length > 0 && !screenerResult && (
        <Card className="flex-shrink-0">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs flex items-center gap-2 text-muted-foreground">
              <History className="h-3 w-3" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <div className="flex flex-wrap gap-1.5">
              {screenerHistory.slice(0, 5).map((q, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-[10px] cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleHistoryClick(q)}
                >
                  {q.length > 40 ? q.slice(0, 40) + '...' : q}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="flex-1 min-h-0">
        {screenerError ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm">{screenerError}</span>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Retry
              </Button>
            </div>
          </Card>
        ) : screenerLoading ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                AI is screening stocks...
              </span>
            </div>
          </Card>
        ) : screenerResult ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="py-2 px-3 flex-shrink-0">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span className="truncate max-w-[300px]">
                    {screenerResult.query}
                  </span>
                </div>
                {screenerResult.mock && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
                    Mock
                  </span>
                )}
              </CardTitle>
            </CardHeader>

            <Separator />

            <ScrollArea className="flex-1 p-3">
              {/* Stock Results */}
              {screenerResult.stocks && screenerResult.stocks.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">
                    Matching Stocks ({screenerResult.stocks.length})
                  </h3>
                  <div className="space-y-2">
                    {screenerResult.stocks.map((stock, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                        onClick={() => handleStockClick(stock.symbol)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-medium text-sm">
                            {stock.symbol}
                          </span>
                          {stock.name !== stock.symbol && (
                            <span className="text-xs text-muted-foreground">
                              {stock.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {stock.price && (
                            <span className="text-xs text-muted-foreground">
                              ${stock.price.toFixed(2)}
                            </span>
                          )}
                          {stock.change !== undefined && (
                            <span
                              className={cn(
                                'text-xs flex items-center gap-0.5',
                                stock.change >= 0 ? 'text-green-500' : 'text-red-500'
                              )}
                            >
                              {stock.change >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {stock.change >= 0 ? '+' : ''}
                              {stock.change.toFixed(2)}%
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  AI Analysis
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {screenerResult.content}
                </p>
              </div>

              {/* Citations */}
              {screenerResult.citations && screenerResult.citations.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      Sources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {screenerResult.citations.map((citation, idx) => (
                        <a
                          key={idx}
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 px-2 py-1 rounded"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Source {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="px-3 py-2 border-t flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                Powered by Perplexity Finance
              </span>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-md">
              <Wand2 className="h-12 w-12 opacity-50" />
              <div className="text-center">
                <p className="text-sm font-medium">Natural Language Stock Screener</p>
                <p className="text-xs mt-1">
                  Describe what you&apos;re looking for in plain English and AI will find matching stocks
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_QUERIES.map((example, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleExampleClick(example)}
                  >
                    {example.slice(0, 35)}...
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default NLScreenerPanel;
