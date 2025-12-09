/**
 * usePredictionMarkets Hook
 *
 * React hook for fetching and managing prediction markets data.
 * Integrates with the Zustand store and API client.
 *
 * Usage Example:
 *
 * ```typescript
 * function MarketsPage() {
 *   const {
 *     markets,
 *     isLoading,
 *     error,
 *     loadMarkets,
 *     searchMarkets,
 *     filters,
 *     setFilters,
 *   } = usePredictionMarkets();
 *
 *   useEffect(() => {
 *     loadMarkets();
 *   }, [filters]);
 *
 *   return (
 *     <div>
 *       {markets.map(market => (
 *         <MarketCard key={market.id} market={market} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useCallback, useState } from 'react';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import {
  fetchTrendingMarkets,
  fetchNewMarkets,
  searchMarkets as apiSearchMarkets,
  fetchMarketDetail,
} from '@/lib/api/prediction-markets';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

export type FeedType = 'trending' | 'new';

export function usePredictionMarkets() {
  const {
    markets,
    watchlist,
    selectedMarket,
    filters,
    isLoading,
    error,
    setFilters,
    setMarkets,
    setLoading,
    setError,
    setSelectedMarket,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistItem,
    isInWatchlist,
  } = usePredictionMarketsStore();

  const [isUnavailable, setIsUnavailable] = useState(false);
  const [feedType, setFeedType] = useState<FeedType>('trending');

  /**
   * Load markets based on current filters and feed type
   */
  const loadMarkets = useCallback(async (feed: FeedType = feedType) => {
    setLoading(true);
    setError(null);

    try {
      const fetchFn = feed === 'new' ? fetchNewMarkets : fetchTrendingMarkets;
      const { markets: fetchedMarkets, unavailable } = await fetchFn({
        category: filters.category || undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
        limit: 20,
      });

      setMarkets(fetchedMarkets);
      setIsUnavailable(!!unavailable);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  }, [filters, feedType, setMarkets, setLoading, setError]);

  /**
   * Search markets by query
   */
  const searchMarkets = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        loadMarkets();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { markets: searchResults, unavailable } = await apiSearchMarkets(query);
        setMarkets(searchResults);
        setIsUnavailable(!!unavailable);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search markets');
      } finally {
        setLoading(false);
      }
    },
    [setMarkets, setLoading, setError, loadMarkets]
  );

  /**
   * Load detailed information for a market
   */
  const loadMarketDetail = useCallback(
    async (platform: string, marketId: string) => {
      setLoading(true);
      setError(null);

      try {
        const { market, unavailable } = await fetchMarketDetail(platform, marketId);
        setSelectedMarket(market as PredictionMarket);
        setIsUnavailable(!!unavailable);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load market detail');
        setSelectedMarket(null);
      } finally {
        setLoading(false);
      }
    },
    [setSelectedMarket, setLoading, setError]
  );

  /**
   * Toggle a market in the watchlist
   */
  const toggleWatchlist = useCallback(
    (market: PredictionMarket) => {
      if (isInWatchlist(market.platform, market.id)) {
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
    },
    [watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist]
  );

  return {
    // Data
    markets,
    watchlist,
    selectedMarket,
    filters,
    isUnavailable,
    feedType,

    // Loading states
    isLoading,
    error,

    // Actions
    loadMarkets,
    searchMarkets,
    loadMarketDetail,
    setFilters,
    setSelectedMarket,
    setFeedType,

    // Watchlist actions
    toggleWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistItem,
    isInWatchlist,
  };
}
