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
  searchMarkets as apiSearchMarkets,
  fetchMarketDetail,
} from '@/lib/api/prediction-markets';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

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

  const [isMockData, setIsMockData] = useState(false);

  /**
   * Load markets based on current filters
   */
  const loadMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { markets: fetchedMarkets, mock } = await fetchTrendingMarkets({
        category: filters.category || undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
        limit: 20,
      });

      setMarkets(fetchedMarkets);
      setIsMockData(!!mock);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  }, [filters, setMarkets, setLoading, setError]);

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
        const { markets: searchResults, mock } = await apiSearchMarkets(query);
        setMarkets(searchResults);
        setIsMockData(!!mock);
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
        const { market, mock } = await fetchMarketDetail(platform, marketId);
        setSelectedMarket(market as PredictionMarket);
        setIsMockData(!!mock);
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
    isMockData,

    // Loading states
    isLoading,
    error,

    // Actions
    loadMarkets,
    searchMarkets,
    loadMarketDetail,
    setFilters,
    setSelectedMarket,

    // Watchlist actions
    toggleWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistItem,
    isInWatchlist,
  };
}
