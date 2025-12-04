import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Immer's MapSet plugin for Set/Map support
enableMapSet();

// Market data types
export type QuoteData = {
  symbol: string;
  bid?: number;
  ask?: number;
  last: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  timestamp: string;
};

export type OHLCVBar = {
  time: number; // Unix timestamp in seconds (for lightweight-charts)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type MarketDataState = {
  // Real-time quotes
  quotes: Record<string, QuoteData>;

  // OHLCV bar data per symbol
  bars: Record<string, OHLCVBar[]>;

  // WebSocket connection state
  wsConnected: boolean;
  wsReconnecting: boolean;
  lastError: string | null;

  // Subscribed symbols
  subscribedSymbols: Set<string>;

  // Loading states
  isLoadingBars: Record<string, boolean>;

  // Actions
  updateQuote: (symbol: string, quote: QuoteData) => void;
  updateQuotes: (quotes: QuoteData[]) => void;

  setBars: (symbol: string, bars: OHLCVBar[]) => void;
  appendBar: (symbol: string, bar: OHLCVBar) => void;
  updateLastBar: (symbol: string, bar: OHLCVBar) => void;

  setWsConnected: (connected: boolean) => void;
  setWsReconnecting: (reconnecting: boolean) => void;
  setLastError: (error: string | null) => void;

  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  clearSubscriptions: () => void;

  setLoadingBars: (symbol: string, loading: boolean) => void;

  // Selectors (computed values)
  getQuote: (symbol: string) => QuoteData | undefined;
  getBars: (symbol: string) => OHLCVBar[];
  isSubscribed: (symbol: string) => boolean;

  // Reset
  reset: () => void;
};

// LRU cache configuration
const MAX_CACHED_SYMBOLS = 10;
let symbolAccessOrder: string[] = []; // Track access order for LRU eviction

const initialState = {
  quotes: {} as Record<string, QuoteData>,
  bars: {} as Record<string, OHLCVBar[]>,
  wsConnected: false,
  wsReconnecting: false,
  lastError: null as string | null,
  subscribedSymbols: new Set<string>(),
  isLoadingBars: {} as Record<string, boolean>,
};

// RequestAnimationFrame batching for high-frequency updates
let pendingQuoteUpdates: QuoteData[] = [];
let rafId: number | null = null;

export const useMarketDataStore = create<MarketDataState>()(
  immer((set, get) => ({
    ...initialState,

    updateQuote: (symbol, quote) => {
      // Batch updates using requestAnimationFrame for 60fps
      pendingQuoteUpdates.push(quote);

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          set((state) => {
            pendingQuoteUpdates.forEach((q) => {
              state.quotes[q.symbol] = q;
            });
          });
          pendingQuoteUpdates = [];
          rafId = null;
        });
      }
    },

    updateQuotes: (quotes) => {
      set((state) => {
        quotes.forEach((quote) => {
          state.quotes[quote.symbol] = quote;
        });
      });
    },

    setBars: (symbol, bars) => {
      // Update LRU access order - move symbol to front
      symbolAccessOrder = [symbol, ...symbolAccessOrder.filter(s => s !== symbol)];

      // Evict oldest symbol if over cache limit
      if (symbolAccessOrder.length > MAX_CACHED_SYMBOLS) {
        const evictSymbol = symbolAccessOrder.pop();
        if (evictSymbol) {
          set((state) => {
            delete state.bars[evictSymbol];
            delete state.isLoadingBars[evictSymbol];
          });
        }
      }

      set((state) => {
        state.bars[symbol] = bars;
        state.isLoadingBars[symbol] = false;
      });
    },

    appendBar: (symbol, bar) => {
      set((state) => {
        if (!state.bars[symbol]) {
          state.bars[symbol] = [];
        }
        state.bars[symbol].push(bar);
      });
    },

    updateLastBar: (symbol, bar) => {
      set((state) => {
        if (!state.bars[symbol] || state.bars[symbol].length === 0) {
          state.bars[symbol] = [bar];
          return;
        }

        const lastIndex = state.bars[symbol].length - 1;
        const lastBar = state.bars[symbol][lastIndex];

        // If same timestamp, update; otherwise append
        if (lastBar.time === bar.time) {
          state.bars[symbol][lastIndex] = bar;
        } else {
          state.bars[symbol].push(bar);
        }
      });
    },

    setWsConnected: (connected) => {
      set((state) => {
        state.wsConnected = connected;
        if (connected) {
          state.wsReconnecting = false;
          state.lastError = null;
        }
      });
    },

    setWsReconnecting: (reconnecting) => {
      set((state) => {
        state.wsReconnecting = reconnecting;
      });
    },

    setLastError: (error) => {
      set((state) => {
        state.lastError = error;
      });
    },

    subscribe: (symbol) => {
      set((state) => {
        state.subscribedSymbols.add(symbol);
      });
    },

    unsubscribe: (symbol) => {
      set((state) => {
        state.subscribedSymbols.delete(symbol);
        // Optionally clean up data
        // delete state.quotes[symbol];
        // delete state.bars[symbol];
      });
    },

    clearSubscriptions: () => {
      set((state) => {
        state.subscribedSymbols.clear();
      });
    },

    setLoadingBars: (symbol, loading) => {
      set((state) => {
        state.isLoadingBars[symbol] = loading;
      });
    },

    // Selectors
    getQuote: (symbol) => get().quotes[symbol],
    getBars: (symbol) => get().bars[symbol] || [],
    isSubscribed: (symbol) => get().subscribedSymbols.has(symbol),

    reset: () => {
      // Cancel any pending RAF
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pendingQuoteUpdates = [];
      symbolAccessOrder = []; // Clear LRU tracking

      set((state) => {
        state.quotes = {};
        state.bars = {};
        state.wsConnected = false;
        state.wsReconnecting = false;
        state.lastError = null;
        state.subscribedSymbols.clear();
        state.isLoadingBars = {};
      });
    },
  }))
);
