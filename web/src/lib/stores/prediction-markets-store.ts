import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PredictionMarket, WatchlistItem, MarketFilters } from '@/lib/types/prediction-markets';

// Auto-refresh interval: 5 minutes
export const PREDICTION_REFRESH_INTERVAL = 5 * 60 * 1000;

// Counter for generating unique IDs
let watchlistIdCounter = 0;

interface PredictionMarketsState {
  // Data
  markets: PredictionMarket[];
  watchlist: WatchlistItem[];
  selectedMarket: PredictionMarket | null;

  // Filters
  filters: MarketFilters;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;

  // Auto-refresh
  lastFetchTime: number | null;
  autoRefreshEnabled: boolean;
  newMarketsCount: number;

  // Actions
  setFilters: (filters: Partial<MarketFilters>) => void;
  setSelectedMarket: (market: PredictionMarket | null) => void;
  setMarkets: (markets: PredictionMarket[]) => void;
  appendMarkets: (markets: PredictionMarket[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auto-refresh actions
  setLastFetchTime: (time: number) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setNewMarketsCount: (count: number) => void;
  markAsViewed: () => void;

  // Watchlist actions
  addToWatchlist: (item: Omit<WatchlistItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeFromWatchlist: (id: string) => void;
  updateWatchlistItem: (id: string, updates: Partial<WatchlistItem>) => void;
  isInWatchlist: (platform: string, externalMarketId: string) => boolean;

  // Reset
  reset: () => void;
}

const defaultFilters: MarketFilters = {
  source: 'all',
  category: null,
  status: 'active',
  search: '',
  sort: 'volume',
};

export const usePredictionMarketsStore = create<PredictionMarketsState>()(
  persist(
    (set, get) => ({
      markets: [],
      watchlist: [],
      selectedMarket: null,
      filters: defaultFilters,
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      error: null,
      lastFetchTime: null,
      autoRefreshEnabled: true,
      newMarketsCount: 0,

      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      setSelectedMarket: (market) => set({ selectedMarket: market }),

      setMarkets: (markets) => set({ markets, hasMore: markets.length >= 30, lastFetchTime: Date.now() }),

      appendMarkets: (newMarkets) =>
        set((state) => ({
          markets: [...state.markets, ...newMarkets],
          hasMore: newMarkets.length >= 30,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setLastFetchTime: (time) => set({ lastFetchTime: time }),

      setAutoRefresh: (enabled) => set({ autoRefreshEnabled: enabled }),

      setNewMarketsCount: (count) => set({ newMarketsCount: count }),

      markAsViewed: () => set({ newMarketsCount: 0 }),

      addToWatchlist: (item) => {
        watchlistIdCounter += 1;
        const newItem: WatchlistItem = {
          ...item,
          id: `pm-watch-${Date.now()}-${watchlistIdCounter}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ watchlist: [newItem, ...state.watchlist] }));
      },

      removeFromWatchlist: (id) =>
        set((state) => ({ watchlist: state.watchlist.filter((w) => w.id !== id) })),

      updateWatchlistItem: (id, updates) =>
        set((state) => ({
          watchlist: state.watchlist.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
          ),
        })),

      isInWatchlist: (platform, externalMarketId) =>
        get().watchlist.some(
          (w) => w.platform === platform && w.externalMarketId === externalMarketId
        ),

      reset: () => set({ markets: [], selectedMarket: null, filters: defaultFilters, error: null, newMarketsCount: 0 }),
    }),
    {
      name: 'deepstack-prediction-markets',
      partialize: (state) => ({ watchlist: state.watchlist, filters: state.filters, autoRefreshEnabled: state.autoRefreshEnabled }),
    }
  )
);
