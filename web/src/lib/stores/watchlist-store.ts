import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Watchlist types
export type WatchlistItem = {
  symbol: string;
  addedAt: string;
  notes?: string;
};

export type Watchlist = {
  id: string;
  name: string;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
};

type WatchlistState = {
  // Watchlists
  watchlists: Watchlist[];
  activeWatchlistId: string | null;

  // Synced state (for Supabase sync)
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Actions
  createWatchlist: (name: string) => string; // Returns new watchlist ID
  deleteWatchlist: (id: string) => void;
  renameWatchlist: (id: string, name: string) => void;
  setActiveWatchlist: (id: string | null) => void;

  // Symbol management
  addSymbol: (watchlistId: string, symbol: string, notes?: string) => void;
  removeSymbol: (watchlistId: string, symbol: string) => void;
  updateSymbolNotes: (watchlistId: string, symbol: string, notes: string) => void;
  moveSymbol: (watchlistId: string, fromIndex: number, toIndex: number) => void;

  // Bulk operations
  importSymbols: (watchlistId: string, symbols: string[]) => void;
  clearWatchlist: (watchlistId: string) => void;

  // Sync actions
  setWatchlists: (watchlists: Watchlist[]) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncedAt: (timestamp: string | null) => void;

  // Selectors
  getActiveWatchlist: () => Watchlist | null;
  getWatchlistSymbols: (watchlistId: string) => string[];
  isSymbolInWatchlist: (watchlistId: string, symbol: string) => boolean;

  // Reset
  reset: () => void;
};

// Default watchlist
const createDefaultWatchlist = (): Watchlist => ({
  id: 'default',
  name: 'Main Watchlist',
  items: [
    { symbol: 'SPY', addedAt: new Date().toISOString() },
    { symbol: 'QQQ', addedAt: new Date().toISOString() },
    { symbol: 'AAPL', addedAt: new Date().toISOString() },
    { symbol: 'MSFT', addedAt: new Date().toISOString() },
    { symbol: 'NVDA', addedAt: new Date().toISOString() },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const initialState = {
  watchlists: [createDefaultWatchlist()],
  activeWatchlistId: 'default',
  isSyncing: false,
  lastSyncedAt: null as string | null,
};

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      createWatchlist: (name) => {
        const id = `watchlist-${Date.now()}`;
        const now = new Date().toISOString();

        set((state) => {
          state.watchlists.push({
            id,
            name,
            items: [],
            createdAt: now,
            updatedAt: now,
          });
        });

        return id;
      },

      deleteWatchlist: (id) => {
        set((state) => {
          // Don't allow deleting the last watchlist
          if (state.watchlists.length <= 1) return;

          state.watchlists = state.watchlists.filter((w) => w.id !== id);

          // If active watchlist was deleted, switch to first available
          if (state.activeWatchlistId === id) {
            state.activeWatchlistId = state.watchlists[0]?.id || null;
          }
        });
      },

      renameWatchlist: (id, name) => {
        set((state) => {
          const watchlist = state.watchlists.find((w) => w.id === id);
          if (watchlist) {
            watchlist.name = name;
            watchlist.updatedAt = new Date().toISOString();
          }
        });
      },

      setActiveWatchlist: (id) => {
        set((state) => {
          state.activeWatchlistId = id;
        });
      },

      addSymbol: (watchlistId, symbol, notes) => {
        set((state) => {
          const watchlist = state.watchlists.find((w) => w.id === watchlistId);
          if (!watchlist) return;

          // Check if symbol already exists
          const exists = watchlist.items.some((item) => item.symbol === symbol);
          if (exists) return;

          watchlist.items.push({
            symbol: symbol.toUpperCase(),
            addedAt: new Date().toISOString(),
            notes,
          });
          watchlist.updatedAt = new Date().toISOString();
        });
      },

      removeSymbol: (watchlistId, symbol) => {
        set((state) => {
          const watchlist = state.watchlists.find((w) => w.id === watchlistId);
          if (!watchlist) return;

          watchlist.items = watchlist.items.filter((item) => item.symbol !== symbol);
          watchlist.updatedAt = new Date().toISOString();
        });
      },

      updateSymbolNotes: (watchlistId, symbol, notes) => {
        set((state) => {
          const watchlist = state.watchlists.find((w) => w.id === watchlistId);
          if (!watchlist) return;

          const item = watchlist.items.find((i) => i.symbol === symbol);
          if (item) {
            item.notes = notes;
            watchlist.updatedAt = new Date().toISOString();
          }
        });
      },

      moveSymbol: (watchlistId, fromIndex, toIndex) => {
        set((state) => {
          const watchlist = state.watchlists.find((w) => w.id === watchlistId);
          if (!watchlist) return;

          const [item] = watchlist.items.splice(fromIndex, 1);
          if (item) {
            watchlist.items.splice(toIndex, 0, item);
            watchlist.updatedAt = new Date().toISOString();
          }
        });
      },

      importSymbols: (watchlistId, symbols) => {
        set((state) => {
          const watchlist = state.watchlists.find((w) => w.id === watchlistId);
          if (!watchlist) return;

          const existingSymbols = new Set(watchlist.items.map((i) => i.symbol));
          const now = new Date().toISOString();

          symbols.forEach((symbol) => {
            const upperSymbol = symbol.toUpperCase().trim();
            if (upperSymbol && !existingSymbols.has(upperSymbol)) {
              watchlist.items.push({
                symbol: upperSymbol,
                addedAt: now,
              });
              existingSymbols.add(upperSymbol);
            }
          });

          watchlist.updatedAt = now;
        });
      },

      clearWatchlist: (watchlistId) => {
        set((state) => {
          const watchlist = state.watchlists.find((w) => w.id === watchlistId);
          if (watchlist) {
            watchlist.items = [];
            watchlist.updatedAt = new Date().toISOString();
          }
        });
      },

      setWatchlists: (watchlists) => {
        set((state) => {
          state.watchlists = watchlists;
        });
      },

      setSyncing: (syncing) => {
        set((state) => {
          state.isSyncing = syncing;
        });
      },

      setLastSyncedAt: (timestamp) => {
        set((state) => {
          state.lastSyncedAt = timestamp;
        });
      },

      // Selectors
      getActiveWatchlist: () => {
        const state = get();
        return state.watchlists.find((w) => w.id === state.activeWatchlistId) || null;
      },

      getWatchlistSymbols: (watchlistId) => {
        const watchlist = get().watchlists.find((w) => w.id === watchlistId);
        return watchlist?.items.map((i) => i.symbol) || [];
      },

      isSymbolInWatchlist: (watchlistId, symbol) => {
        const watchlist = get().watchlists.find((w) => w.id === watchlistId);
        return watchlist?.items.some((i) => i.symbol === symbol) || false;
      },

      reset: () => {
        set((state) => {
          state.watchlists = [createDefaultWatchlist()];
          state.activeWatchlistId = 'default';
          state.isSyncing = false;
          state.lastSyncedAt = null;
        });
      },
    })),
    {
      name: 'deepstack-watchlist-storage',
      storage: createJSONStorage(() => localStorage),
      // Custom serialization for Set
      partialize: (state) => ({
        watchlists: state.watchlists,
        activeWatchlistId: state.activeWatchlistId,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
