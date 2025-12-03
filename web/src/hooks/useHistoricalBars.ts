"use client";

import { useEffect, useCallback } from "react";
import { useMarketDataStore, type OHLCVBar } from "@/lib/stores/market-data-store";
import { useTradingStore } from "@/lib/stores/trading-store";

type UseHistoricalBarsOptions = {
  timeframe?: string;
  limit?: number;
  autoFetch?: boolean;
};

const DEFAULT_OPTIONS: Required<UseHistoricalBarsOptions> = {
  timeframe: "1d",
  limit: 100,
  autoFetch: true,
};

export function useHistoricalBars(options: UseHistoricalBarsOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const { activeSymbol, timeframe: storeTimeframe } = useTradingStore();
  const { setBars, setLoadingBars, isLoadingBars, bars } = useMarketDataStore();

  // Use store timeframe if available, otherwise use option
  const effectiveTimeframe = storeTimeframe || opts.timeframe;

  const fetchBars = useCallback(
    async (symbol: string) => {
      if (!symbol) return;

      setLoadingBars(symbol, true);

      try {
        const response = await fetch(
          `/api/market/bars?symbol=${symbol}&timeframe=${effectiveTimeframe}&limit=${opts.limit}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Transform backend data to OHLCVBar format
        // Backend returns: { bars: [{ t: timestamp, o, h, l, c, v }, ...] }
        const transformedBars: OHLCVBar[] = (data.bars || data || []).map(
          (bar: { t?: string; time?: number; timestamp?: string; o?: number; open?: number; h?: number; high?: number; l?: number; low?: number; c?: number; close?: number; v?: number; volume?: number }) => ({
            // Handle various timestamp formats from Alpaca
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
    },
    [effectiveTimeframe, opts.limit, setBars, setLoadingBars]
  );

  // Auto-fetch when symbol changes
  useEffect(() => {
    if (opts.autoFetch && activeSymbol) {
      // Only fetch if we don't already have bars for this symbol
      if (!bars[activeSymbol] || bars[activeSymbol].length === 0) {
        fetchBars(activeSymbol);
      }
    }
  }, [activeSymbol, opts.autoFetch, fetchBars, bars]);

  // Refetch when timeframe changes
  useEffect(() => {
    if (opts.autoFetch && activeSymbol) {
      fetchBars(activeSymbol);
    }
  }, [effectiveTimeframe]);

  return {
    fetchBars,
    isLoading: activeSymbol ? isLoadingBars[activeSymbol] : false,
    bars: activeSymbol ? bars[activeSymbol] || [] : [],
  };
}

export default useHistoricalBars;
