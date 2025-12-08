import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PredictionMarket, WatchlistItem, MarketFilters } from '@/lib/types/prediction-markets';

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

  // Actions
  setFilters: (filters: Partial<MarketFilters>) => void;
  setSelectedMarket: (market: PredictionMarket | null) => void;
  setMarkets: (markets: PredictionMarket[]) => void;
  appendMarkets: (markets: PredictionMarket[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

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

      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      setSelectedMarket: (market) => set({ selectedMarket: market }),

      setMarkets: (markets) => set({ markets, hasMore: markets.length >= 20 }),

      appendMarkets: (newMarkets) =>
        set((state) => ({
          markets: [...state.markets, ...newMarkets],
          hasMore: newMarkets.length >= 20,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      addToWatchlist: (item) => {
        const newItem: WatchlistItem = {
          ...item,
          id: `pm-watch-${Date.now()}`,
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

      reset: () => set({ markets: [], selectedMarket: null, filters: defaultFilters, error: null }),
    }),
    {
      name: 'deepstack-prediction-markets',
      partialize: (state) => ({ watchlist: state.watchlist, filters: state.filters }),
    }
  )
);
