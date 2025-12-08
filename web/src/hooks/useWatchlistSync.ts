'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWatchlistStore, type Watchlist, type WatchlistItem } from '@/lib/stores/watchlist-store';
import {
  fetchWatchlists,
  createWatchlist as createWatchlistApi,
  updateWatchlist as updateWatchlistApi,
  deleteWatchlist as deleteWatchlistApi,
  subscribeToWatchlists,
} from '@/lib/supabase/watchlists';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook that syncs watchlists with Supabase.
 * Falls back to localStorage when Supabase is not configured or user is not authenticated.
 */
export function useWatchlistSync() {
  const store = useWatchlistStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isSupabaseConfigured());

  // Load watchlists from Supabase on mount
  useEffect(() => {
    async function loadWatchlists() {
      if (!isSupabaseConfigured()) {
        setIsOnline(false);
        setIsLoading(false);
        return;
      }

      try {
        const watchlists = await fetchWatchlists();
        if (watchlists.length > 0) {
          // Replace local watchlists with remote ones
          store.setWatchlists(watchlists);
          // Set active watchlist if not set
          if (!store.activeWatchlistId) {
            store.setActiveWatchlist(watchlists[0].id);
          }
        }
        setIsOnline(true);
        setError(null);
        store.setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        console.error('Failed to load watchlists:', err);
        setError('Failed to load watchlists. Using local data.');
        setIsOnline(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadWatchlists();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const unsubscribe = subscribeToWatchlists(async () => {
      try {
        const watchlists = await fetchWatchlists();
        store.setWatchlists(watchlists);
        store.setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        console.error('Failed to sync watchlists:', err);
      }
    });

    return unsubscribe;
  }, []);

  // Wrapped createWatchlist that syncs to Supabase
  const createWatchlist = useCallback(async (name: string): Promise<string> => {
    if (!isOnline) {
      // Fallback to local store
      return store.createWatchlist(name);
    }

    try {
      const newWatchlist = await createWatchlistApi(name);
      // Update local store
      useWatchlistStore.setState((state) => ({
        watchlists: [...state.watchlists, newWatchlist],
      }));
      return newWatchlist.id;
    } catch (err) {
      console.error('Failed to create watchlist:', err);
      // Fallback to local
      return store.createWatchlist(name);
    }
  }, [isOnline, store]);

  // Wrapped deleteWatchlist that syncs to Supabase
  const deleteWatchlist = useCallback(async (id: string): Promise<void> => {
    if (!isOnline) {
      store.deleteWatchlist(id);
      return;
    }

    try {
      await deleteWatchlistApi(id);
      // Update local store
      store.deleteWatchlist(id);
    } catch (err) {
      console.error('Failed to delete watchlist:', err);
      // Fallback to local
      store.deleteWatchlist(id);
    }
  }, [isOnline, store]);

  // Wrapped renameWatchlist that syncs to Supabase
  const renameWatchlist = useCallback(async (id: string, name: string): Promise<void> => {
    if (!isOnline) {
      store.renameWatchlist(id, name);
      return;
    }

    try {
      await updateWatchlistApi(id, { name });
      // Update local store
      store.renameWatchlist(id, name);
    } catch (err) {
      console.error('Failed to rename watchlist:', err);
      // Fallback to local
      store.renameWatchlist(id, name);
    }
  }, [isOnline, store]);

  // Wrapped addSymbol that syncs to Supabase
  const addSymbol = useCallback(async (
    watchlistId: string,
    symbol: string,
    notes?: string
  ): Promise<void> => {
    // Update local first for optimistic UI
    store.addSymbol(watchlistId, symbol, notes);

    if (!isOnline) return;

    try {
      // Get updated items and sync to Supabase
      const watchlist = store.watchlists.find((w) => w.id === watchlistId);
      if (watchlist) {
        await updateWatchlistApi(watchlistId, { items: watchlist.items });
      }
    } catch (err) {
      console.error('Failed to sync symbol addition:', err);
      // Local store already updated, will sync on next full sync
    }
  }, [isOnline, store]);

  // Wrapped removeSymbol that syncs to Supabase
  const removeSymbol = useCallback(async (
    watchlistId: string,
    symbol: string
  ): Promise<void> => {
    // Update local first for optimistic UI
    store.removeSymbol(watchlistId, symbol);

    if (!isOnline) return;

    try {
      // Get updated items and sync to Supabase
      const watchlist = store.watchlists.find((w) => w.id === watchlistId);
      if (watchlist) {
        await updateWatchlistApi(watchlistId, { items: watchlist.items });
      }
    } catch (err) {
      console.error('Failed to sync symbol removal:', err);
      // Local store already updated, will sync on next full sync
    }
  }, [isOnline, store]);

  // Wrapped importSymbols that syncs to Supabase
  const importSymbols = useCallback(async (
    watchlistId: string,
    symbols: string[]
  ): Promise<void> => {
    // Update local first
    store.importSymbols(watchlistId, symbols);

    if (!isOnline) return;

    try {
      // Get updated items and sync to Supabase
      const watchlist = store.watchlists.find((w) => w.id === watchlistId);
      if (watchlist) {
        await updateWatchlistApi(watchlistId, { items: watchlist.items });
      }
    } catch (err) {
      console.error('Failed to sync symbol import:', err);
    }
  }, [isOnline, store]);

  return {
    watchlists: store.watchlists,
    activeWatchlistId: store.activeWatchlistId,
    isSyncing: store.isSyncing,
    lastSyncedAt: store.lastSyncedAt,

    // CRUD operations
    createWatchlist,
    deleteWatchlist,
    renameWatchlist,
    setActiveWatchlist: store.setActiveWatchlist,

    // Symbol operations
    addSymbol,
    removeSymbol,
    importSymbols,
    updateSymbolNotes: store.updateSymbolNotes,
    moveSymbol: store.moveSymbol,
    clearWatchlist: store.clearWatchlist,

    // Selectors
    getActiveWatchlist: store.getActiveWatchlist,
    getWatchlistSymbols: store.getWatchlistSymbols,
    isSymbolInWatchlist: store.isSymbolInWatchlist,

    // Sync state
    isLoading,
    isOnline,
    error,
  };
}
