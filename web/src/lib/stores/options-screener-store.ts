import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ScreenerFilters,
  OptionContract,
  DEFAULT_SCREENER_FILTERS,
  OptionType,
  Moneyness,
  SortBy,
  SortOrder,
} from '../types/options';

type OptionsScreenerState = {
  // Filters
  filters: ScreenerFilters;

  // Results
  results: OptionContract[];
  totalCount: number;

  // Loading state
  isLoading: boolean;
  hasRun: boolean;
  error: string | null;

  // Filter actions
  setUnderlyingSymbols: (symbols: string[]) => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  setOptionTypes: (types: OptionType[] | undefined) => void;
  setDteRange: (min: number, max: number) => void;
  setMinVolume: (volume: number) => void;
  setMinOpenInterest: (oi: number) => void;
  setDeltaRange: (min: number | undefined, max: number | undefined) => void;
  setIvRange: (min: number | undefined, max: number | undefined) => void;
  setMaxBidAskSpread: (pct: number | undefined) => void;
  setMoneyness: (moneyness: Moneyness[] | undefined) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setLimit: (limit: number) => void;
  resetFilters: () => void;

  // Screen action
  runScreen: () => Promise<void>;
  clearResults: () => void;

  // Select contract for strategy builder
  selectedContracts: OptionContract[];
  selectContract: (contract: OptionContract) => void;
  deselectContract: (symbol: string) => void;
  clearSelection: () => void;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useOptionsScreenerStore = create<OptionsScreenerState>()(
  persist(
    (set, get) => ({
      // Initial state
      filters: { ...DEFAULT_SCREENER_FILTERS },
      results: [],
      totalCount: 0,
      isLoading: false,
      hasRun: false,
      error: null,
      selectedContracts: [],

      // Filter setters
      setUnderlyingSymbols: (symbols) =>
        set((state) => ({
          filters: { ...state.filters, underlying_symbols: symbols },
        })),

      addSymbol: (symbol) =>
        set((state) => {
          const upper = symbol.toUpperCase();
          if (state.filters.underlying_symbols.includes(upper)) return state;
          return {
            filters: {
              ...state.filters,
              underlying_symbols: [...state.filters.underlying_symbols, upper],
            },
          };
        }),

      removeSymbol: (symbol) =>
        set((state) => ({
          filters: {
            ...state.filters,
            underlying_symbols: state.filters.underlying_symbols.filter(
              (s) => s !== symbol.toUpperCase()
            ),
          },
        })),

      setOptionTypes: (types) =>
        set((state) => ({
          filters: { ...state.filters, option_types: types },
        })),

      setDteRange: (min, max) =>
        set((state) => ({
          filters: { ...state.filters, min_dte: min, max_dte: max },
        })),

      setMinVolume: (volume) =>
        set((state) => ({
          filters: { ...state.filters, min_volume: volume },
        })),

      setMinOpenInterest: (oi) =>
        set((state) => ({
          filters: { ...state.filters, min_open_interest: oi },
        })),

      setDeltaRange: (min, max) =>
        set((state) => ({
          filters: { ...state.filters, min_delta: min, max_delta: max },
        })),

      setIvRange: (min, max) =>
        set((state) => ({
          filters: { ...state.filters, min_iv: min, max_iv: max },
        })),

      setMaxBidAskSpread: (pct) =>
        set((state) => ({
          filters: { ...state.filters, max_bid_ask_spread_pct: pct },
        })),

      setMoneyness: (moneyness) =>
        set((state) => ({
          filters: { ...state.filters, moneyness },
        })),

      setSortBy: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sort_by: sortBy },
        })),

      setSortOrder: (order) =>
        set((state) => ({
          filters: { ...state.filters, sort_order: order },
        })),

      setLimit: (limit) =>
        set((state) => ({
          filters: { ...state.filters, limit },
        })),

      resetFilters: () =>
        set({
          filters: { ...DEFAULT_SCREENER_FILTERS },
        }),

      // Run screener
      runScreen: async () => {
        const { filters } = get();

        if (filters.underlying_symbols.length === 0) {
          set({ error: 'Please add at least one symbol to screen' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/api/options/screen`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(filters),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
          }

          const data = await response.json();

          set({
            results: data.contracts,
            totalCount: data.total_count,
            hasRun: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Options screen failed:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Screen failed',
          });
        }
      },

      clearResults: () =>
        set({
          results: [],
          totalCount: 0,
          hasRun: false,
          error: null,
        }),

      // Selection for strategy builder
      selectContract: (contract) =>
        set((state) => {
          // Don't add duplicates
          if (state.selectedContracts.some((c) => c.symbol === contract.symbol)) {
            return state;
          }
          return {
            selectedContracts: [...state.selectedContracts, contract],
          };
        }),

      deselectContract: (symbol) =>
        set((state) => ({
          selectedContracts: state.selectedContracts.filter(
            (c) => c.symbol !== symbol
          ),
        })),

      clearSelection: () =>
        set({ selectedContracts: [] }),
    }),
    {
      name: 'deepstack-options-screener-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist filters, not results
        filters: state.filters,
      }),
    }
  )
);
