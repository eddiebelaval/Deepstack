"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { useTradingStore } from "@/lib/stores/trading-store";

type MarketDataContextType = {
  connect: () => void;
  disconnect: () => void;
  subscribeSymbols: (symbols: string[]) => boolean;
  unsubscribeSymbols: (symbols: string[]) => boolean;
  isConnected: boolean;
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
  autoConnect = true,
}: MarketDataProviderProps) {
  const { activeSymbol } = useTradingStore();
  const { subscribe, wsConnected } = useMarketDataStore();

  const { connect, disconnect, subscribeSymbols, unsubscribeSymbols, isConnected } =
    useWebSocket({
      url: wsUrl,
      autoConnect,
      reconnectOnError: true,
      maxReconnectAttempts: 10,
      baseReconnectDelay: 1000,
      maxReconnectDelay: 30000,
    });

  // Subscribe to active symbol when it changes
  useEffect(() => {
    if (activeSymbol && wsConnected) {
      // Subscribe to new symbol
      subscribe(activeSymbol);
      subscribeSymbols([activeSymbol]);
    }
  }, [activeSymbol, wsConnected, subscribe, subscribeSymbols]);

  // Context value
  const contextValue = useMemo<MarketDataContextType>(
    () => ({
      connect,
      disconnect,
      subscribeSymbols,
      unsubscribeSymbols,
      isConnected,
    }),
    [connect, disconnect, subscribeSymbols, unsubscribeSymbols, isConnected]
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
