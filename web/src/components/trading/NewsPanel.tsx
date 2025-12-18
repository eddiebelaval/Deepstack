'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  RefreshCw,
  X,
  Search,
  Bell,
  ChevronUp,
  Sparkles,
  Newspaper,
  Cpu,
  TrendingUp,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useNewsStore,
  useNewsAutoRefresh,
  NewsSourceFilter,
} from '@/lib/stores/news-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { DiscoverCard } from '@/components/news/DiscoverCard';
import { DiscoverFeed } from '@/components/discover/DiscoverFeed';
import { DiscoverHeader } from '@/components/discover/DiscoverHeader';
import { useIsMobile } from '@/hooks/useIsMobile';
import { motion, AnimatePresence } from 'framer-motion';

// Perplexity-style category tabs
const CATEGORY_TABS = [
  { value: 'all', label: 'For You', icon: Sparkles },
  { value: 'api', label: 'Top Stories', icon: Newspaper },
  { value: 'rss', label: 'Tech & Business', icon: Cpu },
  { value: 'social', label: 'Trending', icon: TrendingUp },
] as const;

type ViewMode = 'discover' | 'compact';

export function NewsPanel() {
  const {
    articles,
    isLoading,
    isLoadingMore,
    error,
    filterSymbol,
    sourceFilter,
    includeSocial,
    totalFetched,
    totalReturned,
    hasMore,
    newArticleCount,
    autoRefreshEnabled,
    fetchNews,
    loadMore,
    setFilterSymbol,
    clearFilter,
    setSourceFilter,
    setIncludeSocial,
    markAsViewed,
    setAutoRefresh,
    checkForNewArticles,
  } = useNewsStore();
  const { setActiveSymbol } = useTradingStore();
  const { interval } = useNewsAutoRefresh();
  const { isMobile, isTablet, isDesktop } = useIsMobile();

  // Use full Discover layout for tablet and desktop
  const useFullDiscoverLayout = isDesktop || isTablet;

  const [searchSymbol, setSearchSymbol] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());
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

  // Include social when not on social tab
  useEffect(() => {
    if (sourceFilter !== 'social') {
      setIncludeSocial(true);
    }
  }, [sourceFilter, setIncludeSocial]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      setFilterSymbol(searchSymbol.toUpperCase().trim());
      setSearchSymbol('');
    }
  };

  const handleSymbolClick = (symbol: string) => {
    setActiveSymbol(symbol);
    setFilterSymbol(symbol);
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

  const handleCategoryChange = (category: string) => {
    setSourceFilter(category as NewsSourceFilter);
  };

  const toggleLike = (articleId: string) => {
    setLikedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  };

  // Desktop/Tablet: Full Discover layout (full-width feed, no sidebar - widgets are in main UI)
  if (useFullDiscoverLayout) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header with tabs */}
        <DiscoverHeader />

        {/* Full-width feed area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <DiscoverFeed />
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Mobile: Original card-based layout
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-2 space-y-3">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Discover</h1>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('discover')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'discover'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'compact'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Auto-refresh toggle */}
            <Button
              variant={autoRefreshEnabled ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setAutoRefresh(!autoRefreshEnabled)}
              title={autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
            >
              <Bell className={cn('h-4 w-4', autoRefreshEnabled && 'text-primary-foreground')} />
            </Button>

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Category Tabs - Perplexity style */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = sourceFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleCategoryChange(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
            placeholder="Search by ticker symbol..."
            className="pl-10 h-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </form>

        {/* Active Filter Badge */}
        {filterSymbol && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 pr-1">
              <span>Filtering: ${filterSymbol}</span>
              <button
                onClick={clearFilter}
                className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
            <span className="text-xs text-muted-foreground">
              {totalReturned} of {totalFetched} articles
            </span>
          </div>
        )}

        {/* New Articles Banner */}
        <AnimatePresence>
          {newArticleCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
            >
              <Button
                variant="outline"
                className="w-full h-10 bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                onClick={handleLoadNewArticles}
              >
                <ChevronUp className="h-4 w-4 mr-2" />
                {newArticleCount} new article{newArticleCount > 1 ? 's' : ''} available
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Indicator */}
        {autoRefreshEnabled && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-muted-foreground">Live updates enabled</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {error ? (
          <div className="h-full flex items-center justify-center text-destructive p-4">
            <p>{error}</p>
          </div>
        ) : isLoading && articles.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-4">
            <Newspaper className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">No articles found</p>
            {filterSymbol && (
              <Button variant="outline" onClick={clearFilter}>
                Clear filter
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-full" ref={scrollRef}>
            <div
              className={cn(
                'p-4 pt-2',
                viewMode === 'discover' ? 'space-y-4' : 'space-y-2'
              )}
            >
              {viewMode === 'discover' ? (
                // Discover (card) view
                articles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <DiscoverCard
                      article={article}
                      isLiked={likedArticles.has(article.id)}
                      onToggleLike={() => toggleLike(article.id)}
                      onSymbolClick={handleSymbolClick}
                    />
                  </motion.div>
                ))
              ) : (
                // Compact (list) view
                articles.map((article) => (
                  <CompactArticleCard
                    key={article.id}
                    article={article}
                    onSymbolClick={handleSymbolClick}
                  />
                ))
              )}

              {/* Load more trigger (infinite scroll) */}
              <div ref={loadMoreTriggerRef} className="h-12 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
                {!hasMore && articles.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    You&apos;ve reached the end
                  </span>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// Compact card for list view (preserves original dense layout)
function CompactArticleCard({
  article,
  onSymbolClick,
}: {
  article: ReturnType<typeof useNewsStore.getState>['articles'][0];
  onSymbolClick: (symbol: string) => void;
}) {
  const [imageError, setImageError] = useState(false);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {article.imageUrl && !imageError && (
          <div className="w-20 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
            <Image
              src={article.imageUrl}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Headline */}
          <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {article.headline}
          </h3>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>{article.source}</span>
            <span>·</span>
            <span>{formatTimeAgo(article.publishedAt)}</span>
            {article.symbols && article.symbols.length > 0 && (
              <>
                <span>·</span>
                <div className="flex gap-1">
                  {article.symbols.slice(0, 2).map((symbol) => (
                    <Badge
                      key={symbol}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSymbolClick(symbol);
                      }}
                    >
                      {symbol}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
