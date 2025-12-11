'use client';

import React, { useEffect, useRef, useCallback } from 'react';
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
  Bell,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNewsStore, NewsArticle, useNewsAutoRefresh } from '@/lib/stores/news-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { RelatedPredictionMarkets } from '@/components/news/RelatedPredictionMarkets';
import { motion, AnimatePresence } from 'framer-motion';

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
    isLoadingMore,
    error,
    filterSymbol,
    hasMore,
    newArticleCount,
    autoRefreshEnabled,
    fetchNews,
    loadMore,
    setFilterSymbol,
    clearFilter,
    markAsViewed,
    setAutoRefresh,
    checkForNewArticles,
  } = useNewsStore();
  const { activeSymbol, setActiveSymbol } = useTradingStore();
  const { interval } = useNewsAutoRefresh();

  const [searchSymbol, setSearchSymbol] = React.useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    fetchNews(filterSymbol || undefined, true);
  }, [filterSymbol, fetchNews]);

  // Auto-refresh: check for new articles every interval
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const checkInterval = setInterval(() => {
      checkForNewArticles();
    }, interval);

    return () => clearInterval(checkInterval);
  }, [autoRefreshEnabled, checkForNewArticles, interval]);

  // Infinite scroll: observe the load more trigger
  useEffect(() => {
    if (!loadMoreTriggerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, isLoading, loadMore]);

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

  const handleRefresh = useCallback(() => {
    fetchNews(filterSymbol || undefined, true);
    markAsViewed();
  }, [fetchNews, filterSymbol, markAsViewed]);

  const handleLoadNewArticles = useCallback(() => {
    fetchNews(filterSymbol || undefined, true);
    markAsViewed();
    // Scroll to top
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [fetchNews, filterSymbol, markAsViewed]);

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
          {/* Live indicator */}
          {autoRefreshEnabled && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefreshEnabled ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setAutoRefresh(!autoRefreshEnabled)}
            title={autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
          >
            <Bell className={cn('h-3 w-3', autoRefreshEnabled && 'text-green-400')} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-7"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* New articles notification banner */}
      <AnimatePresence>
        {newArticleCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-shrink-0"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 bg-primary/10 border-primary/30 hover:bg-primary/20 text-primary"
              onClick={handleLoadNewArticles}
            >
              <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
              {newArticleCount} new article{newArticleCount > 1 ? 's' : ''} available
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

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
        ) : isLoading && articles.length === 0 ? (
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
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="space-y-3">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onSymbolClick={handleSymbolClick}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}

              {/* Load more trigger (infinite scroll) */}
              <div ref={loadMoreTriggerRef} className="h-8 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading more...</span>
                  </div>
                )}
                {!hasMore && articles.length > 0 && (
                  <span className="text-xs text-muted-foreground">No more articles</span>
                )}
              </div>
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
