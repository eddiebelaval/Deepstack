"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMarketDataStore, type OHLCVBar, type QuoteData } from "@/lib/stores/market-data-store";
import { useTradingStore } from "@/lib/stores/trading-store";
import { usePrefetchBars } from "@/hooks/useBarData";

// Default ticker symbols for the LED ticker
// Note: VIX is an index (not tradable), use VIXY (VIX ETF) for real-time data
// Removed AMD - focus on major indices and top tech names
const TICKER_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIXY', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL'];

// Mobile market watcher symbols (must also fetch quotes for these)
// These are separate from ticker to support compact display: indices, volatility, macro, crypto
const MOBILE_MARKET_SYMBOLS = ['SPY', 'QQQ', 'VIXY', 'GLD', 'TLT', 'BTC/USD'];

// Combined symbols for initial quote fetch (union of ticker + mobile)
const ALL_QUOTE_SYMBOLS = [...new Set([...TICKER_SYMBOLS, ...MOBILE_MARKET_SYMBOLS])];

// Default symbols to prefetch for Market Watch (warms up React Query cache)
const DEFAULT_INDICES = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIXY', 'VTI', 'GLD', 'TLT'];
const DEFAULT_CRYPTO = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'XRP/USD'];

// Types for API responses
type ApiBarData = {
  t?: string;
  time?: number;
  timestamp?: string;
  o?: number;
  open?: number;
  h?: number;
  high?: number;
  l?: number;
  low?: number;
  c?: number;
  close?: number;
  v?: number;
  volume?: number;
};

type ApiQuoteData = {
  bid?: number;
  bp?: number;
  ask?: number;
  ap?: number;
  last?: number;
  price?: number;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  change_percent?: number;
  timestamp?: string;
};

type MarketDataContextType = {
  connect: () => void;
  disconnect: () => void;
  subscribeSymbols: (symbols: string[]) => boolean;
  unsubscribeSymbols: (symbols: string[]) => boolean;
  isConnected: boolean;
  fetchBars: (symbol: string, timeframe?: string, limit?: number) => Promise<void>;
  fetchQuotes: (symbols: string[]) => Promise<void>;
};

const MarketDataContext = createContext<MarketDataContextType | null>(null);

type MarketDataProviderProps = {
  children: ReactNode;
  wsUrl?: string;
  autoConnect?: boolean;
};

export function MarketDataProvider({
  children,
  wsUrl,
  autoConnect = false, // Disabled - backend doesn't have WebSocket endpoint yet
}: MarketDataProviderProps) {
  const { activeSymbol } = useTradingStore();
  const { subscribe, wsConnected, setBars, setLoadingBars, updateQuotes, bars, isLoadingBars } = useMarketDataStore();
  const initialFetchDone = useRef(false);
  const lastFetchedSymbol = useRef<string | null>(null);

  const { connect, disconnect, subscribeSymbols, unsubscribeSymbols, isConnected } =
    useWebSocket({
      url: wsUrl,
      autoConnect,
      reconnectOnError: true,
      maxReconnectAttempts: 10,
      baseReconnectDelay: 1000,
      maxReconnectDelay: 30000,
    });

  // Fetch historical bars for a symbol
  const fetchBars = useCallback(async (symbol: string, timeframe = '1d', limit = 100) => {
    if (!symbol) return;

    setLoadingBars(symbol, true);

    try {
      const response = await fetch(
        `/api/market/bars?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      // Handle both new standardized format and legacy format
      // New format: { success: true, data: { bars: [...] }, meta: {...} }
      // Legacy format: { bars: [...] } or just [...]
      const data = json.data || json;

      // Transform backend data to OHLCVBar format
      const transformedBars: OHLCVBar[] = (data.bars || data || []).map(
        (bar: ApiBarData) => ({
          time: bar.time || Math.floor(new Date(bar.t || bar.timestamp || 0).getTime() / 1000),
          open: bar.o ?? bar.open ?? 0,
          high: bar.h ?? bar.high ?? 0,
          low: bar.l ?? bar.low ?? 0,
          close: bar.c ?? bar.close ?? 0,
          volume: bar.v ?? bar.volume ?? 0,
        })
      );

      // Sort by time ascending
      transformedBars.sort((a, b) => a.time - b.time);
      setBars(symbol, transformedBars);
    } catch (error) {
      console.error(`Error fetching bars for ${symbol}:`, error);
      setLoadingBars(symbol, false);
    }
  }, [setBars, setLoadingBars]);

  // Fetch quotes for multiple symbols
  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const response = await fetch(
        `/api/market/quotes?symbols=${symbols.join(',')}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Transform to QuoteData format
      const quotes: QuoteData[] = Object.entries(data.quotes || data || {}).map(
        ([symbol, quote]) => {
          const q = quote as ApiQuoteData;
          return {
            symbol,
            bid: q.bid ?? q.bp,
            ask: q.ask ?? q.ap,
            last: q.last ?? q.price ?? q.close ?? 0,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume,
            change: q.change,
            changePercent: q.changePercent ?? q.change_percent,
            timestamp: q.timestamp || new Date().toISOString(),
          };
        }
      );

      updateQuotes(quotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  }, [updateQuotes]);

  // Prefetch bar data for React Query cache
  const { prefetch } = usePrefetchBars();
  const prefetchDone = useRef(false);

  // Fetch initial ticker quotes and prefetch bar data on mount
  // ALL_QUOTE_SYMBOLS includes both LED ticker and mobile market watcher symbols
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchQuotes(ALL_QUOTE_SYMBOLS);
    }

    // Prefetch historical bars for faster Market Watch loading
    if (!prefetchDone.current) {
      prefetchDone.current = true;
      // Prefetch in background - don't block UI
      Promise.all([
        prefetch(DEFAULT_INDICES, '1d'),
        prefetch(DEFAULT_CRYPTO, '1d'),
      ]).catch(console.error);
    }
  }, [fetchQuotes, prefetch]);

  // Subscribe to active symbol when it changes
  useEffect(() => {
    if (activeSymbol && wsConnected) {
      // Subscribe to new symbol
      subscribe(activeSymbol);
      subscribeSymbols([activeSymbol]);
    }
  }, [activeSymbol, wsConnected, subscribe, subscribeSymbols]);

  // Fetch bars when active symbol changes
  // Key fix: Track symbol changes with ref to avoid stale closure issues with bars dependency
  useEffect(() => {
    if (!activeSymbol) return;

    // Skip if we're already loading this symbol or just fetched it
    if (isLoadingBars[activeSymbol]) return;
    if (lastFetchedSymbol.current === activeSymbol && bars[activeSymbol]?.length > 0) return;

    // Fetch data for the new symbol
    lastFetchedSymbol.current = activeSymbol;
    fetchBars(activeSymbol);
  }, [activeSymbol, fetchBars, isLoadingBars, bars]);

  // Context value
  const contextValue = useMemo<MarketDataContextType>(
    () => ({
      connect,
      disconnect,
      subscribeSymbols,
      unsubscribeSymbols,
      isConnected,
      fetchBars,
      fetchQuotes,
    }),
    [connect, disconnect, subscribeSymbols, unsubscribeSymbols, isConnected, fetchBars, fetchQuotes]
  );

  return (
    <MarketDataContext.Provider value={contextValue}>
      {children}
    </MarketDataContext.Provider>
  );
}

// Hook to use market data context
export function useMarketData() {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error("useMarketData must be used within a MarketDataProvider");
  }
  return context;
}

export default MarketDataProvider;
