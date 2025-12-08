'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTradesStore, type TradeEntry } from '@/lib/stores/trades-store';
import {
    fetchTradeEntries,
    createTradeEntry,
    updateTradeEntry,
    deleteTradeEntry,
    subscribeToTradeEntries,
} from '@/lib/supabase/trades';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook that syncs trade entries with Supabase.
 * Falls back to localStorage when Supabase is not configured or user is not authenticated.
 */
export function useTradesSync() {
    const store = useTradesStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(isSupabaseConfigured());

    // Load entries from Supabase on mount
    useEffect(() => {
        async function loadEntries() {
            if (!isSupabaseConfigured()) {
                setIsOnline(false);
                setIsLoading(false);
                return;
            }

            try {
                const trades = await fetchTradeEntries();
                if (trades.length > 0) {
                    // Replace local entries with remote ones
                    useTradesStore.setState({ trades });
                }
                setIsOnline(true);
                setError(null);
            } catch (err) {
                console.error('Failed to load trade entries:', err);
                setError('Failed to load trades. Using local data.');
                setIsOnline(false);
            } finally {
                setIsLoading(false);
            }
        }

        loadEntries();
    }, []);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!isSupabaseConfigured()) return;

        const unsubscribe = subscribeToTradeEntries(async () => {
            try {
                const trades = await fetchTradeEntries();
                useTradesStore.setState({ trades });
            } catch (err) {
                console.error('Failed to sync trade entries:', err);
            }
        });

        return unsubscribe;
    }, []);

    // Wrapped addTrade that syncs to Supabase
    const addTrade = useCallback(async (
        trade: Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<TradeEntry> => {
        if (!isOnline) {
            // Fallback to local store
            return store.addTrade(trade);
        }

        try {
            const newTrade = await createTradeEntry(trade);
            // Update local store with the returned entry (which has the real DB ID)
            useTradesStore.setState((state) => ({
                trades: [...state.trades, newTrade],
            }));
            return newTrade;
        } catch (err) {
            console.error('Failed to create trade entry:', err);
            // Fallback to local
            return store.addTrade(trade);
        }
    }, [isOnline, store]);

    // Wrapped updateTrade that syncs to Supabase
    const updateTrade = useCallback(async (
        id: string,
        updates: Partial<TradeEntry>
    ): Promise<void> => {
        if (!isOnline) {
            store.updateTrade(id, updates);
            return;
        }

        try {
            await updateTradeEntry(id, updates);
            // Update local store
            useTradesStore.setState((state) => ({
                trades: state.trades.map((t) =>
                    t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
                ),
            }));
        } catch (err) {
            console.error('Failed to update trade entry:', err);
            // Fallback to local
            store.updateTrade(id, updates);
        }
    }, [isOnline, store]);

    // Wrapped deleteTrade that syncs to Supabase
    const deleteTrade = useCallback(async (id: string): Promise<void> => {
        if (!isOnline) {
            store.deleteTrade(id);
            return;
        }

        try {
            await deleteTradeEntry(id);
            // Update local store
            useTradesStore.setState((state) => ({
                trades: state.trades.filter((t) => t.id !== id),
            }));
        } catch (err) {
            console.error('Failed to delete trade entry:', err);
            // Fallback to local
            store.deleteTrade(id);
        }
    }, [isOnline, store]);

    return {
        trades: store.trades,
        addTrade,
        updateTrade,
        deleteTrade,
        getTradeById: store.getTradeById,
        getTradesBySymbol: store.getTradesBySymbol,
        isLoading,
        isOnline,
        error,
    };
}
