import { create } from 'zustand';

export type ScreenerFilter = {
  marketCapMin?: number;
  marketCapMax?: number;
  peRatioMin?: number;
  peRatioMax?: number;
  volumeMin?: number;
  priceMin?: number;
  priceMax?: number;
  sector?: string;
  sortBy: 'marketCap' | 'volume' | 'change' | 'price';
  sortOrder: 'asc' | 'desc';
};

export type ScreenerResult = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio: number | null;
  sector: string;
};

interface ScreenerState {
  filters: ScreenerFilter;
  results: ScreenerResult[];
  isLoading: boolean;
  error: string | null;
  setFilter: <K extends keyof ScreenerFilter>(key: K, value: ScreenerFilter[K]) => void;
  resetFilters: () => void;
  runScreener: () => Promise<void>;
}

const defaultFilters: ScreenerFilter = {
  sortBy: 'volume',
  sortOrder: 'desc',
};

export const useScreenerStore = create<ScreenerState>((set, get) => ({
  filters: defaultFilters,
  results: [],
  isLoading: false,
  error: null,

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: defaultFilters, results: [], error: null }),

  runScreener: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();

      if (filters.marketCapMin) params.append('marketCapMin', filters.marketCapMin.toString());
      if (filters.marketCapMax) params.append('marketCapMax', filters.marketCapMax.toString());
      if (filters.peRatioMin) params.append('peRatioMin', filters.peRatioMin.toString());
      if (filters.peRatioMax) params.append('peRatioMax', filters.peRatioMax.toString());
      if (filters.volumeMin) params.append('volumeMin', filters.volumeMin.toString());
      if (filters.priceMin) params.append('priceMin', filters.priceMin.toString());
      if (filters.priceMax) params.append('priceMax', filters.priceMax.toString());
      if (filters.sector) params.append('sector', filters.sector);
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/screener?${params.toString()}`);
      if (!response.ok) throw new Error('Screener request failed');

      const data = await response.json();
      set({ results: data.results || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Screener failed',
        isLoading: false,
      });
    }
  },
}));
