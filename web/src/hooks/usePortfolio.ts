'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculatePositions,
  updatePositionsWithPrices,
  calculatePortfolioSummary,
  Position,
  PortfolioSummary,
} from '@/lib/supabase/portfolio';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { api } from '@/lib/api-extended';
import { useTradesSync } from './useTradesSync';
import { TradeEntry } from '@/lib/stores/trades-store';

interface UsePortfolioOptions {
  pollInterval?: number; // Price polling interval in ms (default: 30000)
}

interface UsePortfolioReturn {
  // Data
  trades: TradeEntry[];
  positions: Position[];
  summary: PortfolioSummary;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>; // Kept for interface compatibility, though sync handles it
  placeTrade: (trade: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    orderType: 'MKT' | 'LMT' | 'STP';
    notes?: string;
    tags?: string[];
  }) => Promise<TradeEntry>;
  removeTrade: (tradeId: string) => Promise<void>;

  // Connection status
  isConnected: boolean;
}

const STARTING_CASH = 100000;

export function usePortfolio(options: UsePortfolioOptions = {}): UsePortfolioReturn {
  const { pollInterval = 30000 } = options;

  // Use the sync hook for data
  const { trades, addTrade, deleteTrade, isLoading, isOnline, error } = useTradesSync();

  // Mock refresh since sync hook manages itself
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Market data store for live prices
  const quotes = useMarketDataStore((state) => state.quotes);
  const subscribe = useMarketDataStore((state) => state.subscribe);

  // Calculate positions from trades
  const positions = useMemo(() => {
    if (trades.length === 0) return [];
    return calculatePositions(trades);
  }, [trades]);

  // Get unique symbols from funds positions for price updates
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
    // If no prices yet, just return original positions
    return updatePositionsWithPrices(positions, prices);
  }, [positions, prices]);

  // Calculate portfolio summary
  const summary = useMemo(() => {
    return calculatePortfolioSummary(positionsWithPrices, STARTING_CASH);
  }, [positionsWithPrices]);

  // Place a new trade
  const placeTrade = useCallback(async (trade: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    orderType: 'MKT' | 'LMT' | 'STP';
    notes?: string;
    tags?: string[];
  }): Promise<TradeEntry> => {
    return addTrade(trade);
  }, [addTrade]);

  // Remove a trade
  const removeTrade = useCallback(async (tradeId: string): Promise<void> => {
    return deleteTrade(tradeId);
  }, [deleteTrade]);

  // Refresh shim
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    // Sync hook updates automatically, but we could trigger a refetch if exposed
    // For now just simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
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
    isConnected: isOnline,
  };
}

// Hook for placing paper trades through the order form
// Refactored to use the main usePortfolio logic if needed, or independent
// keeping independent for now but reusing types
export function usePlacePaperTrade() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We need access to the addTrade function from sync hook.
  // Ideally this component should be within a context provided by usePortfolio
  // But for simple decoupled usage let's just use the store hook directly
  const { addTrade } = useTradesSync();

  const execute = useCallback(async (params: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price?: number; // If not provided, fetch current price
    orderType: 'MKT' | 'LMT' | 'STP';
    notes?: string;
    tags?: string[];
  }): Promise<TradeEntry | null> => {
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

      const trade = await addTrade({
        symbol: params.symbol,
        action: params.action,
        quantity: params.quantity,
        price,
        orderType: params.orderType,
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
  }, [addTrade]);

  return {
    execute,
    isSubmitting,
    error,
    clearError: () => setError(null),
  };
}
