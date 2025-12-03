"use client";

import { useEffect, useRef } from "react";
import { useMarketDataStore, type QuoteData } from "@/lib/stores/market-data-store";
import { initializeMockData } from "@/lib/mock-data";

/**
 * MockDataProvider initializes the market data store with mock data
 * for development and testing purposes.
 *
 * In production, this would be replaced with real WebSocket data.
 * This provider also simulates real-time quote updates for testing.
 */
export function MockDataProvider({ children }: { children: React.ReactNode }) {
  const { setBars, updateQuotes, updateQuote, setWsConnected, setLoadingBars } = useMarketDataStore();
  const quotesRef = useRef<Record<string, QuoteData>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only load mock data in development
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    // Simulate loading delay
    const loadData = async () => {
      // Set loading states
      ["SPY", "QQQ", "AAPL", "MSFT", "NVDA"].forEach((symbol) => {
        setLoadingBars(symbol, true);
      });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate and set mock data
      const { bars, quotes } = initializeMockData();

      // Set bars for each symbol
      Object.entries(bars).forEach(([symbol, symbolBars]) => {
        setBars(symbol, symbolBars);
      });

      // Set quotes
      updateQuotes(Object.values(quotes));
      quotesRef.current = quotes;

      // Simulate connected state
      setWsConnected(true);

      // Start simulating real-time quote updates
      intervalRef.current = setInterval(() => {
        simulateQuoteUpdate();
      }, 2000); // Update every 2 seconds
    };

    // Simulate a single quote update
    const simulateQuoteUpdate = () => {
      const symbols = Object.keys(quotesRef.current);
      if (symbols.length === 0) return;

      // Pick a random symbol to update
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const currentQuote = quotesRef.current[symbol];
      if (!currentQuote) return;

      // Simulate small price movement (-0.5% to +0.5%)
      const changeMultiplier = 1 + (Math.random() * 0.01 - 0.005);
      const newLast = Math.round(currentQuote.last * changeMultiplier * 100) / 100;
      const change = Math.round((newLast - (currentQuote.open || newLast)) * 100) / 100;
      const changePercent = currentQuote.open
        ? Math.round(((newLast - currentQuote.open) / currentQuote.open) * 10000) / 100
        : 0;

      const updatedQuote: QuoteData = {
        ...currentQuote,
        last: newLast,
        close: newLast,
        high: Math.max(currentQuote.high || newLast, newLast),
        low: Math.min(currentQuote.low || newLast, newLast),
        change,
        changePercent,
        bid: newLast - 0.01,
        ask: newLast + 0.01,
        timestamp: new Date().toISOString(),
      };

      // Update ref and store
      quotesRef.current[symbol] = updatedQuote;
      updateQuote(symbol, updatedQuote);
    };

    loadData();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [setBars, updateQuotes, updateQuote, setWsConnected, setLoadingBars]);

  return <>{children}</>;
}
