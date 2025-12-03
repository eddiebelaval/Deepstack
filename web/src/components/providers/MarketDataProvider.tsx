"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMarketDataStore, type OHLCVBar, type QuoteData } from "@/lib/stores/market-data-store";
import { useTradingStore } from "@/lib/stores/trading-store";

// Default ticker symbols for the LED ticker
const TICKER_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'NVDA', 'AAPL', 'TSLA', 'AMD', 'MSFT'];

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
  const { subscribe, wsConnected, setBars, setLoadingBars, updateQuotes, bars } = useMarketDataStore();
  const initialFetchDone = useRef(false);

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

      const data = await response.json();

      // Transform backend data to OHLCVBar format
      const transformedBars: OHLCVBar[] = (data.bars || data || []).map(
        (bar: { t?: string; time?: number; timestamp?: string; o?: number; open?: number; h?: number; high?: number; l?: number; low?: number; c?: number; close?: number; v?: number; volume?: number }) => ({
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
        ([symbol, quote]: [string, any]) => ({
          symbol,
          bid: quote.bid ?? quote.bp,
          ask: quote.ask ?? quote.ap,
          last: quote.last ?? quote.price ?? quote.close ?? 0,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.close,
          volume: quote.volume,
          change: quote.change,
          changePercent: quote.changePercent ?? quote.change_percent,
          timestamp: quote.timestamp || new Date().toISOString(),
        })
      );

      updateQuotes(quotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  }, [updateQuotes]);

  // Fetch initial ticker quotes on mount
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchQuotes(TICKER_SYMBOLS);
    }
  }, [fetchQuotes]);

  // Subscribe to active symbol when it changes
  useEffect(() => {
    if (activeSymbol && wsConnected) {
      // Subscribe to new symbol
      subscribe(activeSymbol);
      subscribeSymbols([activeSymbol]);
    }
  }, [activeSymbol, wsConnected, subscribe, subscribeSymbols]);

  // Fetch bars when active symbol changes
  useEffect(() => {
    if (activeSymbol && (!bars[activeSymbol] || bars[activeSymbol].length === 0)) {
      fetchBars(activeSymbol);
    }
  }, [activeSymbol, bars, fetchBars]);

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
