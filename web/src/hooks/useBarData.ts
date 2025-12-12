"use client";

import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

// Bar data type
export type BarData = {
  time: number;
  value: number;
};

export type SeriesData = {
  symbol: string;
  data: BarData[];
  color: string;
  visible: boolean;
};

type ApiBarResponse = {
  success?: boolean;
  data?: {
    bars?: ApiBar[];
  };
  bars?: ApiBar[];
  meta?: {
    isMock?: boolean;
  };
};

type ApiBar = {
  t?: string;
  time?: number;
  c?: number;
  close?: number;
};

// Get appropriate limit based on timeframe for sufficient historical data
function getDefaultLimit(timeframe: string): number {
  switch (timeframe.toLowerCase()) {
    case "1h":
    case "2h":
      return 168; // ~1 week of hourly bars
    case "4h":
      return 250; // ~6 weeks of 4h bars
    case "1d":
      return 365; // ~1 year of daily bars
    case "1w":
      return 260; // ~5 years of weekly bars
    case "1mo":
      return 120; // ~10 years of monthly bars
    default:
      return 200;
  }
}

// Fetch function for a single symbol
async function fetchBars(
  symbol: string,
  timeframe: string,
  limit?: number
): Promise<{ bars: BarData[]; isMock: boolean }> {
  const effectiveLimit = limit ?? getDefaultLimit(timeframe);
  const response = await fetch(
    `/api/market/bars?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${effectiveLimit}`
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json: ApiBarResponse = await response.json();
  const responseData = json.data || json;
  const bars = responseData.bars || [];

  const transformedBars: BarData[] = bars.map((d: ApiBar) => {
    let timestamp: number;
    if (d.t && typeof d.t === "string") {
      timestamp = Math.floor(new Date(d.t).getTime() / 1000);
    } else {
      timestamp = d.time || 0;
    }
    return {
      time: timestamp,
      value: d.c ?? d.close ?? 0,
    };
  });

  return {
    bars: transformedBars,
    isMock: json.meta?.isMock || false,
  };
}

// Query key factory
export const barDataKeys = {
  all: ["bars"] as const,
  symbol: (symbol: string, timeframe: string) =>
    ["bars", symbol, timeframe] as const,
};

// Cache configuration
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data considered fresh
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes - keep in cache

/**
 * Hook to fetch bar data for a single symbol with caching
 */
export function useBarData(
  symbol: string | null,
  timeframe: string = "1d",
  enabled: boolean = true
) {
  return useQuery({
    queryKey: barDataKeys.symbol(symbol || "", timeframe),
    queryFn: () => fetchBars(symbol!, timeframe),
    enabled: enabled && !!symbol,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook to fetch bar data for multiple symbols with caching
 * Returns data for all symbols in parallel
 */
export function useMultipleBarData(
  symbols: string[],
  timeframe: string = "1d",
  colors: string[] = []
) {
  const queries = useQueries({
    queries: symbols.map((symbol, index) => ({
      queryKey: barDataKeys.symbol(symbol, timeframe),
      queryFn: () => fetchBars(symbol, timeframe),
      staleTime: STALE_TIME,
      gcTime: CACHE_TIME,
      refetchOnWindowFocus: false,
      retry: 2,
      // Pass color through meta for later use
      meta: { color: colors[index] || "#f59e0b", index },
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isMockData = queries.some((q) => q.data?.isMock);
  const isError = queries.some((q) => q.isError);

  // Create a stable key based on query states to detect actual data changes
  // This avoids variable-length dependency arrays which React warns about
  const dataKey = queries
    .map((q) => `${q.dataUpdatedAt}-${q.isSuccess}`)
    .join(",");

  // Transform results into SeriesData format - MEMOIZED to prevent infinite loops
  const seriesData = useMemo((): SeriesData[] => {
    return queries
      .map((query, index) => {
        if (!query.data?.bars?.length) return null;
        return {
          symbol: symbols[index],
          data: query.data.bars,
          color: colors[index] || "#f59e0b",
          visible: true,
        };
      })
      .filter((s): s is SeriesData => s !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, symbols.length, colors.length]);

  return {
    seriesData,
    isLoading,
    isMockData,
    isError,
    queries,
  };
}

/**
 * Hook to prefetch bar data for symbols
 * Call this early to warm up the cache
 */
export function usePrefetchBars() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    async (symbols: string[], timeframe: string = "1d") => {
      await Promise.all(
        symbols.map((symbol) =>
          queryClient.prefetchQuery({
            queryKey: barDataKeys.symbol(symbol, timeframe),
            queryFn: () => fetchBars(symbol, timeframe),
            staleTime: STALE_TIME,
          })
        )
      );
    },
    [queryClient]
  );

  return { prefetch };
}

/**
 * Hook to invalidate bar data cache
 */
export function useInvalidateBarData() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    (symbol?: string, timeframe?: string) => {
      if (symbol && timeframe) {
        queryClient.invalidateQueries({
          queryKey: barDataKeys.symbol(symbol, timeframe),
        });
      } else {
        queryClient.invalidateQueries({ queryKey: barDataKeys.all });
      }
    },
    [queryClient]
  );

  return { invalidate };
}
