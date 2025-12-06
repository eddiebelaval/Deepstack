'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  fetchTrades,
  recordTrade,
  deleteTrade,
  calculatePositions,
  updatePositionsWithPrices,
  calculatePortfolioSummary,
  subscribeToTrades,
  TradeJournalEntry,
  Position,
  PortfolioSummary,
} from '@/lib/supabase/portfolio';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { api } from '@/lib/api-extended';

interface UsePortfolioOptions {
  pollInterval?: number; // Price polling interval in ms (default: 30000)
  autoRefresh?: boolean; // Auto-refresh on mount (default: true)
}

interface UsePortfolioReturn {
  // Data
  trades: TradeJournalEntry[];
  positions: Position[];
  summary: PortfolioSummary;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  placeTrade: (trade: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    order_type: 'MKT' | 'LMT' | 'STP';
    notes?: string;
    tags?: string[];
  }) => Promise<TradeJournalEntry>;
  removeTrade: (tradeId: string) => Promise<void>;

  // Connection status
  isConnected: boolean;
}

const STARTING_CASH = 100000;

export function usePortfolio(options: UsePortfolioOptions = {}): UsePortfolioReturn {
  const { pollInterval = 30000, autoRefresh = true } = options;

  // State
  const [trades, setTrades] = useState<TradeJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Market data store for live prices
  const quotes = useMarketDataStore((state) => state.quotes);
  const subscribe = useMarketDataStore((state) => state.subscribe);

  // Track mounted state for async safety
  const mountedRef = useRef(true);

  // Calculate positions from trades
  const positions = useMemo(() => {
    if (trades.length === 0) return [];
    return calculatePositions(trades);
  }, [trades]);

  // Get unique symbols from positions for price updates
  const positionSymbols = useMemo(() => {
    return positions.filter(p => p.quantity !== 0).map(p => p.symbol);
  }, [positions]);

  // Build prices map from quotes store
  const prices = useMemo(() => {
    const priceMap: Record<string, number> = {};
    positionSymbols.forEach(symbol => {
      const quote = quotes[symbol];
      if (quote?.last) {
        priceMap[symbol] = quote.last;
      }
    });
    return priceMap;
  }, [quotes, positionSymbols]);

  // Update positions with live prices
  const positionsWithPrices = useMemo(() => {
    if (positions.length === 0) return [];
    return updatePositionsWithPrices(positions, prices);
  }, [positions, prices]);

  // Calculate portfolio summary
  const summary = useMemo(() => {
    return calculatePortfolioSummary(positionsWithPrices, STARTING_CASH);
  }, [positionsWithPrices]);

  // Fetch trades from Supabase
  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const data = await fetchTrades();
      if (mountedRef.current) {
        setTrades(data);
        setIsConnected(true);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to fetch trades';
        setError(message);
        setIsConnected(false);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Place a new trade
  const placeTrade = useCallback(async (trade: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    order_type: 'MKT' | 'LMT' | 'STP';
    notes?: string;
    tags?: string[];
  }): Promise<TradeJournalEntry> => {
    const newTrade = await recordTrade(trade);

    // Optimistically add to local state
    if (mountedRef.current) {
      setTrades(prev => [...prev, newTrade]);
    }

    return newTrade;
  }, []);

  // Remove a trade
  const removeTrade = useCallback(async (tradeId: string): Promise<void> => {
    await deleteTrade(tradeId);

    // Optimistically remove from local state
    if (mountedRef.current) {
      setTrades(prev => prev.filter(t => t.id !== tradeId));
    }
  }, []);

  // Fetch prices for position symbols
  const fetchPrices = useCallback(async () => {
    if (positionSymbols.length === 0) return;

    // Subscribe symbols to market data store
    positionSymbols.forEach(symbol => subscribe(symbol));

    // Fetch current quotes
    try {
      const quotePromises = positionSymbols.map(symbol =>
        api.quote(symbol).catch(() => null)
      );
      const results = await Promise.all(quotePromises);

      // Update store with fetched quotes
      const updateQuote = useMarketDataStore.getState().updateQuote;
      results.forEach((quote, idx) => {
        if (quote) {
          updateQuote(positionSymbols[idx], {
            symbol: positionSymbols[idx],
            last: quote.last || 0,
            bid: quote.bid,
            ask: quote.ask,
            volume: quote.volume,
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (err) {
      console.warn('Failed to fetch position prices:', err);
    }
  }, [positionSymbols, subscribe]);

  // Initial load and real-time subscription
  useEffect(() => {
    mountedRef.current = true;

    if (autoRefresh) {
      refresh();
    }

    // Set up real-time subscription
    const unsubscribe = subscribeToTrades(
      (newTrade) => {
        if (mountedRef.current) {
          setTrades(prev => [...prev, newTrade]);
        }
      },
      (deletedId) => {
        if (mountedRef.current) {
          setTrades(prev => prev.filter(t => t.id !== deletedId));
        }
      }
    );

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [autoRefresh, refresh]);

  // Price polling
  useEffect(() => {
    if (positionSymbols.length === 0) return;

    // Initial fetch
    fetchPrices();

    // Set up polling interval
    const intervalId = setInterval(fetchPrices, pollInterval);

    return () => clearInterval(intervalId);
  }, [positionSymbols.length, pollInterval, fetchPrices]);

  return {
    trades,
    positions: positionsWithPrices,
    summary,
    isLoading,
    isRefreshing,
    error,
    refresh,
    placeTrade,
    removeTrade,
    isConnected,
  };
}

// Hook for placing paper trades through the order form
export function usePlacePaperTrade() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (params: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price?: number; // If not provided, fetch current price
    order_type: 'MKT' | 'LMT' | 'STP';
    notes?: string;
    tags?: string[];
  }): Promise<TradeJournalEntry | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current price if not provided
      let price = params.price;
      if (!price) {
        const quote = await api.quote(params.symbol);
        price = quote.last;
        if (!price) {
          throw new Error('Could not get current price');
        }
      }

      const trade = await recordTrade({
        symbol: params.symbol,
        action: params.action,
        quantity: params.quantity,
        price,
        order_type: params.order_type,
        notes: params.notes,
        tags: params.tags,
      });

      return trade;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place trade';
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    execute,
    isSubmitting,
    error,
    clearError: () => setError(null),
  };
}
