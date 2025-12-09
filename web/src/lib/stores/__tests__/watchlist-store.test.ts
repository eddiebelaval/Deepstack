import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWatchlistStore } from '../watchlist-store';
import { act } from '@testing-library/react';

describe('useWatchlistStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useWatchlistStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has default watchlist', () => {
      const state = useWatchlistStore.getState();

      expect(state.watchlists).toHaveLength(1);
      expect(state.watchlists[0].id).toBe('default');
      expect(state.watchlists[0].name).toBe('Main Watchlist');
    });

    it('has default symbols', () => {
      const state = useWatchlistStore.getState();
      const defaultWatchlist = state.watchlists[0];

      expect(defaultWatchlist.items.length).toBeGreaterThan(0);
      const symbols = defaultWatchlist.items.map((i) => i.symbol);
      expect(symbols).toContain('SPY');
      expect(symbols).toContain('AAPL');
    });

    it('sets default as active watchlist', () => {
      const state = useWatchlistStore.getState();
      expect(state.activeWatchlistId).toBe('default');
    });
  });

  describe('createWatchlist', () => {
    it('creates a new watchlist with given name', () => {
      const { createWatchlist } = useWatchlistStore.getState();

      let newId: string = '';
      act(() => {
        newId = createWatchlist('Tech Stocks');
      });

      const state = useWatchlistStore.getState();
      expect(state.watchlists).toHaveLength(2);

      const newWatchlist = state.watchlists.find((w) => w.id === newId);
      expect(newWatchlist).toBeDefined();
      expect(newWatchlist?.name).toBe('Tech Stocks');
      expect(newWatchlist?.items).toHaveLength(0);
    });

    it('returns the new watchlist id', () => {
      const { createWatchlist } = useWatchlistStore.getState();

      let id: string = '';
      act(() => {
        id = createWatchlist('New List');
      });

      expect(id).toMatch(/^watchlist-\d+$/);
    });

    it('sets timestamps on creation', () => {
      const { createWatchlist } = useWatchlistStore.getState();
      const before = new Date().toISOString();

      let newId: string = '';
      act(() => {
        newId = createWatchlist('Timestamped');
      });

      const watchlist = useWatchlistStore.getState().watchlists.find((w) => w.id === newId);
      expect(watchlist?.createdAt).toBeDefined();
      expect(watchlist?.updatedAt).toBeDefined();
    });
  });

  describe('deleteWatchlist', () => {
    it('removes watchlist by id', () => {
      const { createWatchlist, deleteWatchlist } = useWatchlistStore.getState();

      let newId: string = '';
      act(() => {
        newId = createWatchlist('To Delete');
      });

      expect(useWatchlistStore.getState().watchlists).toHaveLength(2);

      act(() => {
        deleteWatchlist(newId);
      });

      expect(useWatchlistStore.getState().watchlists).toHaveLength(1);
      expect(useWatchlistStore.getState().watchlists.find((w) => w.id === newId)).toBeUndefined();
    });

    it('does not delete the last watchlist', () => {
      const { deleteWatchlist } = useWatchlistStore.getState();

      act(() => {
        deleteWatchlist('default');
      });

      // Should still have one watchlist
      expect(useWatchlistStore.getState().watchlists).toHaveLength(1);
    });

    it('switches active watchlist if deleted', () => {
      const { createWatchlist, setActiveWatchlist, deleteWatchlist } = useWatchlistStore.getState();

      let newId: string = '';
      act(() => {
        newId = createWatchlist('Active');
        setActiveWatchlist(newId);
      });

      expect(useWatchlistStore.getState().activeWatchlistId).toBe(newId);

      act(() => {
        deleteWatchlist(newId);
      });

      // Should switch to first available
      expect(useWatchlistStore.getState().activeWatchlistId).toBe('default');
    });
  });

  describe('renameWatchlist', () => {
    it('renames watchlist', () => {
      const { renameWatchlist } = useWatchlistStore.getState();

      act(() => {
        renameWatchlist('default', 'Renamed List');
      });

      const watchlist = useWatchlistStore.getState().watchlists.find((w) => w.id === 'default');
      expect(watchlist?.name).toBe('Renamed List');
    });

    it('updates timestamp on rename', async () => {
      const originalUpdatedAt = useWatchlistStore.getState().watchlists[0].updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      act(() => {
        useWatchlistStore.getState().renameWatchlist('default', 'New Name');
      });

      const newUpdatedAt = useWatchlistStore.getState().watchlists[0].updatedAt;
      expect(newUpdatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('addSymbol', () => {
    it('adds symbol to watchlist', () => {
      const { addSymbol } = useWatchlistStore.getState();

      act(() => {
        addSymbol('default', 'TSLA');
      });

      const symbols = useWatchlistStore.getState().getWatchlistSymbols('default');
      expect(symbols).toContain('TSLA');
    });

    it('normalizes symbol to uppercase', () => {
      const { addSymbol } = useWatchlistStore.getState();

      act(() => {
        addSymbol('default', 'googl');
      });

      const symbols = useWatchlistStore.getState().getWatchlistSymbols('default');
      expect(symbols).toContain('GOOGL');
    });

    it('does not add duplicate symbols', () => {
      const { addSymbol } = useWatchlistStore.getState();
      const initialCount = useWatchlistStore.getState().watchlists[0].items.length;

      act(() => {
        addSymbol('default', 'SPY'); // Already exists in default
      });

      expect(useWatchlistStore.getState().watchlists[0].items).toHaveLength(initialCount);
    });

    it('adds notes if provided', () => {
      const { addSymbol } = useWatchlistStore.getState();

      act(() => {
        addSymbol('default', 'AMD', 'Good for AI plays');
      });

      const watchlist = useWatchlistStore.getState().watchlists[0];
      const amdItem = watchlist.items.find((i) => i.symbol === 'AMD');
      expect(amdItem?.notes).toBe('Good for AI plays');
    });
  });

  describe('removeSymbol', () => {
    it('removes symbol from watchlist', () => {
      const { removeSymbol } = useWatchlistStore.getState();

      act(() => {
        removeSymbol('default', 'SPY');
      });

      const symbols = useWatchlistStore.getState().getWatchlistSymbols('default');
      expect(symbols).not.toContain('SPY');
    });

    it('does nothing for non-existent symbol', () => {
      const { removeSymbol } = useWatchlistStore.getState();
      const initialCount = useWatchlistStore.getState().watchlists[0].items.length;

      act(() => {
        removeSymbol('default', 'NONEXISTENT');
      });

      expect(useWatchlistStore.getState().watchlists[0].items).toHaveLength(initialCount);
    });
  });

  describe('updateSymbolNotes', () => {
    it('updates notes for existing symbol', () => {
      const { updateSymbolNotes } = useWatchlistStore.getState();

      act(() => {
        updateSymbolNotes('default', 'SPY', 'Market bellwether');
      });

      const watchlist = useWatchlistStore.getState().watchlists[0];
      const spyItem = watchlist.items.find((i) => i.symbol === 'SPY');
      expect(spyItem?.notes).toBe('Market bellwether');
    });
  });

  describe('moveSymbol', () => {
    it('reorders symbols within watchlist', () => {
      const { moveSymbol } = useWatchlistStore.getState();
      const initialSymbols = useWatchlistStore.getState().getWatchlistSymbols('default');

      act(() => {
        moveSymbol('default', 0, 2); // Move first to third position
      });

      const newSymbols = useWatchlistStore.getState().getWatchlistSymbols('default');

      // First symbol should now be at index 2
      expect(newSymbols[2]).toBe(initialSymbols[0]);
    });
  });

  describe('importSymbols', () => {
    it('imports multiple symbols', () => {
      const { createWatchlist, importSymbols } = useWatchlistStore.getState();

      let newId: string = '';
      act(() => {
        newId = createWatchlist('Import Test');
        importSymbols(newId, ['META', 'AMZN', 'NFLX']);
      });

      const symbols = useWatchlistStore.getState().getWatchlistSymbols(newId);
      expect(symbols).toContain('META');
      expect(symbols).toContain('AMZN');
      expect(symbols).toContain('NFLX');
    });

    it('skips duplicates when importing', () => {
      const { importSymbols } = useWatchlistStore.getState();

      act(() => {
        importSymbols('default', ['SPY', 'SPY', 'NEWSTOCK']);
      });

      const watchlist = useWatchlistStore.getState().watchlists[0];
      const spyCount = watchlist.items.filter((i) => i.symbol === 'SPY').length;
      expect(spyCount).toBe(1);
    });

    it('normalizes and trims symbols', () => {
      const { createWatchlist, importSymbols } = useWatchlistStore.getState();

      let newId: string = '';
      act(() => {
        newId = createWatchlist('Normalize Test');
        importSymbols(newId, ['  meta  ', 'AMZN', '']);
      });

      const symbols = useWatchlistStore.getState().getWatchlistSymbols(newId);
      expect(symbols).toContain('META');
      expect(symbols).not.toContain('');
    });
  });

  describe('clearWatchlist', () => {
    it('removes all items from watchlist', () => {
      const { clearWatchlist } = useWatchlistStore.getState();

      act(() => {
        clearWatchlist('default');
      });

      expect(useWatchlistStore.getState().watchlists[0].items).toHaveLength(0);
    });
  });

  describe('selectors', () => {
    describe('getActiveWatchlist', () => {
      it('returns active watchlist', () => {
        const watchlist = useWatchlistStore.getState().getActiveWatchlist();

        expect(watchlist).not.toBeNull();
        expect(watchlist?.id).toBe('default');
      });

      it('returns null if no active watchlist', () => {
        act(() => {
          useWatchlistStore.getState().setActiveWatchlist(null);
        });

        const watchlist = useWatchlistStore.getState().getActiveWatchlist();
        expect(watchlist).toBeNull();
      });
    });

    describe('getWatchlistSymbols', () => {
      it('returns array of symbols', () => {
        const symbols = useWatchlistStore.getState().getWatchlistSymbols('default');

        expect(Array.isArray(symbols)).toBe(true);
        expect(symbols.length).toBeGreaterThan(0);
      });

      it('returns empty array for non-existent watchlist', () => {
        const symbols = useWatchlistStore.getState().getWatchlistSymbols('nonexistent');
        expect(symbols).toEqual([]);
      });
    });

    describe('isSymbolInWatchlist', () => {
      it('returns true for existing symbol', () => {
        expect(useWatchlistStore.getState().isSymbolInWatchlist('default', 'SPY')).toBe(true);
      });

      it('returns false for non-existent symbol', () => {
        expect(useWatchlistStore.getState().isSymbolInWatchlist('default', 'NONEXISTENT')).toBe(false);
      });
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      const { createWatchlist, addSymbol, reset } = useWatchlistStore.getState();

      act(() => {
        createWatchlist('Test');
        addSymbol('default', 'TEST123');
        reset();
      });

      const state = useWatchlistStore.getState();
      expect(state.watchlists).toHaveLength(1);
      expect(state.watchlists[0].id).toBe('default');
      expect(state.activeWatchlistId).toBe('default');
    });
  });
});
