'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { BetsCarouselCard } from './BetsCarouselCard';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import { fetchTrendingMarkets } from '@/lib/api/prediction-markets';
import type { PredictionMarket } from '@/lib/types/prediction-markets';
import { ChevronLeft, ChevronRight, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

/**
 * BetsCarousel - Carousel of large market cards with probability charts
 *
 * Features:
 * - Shows 2 cards side by side per page
 * - Touch swipe navigation (mobile)
 * - Dot indicators for pages
 * - Arrow buttons for navigation
 * - Watchlist-first data source (falls back to trending)
 * - "View All" button to open full panel
 */

interface BetsCarouselProps {
  onMarketSelect?: (market: PredictionMarket) => void;
  onViewAll?: () => void;
  className?: string;
}

export function BetsCarousel({
  onMarketSelect,
  onViewAll,
  className,
}: BetsCarouselProps) {
  const [trendingMarkets, setTrendingMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } =
    usePredictionMarketsStore();

  // Fetch trending markets (fallback data source)
  const loadTrendingMarkets = async () => {
    try {
      setError(null);
      setLoading(true);
      const { markets } = await fetchTrendingMarkets({ limit: 10 });
      setTrendingMarkets(markets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markets');
      console.error('Failed to load trending markets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrendingMarkets();
    // Refresh every 2 minutes
    const interval = setInterval(loadTrendingMarkets, 120000);
    return () => clearInterval(interval);
  }, []);

  // Determine which markets to display
  // Priority: watchlist first, then fill with trending
  const getDisplayMarkets = useCallback((): PredictionMarket[] => {
    // Convert watchlist items to market format for display
    // Note: watchlist items don't have full market data, so we use trending for now
    // In the future, we'd fetch watchlist market details from API

    // For now, use trending markets as the data source
    // The watchlist integration will be added when we sync with Supabase
    return trendingMarkets;
  }, [trendingMarkets]);

  const displayMarkets = getDisplayMarkets();
  const totalPages = Math.ceil(displayMarkets.length / 2);

  // Handle pagination
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  const goNext = () => goToPage(currentPage + 1);
  const goPrev = () => goToPage(currentPage - 1);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left - go to next page
        goNext();
      } else {
        // Swiped right - go to previous page
        goPrev();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Handle watchlist toggle
  const handleToggleWatch = (market: PredictionMarket) => {
    if (isInWatchlist(market.platform, market.id)) {
      // Find the watchlist item to remove
      const item = watchlist.find(
        (w) => w.platform === market.platform && w.externalMarketId === market.id
      );
      if (item) {
        removeFromWatchlist(item.id);
      }
    } else {
      addToWatchlist({
        platform: market.platform,
        externalMarketId: market.id,
        marketTitle: market.title,
        marketCategory: market.category,
      });
    }
  };

  // Get current page markets
  const currentMarkets = displayMarkets.slice(currentPage * 2, currentPage * 2 + 2);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with View All */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {watchlist.length > 0 ? 'Your Bets' : 'Trending Bets'}
          </span>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          View All
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
          <p className="text-xs text-muted-foreground mb-2">{error}</p>
          <button
            onClick={loadTrendingMarkets}
            className="text-xs text-primary hover:text-primary/80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && displayMarkets.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No markets available</p>
        </div>
      )}

      {/* Carousel Content */}
      {!loading && !error && displayMarkets.length > 0 && (
        <>
          {/* Cards Container with Touch Support */}
          <div
            ref={carouselRef}
            className="flex-1 relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-300 ease-out h-full"
              style={{ transform: `translateX(-${currentPage * 100}%)` }}
            >
              {/* Render all pages */}
              {Array.from({ length: totalPages }).map((_, pageIndex) => (
                <div
                  key={pageIndex}
                  className="flex-shrink-0 w-full grid grid-cols-2 gap-3 px-0.5"
                >
                  {displayMarkets.slice(pageIndex * 2, pageIndex * 2 + 2).map((market) => (
                    <BetsCarouselCard
                      key={`${market.platform}-${market.id}`}
                      market={market}
                      isWatched={isInWatchlist(market.platform, market.id)}
                      onToggleWatch={() => handleToggleWatch(market)}
                      onClick={() => onMarketSelect?.(market)}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Arrow Buttons (only show if more than 1 page) */}
            {totalPages > 1 && (
              <>
                <button
                  onClick={goPrev}
                  disabled={currentPage === 0}
                  className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 z-10',
                    'p-1.5 rounded-full bg-background/80 backdrop-blur-sm',
                    'border border-border/50 shadow-sm',
                    'transition-all duration-200',
                    currentPage === 0
                      ? 'opacity-30 cursor-not-allowed'
                      : 'opacity-70 hover:opacity-100 hover:bg-background'
                  )}
                  title="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goNext}
                  disabled={currentPage === totalPages - 1}
                  className={cn(
                    'absolute right-0 top-1/2 -translate-y-1/2 z-10',
                    'p-1.5 rounded-full bg-background/80 backdrop-blur-sm',
                    'border border-border/50 shadow-sm',
                    'transition-all duration-200',
                    currentPage === totalPages - 1
                      ? 'opacity-30 cursor-not-allowed'
                      : 'opacity-70 hover:opacity-100 hover:bg-background'
                  )}
                  title="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Dot Indicators */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-200',
                    currentPage === index
                      ? 'bg-primary w-4'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  title={`Page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BetsCarousel;
