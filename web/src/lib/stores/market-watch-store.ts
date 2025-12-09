import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Default symbol lists
const DEFAULT_INDICES = ['SPY', 'QQQ', 'DIA', 'IWM'];
const DEFAULT_CRYPTO = ['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD'];
const DEFAULT_CUSTOM = ['SPY', 'AAPL'];

// Display names for common symbols
export const SYMBOL_DISPLAY_NAMES: Record<string, string> = {
  'SPY': 'S&P 500',
  'QQQ': 'NASDAQ 100',
  'DIA': 'Dow Jones',
  'IWM': 'Russell 2000',
  'VIX': 'Volatility',
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
  custom: string[];

  // Edit mode state
  isEditMode: boolean;

  // Actions
  setIndices: (symbols: string[]) => void;
  setCrypto: (symbols: string[]) => void;
  setCustom: (symbols: string[]) => void;

  addSymbol: (tab: 'indices' | 'crypto' | 'custom', symbol: string) => void;
  removeSymbol: (tab: 'indices' | 'crypto' | 'custom', symbol: string) => void;
  reorderSymbols: (tab: 'indices' | 'crypto' | 'custom', fromIndex: number, toIndex: number) => void;

  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;

  // Reset to defaults
  resetIndices: () => void;
  resetCrypto: () => void;
  resetCustom: () => void;
  resetAll: () => void;
};

export const useMarketWatchStore = create<MarketWatchState>()(
  persist(
    (set, get) => ({
      // Initial state
      indices: DEFAULT_INDICES,
      crypto: DEFAULT_CRYPTO,
      custom: DEFAULT_CUSTOM,
      isEditMode: false,

      // Set entire lists
      setIndices: (symbols) => set({ indices: symbols.slice(0, 8) }),
      setCrypto: (symbols) => set({ crypto: symbols.slice(0, 8) }),
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

      // Edit mode
      setEditMode: (enabled) => set({ isEditMode: enabled }),
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

      // Reset functions
      resetIndices: () => set({ indices: DEFAULT_INDICES }),
      resetCrypto: () => set({ crypto: DEFAULT_CRYPTO }),
      resetCustom: () => set({ custom: DEFAULT_CUSTOM }),
      resetAll: () => set({
        indices: DEFAULT_INDICES,
        crypto: DEFAULT_CRYPTO,
        custom: DEFAULT_CUSTOM,
        isEditMode: false,
      }),
    }),
    {
      name: 'deepstack-market-watch',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist the symbol lists, not edit mode
        indices: state.indices,
        crypto: state.crypto,
        custom: state.custom,
      }),
    }
  )
);
