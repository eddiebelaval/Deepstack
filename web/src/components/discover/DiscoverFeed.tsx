'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useNewsStore } from '@/lib/stores/news-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { DiscoverHeroCard } from './DiscoverHeroCard';
import { DiscoverGridCard } from './DiscoverGridCard';
import { DiscoverHorizontalCard } from './DiscoverHorizontalCard';
import { Loader2, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

/**
 * DiscoverFeed - Mixed layout news feed
 *
 * Layout pattern (repeating):
 * 1. Hero card (article 0)
 * 2. 3-column grid (articles 1-3)
 * 3. Horizontal cards (articles 4-5)
 * 4. Another 3-column grid (articles 6-8)
 * 5. Horizontal cards (articles 9-10)
 * ... repeat
 */

export function DiscoverFeed() {
  const {
    articles,
    isLoading,
    isLoadingMore,
    error,
    filterSymbol,
    hasMore,
    fetchNews,
    loadMore,
    clearFilter,
    setFilterSymbol,
  } = useNewsStore();
  const { setActiveSymbol } = useTradingStore();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    fetchNews(filterSymbol || undefined, true);
  }, [filterSymbol, fetchNews]);

  // Infinite scroll observer
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

  const handleSymbolClick = useCallback(
    (symbol: string) => {
      setActiveSymbol(symbol);
      setFilterSymbol(symbol);
    },
    [setActiveSymbol, setFilterSymbol]
  );

  // Split articles into layout chunks
  const renderArticles = () => {
    if (articles.length === 0) return null;

    const elements: React.ReactNode[] = [];
    let index = 0;

    while (index < articles.length) {
      const chunkStart = index;

      // 1. Hero card (first article of chunk)
      if (articles[index]) {
        elements.push(
          <motion.div
            key={`hero-${articles[index].id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <DiscoverHeroCard
              article={articles[index]}
              onSymbolClick={handleSymbolClick}
            />
          </motion.div>
        );
        index++;
      }

      // 2. 3-column grid (next 3 articles)
      const gridArticles = articles.slice(index, index + 3);
      if (gridArticles.length > 0) {
        elements.push(
          <motion.div
            key={`grid-${chunkStart}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {gridArticles.map((article) => (
              <DiscoverGridCard
                key={article.id}
                article={article}
                onSymbolClick={handleSymbolClick}
              />
            ))}
          </motion.div>
        );
        index += gridArticles.length;
      }

      // 3. Horizontal cards (next 2 articles)
      const horizontalArticles = articles.slice(index, index + 2);
      if (horizontalArticles.length > 0) {
        elements.push(
          <motion.div
            key={`horizontal-${chunkStart}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="space-y-3"
          >
            {horizontalArticles.map((article) => (
              <DiscoverHorizontalCard
                key={article.id}
                article={article}
                onSymbolClick={handleSymbolClick}
              />
            ))}
          </motion.div>
        );
        index += horizontalArticles.length;
      }

      // 4. Another grid (next 3 articles)
      const gridArticles2 = articles.slice(index, index + 3);
      if (gridArticles2.length > 0) {
        elements.push(
          <motion.div
            key={`grid2-${chunkStart}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {gridArticles2.map((article) => (
              <DiscoverGridCard
                key={article.id}
                article={article}
                onSymbolClick={handleSymbolClick}
              />
            ))}
          </motion.div>
        );
        index += gridArticles2.length;
      }

      // 5. More horizontal cards (next 2 articles)
      const horizontalArticles2 = articles.slice(index, index + 2);
      if (horizontalArticles2.length > 0) {
        elements.push(
          <motion.div
            key={`horizontal2-${chunkStart}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="space-y-3"
          >
            {horizontalArticles2.map((article) => (
              <DiscoverHorizontalCard
                key={article.id}
                article={article}
                onSymbolClick={handleSymbolClick}
              />
            ))}
          </motion.div>
        );
        index += horizontalArticles2.length;
      }

      // Safety: if we didn't advance, break
      if (index === chunkStart) break;
    }

    return elements;
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-destructive">
        <p className="text-lg font-medium">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => fetchNews(filterSymbol || undefined, true)}
        >
          Try again
        </Button>
      </div>
    );
  }

  // Loading state (initial)
  if (isLoading && articles.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Newspaper className="h-16 w-16 opacity-30" />
        <p className="text-xl font-medium">No articles found</p>
        {filterSymbol && (
          <Button variant="outline" onClick={clearFilter}>
            Clear filter
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Articles with mixed layout */}
      {renderArticles()}

      {/* Load more trigger (infinite scroll) */}
      <div
        ref={loadMoreTriggerRef}
        className="h-16 flex items-center justify-center"
      >
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading more articles...</span>
          </div>
        )}
        {!hasMore && articles.length > 0 && (
          <span className="text-sm text-muted-foreground">
            You've reached the end
          </span>
        )}
      </div>
    </div>
  );
}

export default DiscoverFeed;
