import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getCategoriesForTab,
  getSymbolsForCategory,
} from '@/lib/data/market-categories';

// Default symbol lists
const DEFAULT_INDICES = ['SPY', 'QQQ', 'DIA', 'IWM'];
const DEFAULT_CRYPTO = ['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD'];
const DEFAULT_ETFS = ['SPY', 'QQQ', 'GLD', 'TLT'];
const DEFAULT_CUSTOM = ['SPY', 'AAPL'];

// Display names for common symbols
export const SYMBOL_DISPLAY_NAMES: Record<string, string> = {
  // Market Indices
  'SPY': 'S&P 500',
  'QQQ': 'NASDAQ 100',
  'DIA': 'Dow Jones',
  'IWM': 'Russell 2000',
  'VIXY': 'Volatility',
  'VTI': 'Total Market',
  'EFA': 'EAFE',
  'EEM': 'Emerging',
  'GLD': 'Gold',
  'TLT': 'Treasuries',
  'XLF': 'Financials',
  'XLE': 'Energy',
  'XLK': 'Technology',
  'XLV': 'Healthcare',
  // Crypto
  'BTC/USD': 'Bitcoin',
  'ETH/USD': 'Ethereum',
  'DOGE/USD': 'Dogecoin',
  'XRP/USD': 'XRP',
  'SOL/USD': 'Solana',
  'ADA/USD': 'Cardano',
  'AVAX/USD': 'Avalanche',
  'DOT/USD': 'Polkadot',
  'MATIC/USD': 'Polygon',
  'LINK/USD': 'Chainlink',
};

// Get display name for a symbol
export function getSymbolDisplayName(symbol: string): string {
  return SYMBOL_DISPLAY_NAMES[symbol] || symbol;
}

type MarketWatchState = {
  // Symbol lists for each tab
  indices: string[];
  crypto: string[];
  etfs: string[];
  custom: string[];

  // Category selection for wheel navigation
  selectedCategoryIndex: {
    market: number;
    crypto: number;
    etfs: number;
  };

  // Edit mode state
  isEditMode: boolean;

  // Actions
  setIndices: (symbols: string[]) => void;
  setCrypto: (symbols: string[]) => void;
  setEtfs: (symbols: string[]) => void;
  setCustom: (symbols: string[]) => void;

  addSymbol: (tab: 'indices' | 'crypto' | 'etfs' | 'custom', symbol: string) => void;
  removeSymbol: (tab: 'indices' | 'crypto' | 'etfs' | 'custom', symbol: string) => void;
  reorderSymbols: (tab: 'indices' | 'crypto' | 'etfs' | 'custom', fromIndex: number, toIndex: number) => void;

  setSelectedCategory: (tab: 'market' | 'crypto' | 'etfs', index: number) => void;

  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;

  // Reset to defaults
  resetIndices: () => void;
  resetCrypto: () => void;
  resetEtfs: () => void;
  resetCustom: () => void;
  resetAll: () => void;
};

export const useMarketWatchStore = create<MarketWatchState>()(
  persist(
    (set, get) => ({
      // Initial state
      indices: DEFAULT_INDICES,
      crypto: DEFAULT_CRYPTO,
      etfs: DEFAULT_ETFS,
      custom: DEFAULT_CUSTOM,

      // Category selection state (default to first category in each tab)
      selectedCategoryIndex: {
        market: 0,
        crypto: 0,
        etfs: 0,
      },

      isEditMode: false,

      // Set entire lists
      setIndices: (symbols) => set({ indices: symbols.slice(0, 8) }),
      setCrypto: (symbols) => set({ crypto: symbols.slice(0, 8) }),
      setEtfs: (symbols) => set({ etfs: symbols.slice(0, 8) }),
      setCustom: (symbols) => set({ custom: symbols.slice(0, 8) }),

      // Add symbol to a tab (max 8)
      addSymbol: (tab, symbol) => {
        const normalizedSymbol = symbol.trim().toUpperCase();
        const currentList = get()[tab];

        // Don't add duplicates or exceed max
        if (currentList.includes(normalizedSymbol) || currentList.length >= 8) {
          return;
        }

        set({ [tab]: [...currentList, normalizedSymbol] });
      },

      // Remove symbol from a tab
      removeSymbol: (tab, symbol) => {
        const currentList = get()[tab];
        set({ [tab]: currentList.filter(s => s !== symbol) });
      },

      // Reorder symbols (drag and drop)
      reorderSymbols: (tab, fromIndex, toIndex) => {
        const currentList = [...get()[tab]];
        const [removed] = currentList.splice(fromIndex, 1);
        currentList.splice(toIndex, 0, removed);
        set({ [tab]: currentList });
      },

      // Set selected category for wheel navigation
      setSelectedCategory: (tab, index) => {
        // Validate index is within bounds
        const categories = getCategoriesForTab(tab);
        if (index >= 0 && index < categories.length) {
          set((state) => ({
            selectedCategoryIndex: {
              ...state.selectedCategoryIndex,
              [tab]: index,
            },
          }));
        }
      },

      // Edit mode
      setEditMode: (enabled) => set({ isEditMode: enabled }),
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

      // Reset functions
      resetIndices: () => set({ indices: DEFAULT_INDICES }),
      resetCrypto: () => set({ crypto: DEFAULT_CRYPTO }),
      resetEtfs: () => set({ etfs: DEFAULT_ETFS }),
      resetCustom: () => set({ custom: DEFAULT_CUSTOM }),
      resetAll: () => set({
        indices: DEFAULT_INDICES,
        crypto: DEFAULT_CRYPTO,
        etfs: DEFAULT_ETFS,
        custom: DEFAULT_CUSTOM,
        selectedCategoryIndex: {
          market: 0,
          crypto: 0,
          etfs: 0,
        },
        isEditMode: false,
      }),
    }),
    {
      name: 'deepstack-market-watch',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist the symbol lists and category selection
        indices: state.indices,
        crypto: state.crypto,
        etfs: state.etfs,
        custom: state.custom,
        selectedCategoryIndex: state.selectedCategoryIndex,
      }),
    }
  )
);

// Re-export category helpers for convenience
export { getCategoriesForTab, getSymbolsForCategory };
