'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Newspaper,
  Loader2,
  RefreshCw,
  ExternalLink,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNewsStore, NewsArticle } from '@/lib/stores/news-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { RelatedPredictionMarkets } from '@/components/news/RelatedPredictionMarkets';

const SENTIMENT_CONFIG = {
  positive: {
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  negative: {
    icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  neutral: {
    icon: Minus,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
  },
};

export function NewsPanel() {
  const {
    articles,
    isLoading,
    error,
    filterSymbol,
    fetchNews,
    setFilterSymbol,
    clearFilter,
  } = useNewsStore();
  const { activeSymbol, setActiveSymbol } = useTradingStore();

  const [searchSymbol, setSearchSymbol] = React.useState('');

  useEffect(() => {
    fetchNews(filterSymbol || undefined);
  }, [filterSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      setFilterSymbol(searchSymbol.toUpperCase().trim());
      setSearchSymbol('');
    }
  };

  const handleSymbolClick = (symbol: string) => {
    setActiveSymbol(symbol);
  };

  const handleFilterByActiveSymbol = () => {
    if (activeSymbol) {
      setFilterSymbol(activeSymbol);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Market News</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchNews(filterSymbol || undefined)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 flex-shrink-0">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
            placeholder="Filter by symbol..."
            className="h-8 text-sm uppercase"
          />
          <Button type="submit" size="sm" variant="outline" className="h-8">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </form>
        {activeSymbol && !filterSymbol && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleFilterByActiveSymbol}
          >
            {activeSymbol}
          </Button>
        )}
      </div>

      {/* Active Filter */}
      {filterSymbol && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="gap-1">
            Filtered: {filterSymbol}
            <button
              onClick={clearFilter}
              className="ml-1 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* News List */}
      <div className="flex-1 min-h-0">
        {error ? (
          <div className="h-full flex items-center justify-center text-destructive">
            {error}
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Newspaper className="h-8 w-8 opacity-50" />
            <p className="text-sm">No news articles found</p>
            {filterSymbol && (
              <Button variant="outline" size="sm" onClick={clearFilter}>
                Clear Filter
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-3">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onSymbolClick={handleSymbolClick}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function ArticleCard({
  article,
  onSymbolClick,
  formatTimeAgo,
}: {
  article: NewsArticle;
  onSymbolClick: (symbol: string) => void;
  formatTimeAgo: (dateStr: string) => string;
}) {
  const sentiment = article.sentiment || 'neutral';
  const SentimentIcon = SENTIMENT_CONFIG[sentiment].icon;

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Sentiment indicator */}
        <div
          className={cn(
            'p-1.5 rounded-md border flex-shrink-0',
            SENTIMENT_CONFIG[sentiment].bgColor,
            SENTIMENT_CONFIG[sentiment].borderColor
          )}
        >
          <SentimentIcon
            className={cn('h-4 w-4', SENTIMENT_CONFIG[sentiment].color)}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Headline */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 flex items-start gap-1 group"
          >
            {article.headline}
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
          </a>

          {/* Summary */}
          {article.summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {article.summary}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {article.source}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(article.publishedAt)}
            </span>
            {article.symbols && article.symbols.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <div className="flex gap-1 flex-wrap">
                  {article.symbols.slice(0, 3).map((symbol) => (
                    <Badge
                      key={symbol}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary/10"
                      onClick={() => onSymbolClick(symbol)}
                    >
                      {symbol}
                    </Badge>
                  ))}
                  {article.symbols.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{article.symbols.length - 3}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Related Prediction Markets */}
          <RelatedPredictionMarkets
            headline={article.headline}
            summary={article.summary}
            symbols={article.symbols}
          />
        </div>
      </div>
    </div>
  );
}
