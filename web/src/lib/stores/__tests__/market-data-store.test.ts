import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMarketDataStore, QuoteData, OHLCVBar } from '../market-data-store';
import { act } from '@testing-library/react';

describe('useMarketDataStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useMarketDataStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('starts with empty quotes', () => {
      const { quotes } = useMarketDataStore.getState();
      expect(quotes).toEqual({});
    });

    it('starts with empty bars', () => {
      const { bars } = useMarketDataStore.getState();
      expect(bars).toEqual({});
    });

    it('starts disconnected', () => {
      const { wsConnected, wsReconnecting } = useMarketDataStore.getState();
      expect(wsConnected).toBe(false);
      expect(wsReconnecting).toBe(false);
    });

    it('has no subscribed symbols', () => {
      const { subscribedSymbols } = useMarketDataStore.getState();
      expect(subscribedSymbols.size).toBe(0);
    });
  });

  describe('updateQuote', () => {
    it('updates quote for symbol', async () => {
      const { updateQuote } = useMarketDataStore.getState();
      const quote: QuoteData = {
        symbol: 'AAPL',
        last: 150.50,
        timestamp: new Date().toISOString(),
      };

      act(() => {
        updateQuote('AAPL', quote);
      });

      // Wait for RAF batching
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const { quotes } = useMarketDataStore.getState();
      expect(quotes['AAPL']).toBeDefined();
      expect(quotes['AAPL'].last).toBe(150.50);
    });

    it('batches multiple updates via RAF', async () => {
      const { updateQuote } = useMarketDataStore.getState();

      act(() => {
        updateQuote('AAPL', { symbol: 'AAPL', last: 150, timestamp: '' });
        updateQuote('MSFT', { symbol: 'MSFT', last: 300, timestamp: '' });
        updateQuote('GOOGL', { symbol: 'GOOGL', last: 140, timestamp: '' });
      });

      // Wait for RAF to process
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const { quotes } = useMarketDataStore.getState();
      expect(Object.keys(quotes)).toHaveLength(3);
    });
  });

  describe('updateQuotes', () => {
    it('updates multiple quotes at once', () => {
      const { updateQuotes } = useMarketDataStore.getState();
      const quotes: QuoteData[] = [
        { symbol: 'AAPL', last: 150, timestamp: '' },
        { symbol: 'MSFT', last: 300, timestamp: '' },
      ];

      act(() => {
        updateQuotes(quotes);
      });

      const state = useMarketDataStore.getState();
      expect(state.quotes['AAPL']).toBeDefined();
      expect(state.quotes['MSFT']).toBeDefined();
    });
  });

  describe('setBars', () => {
    it('sets bar data for symbol', () => {
      const { setBars } = useMarketDataStore.getState();
      const bars: OHLCVBar[] = [
        { time: 1700000000, open: 100, high: 105, low: 99, close: 104 },
        { time: 1700086400, open: 104, high: 108, low: 103, close: 107 },
      ];

      act(() => {
        setBars('AAPL', bars);
      });

      const state = useMarketDataStore.getState();
      expect(state.bars['AAPL']).toEqual(bars);
      expect(state.isLoadingBars['AAPL']).toBe(false);
    });

    it('evicts oldest symbol when cache exceeds limit', () => {
      const { setBars } = useMarketDataStore.getState();

      // Add 10 symbols (max cache)
      act(() => {
        for (let i = 0; i < 10; i++) {
          setBars(`SYM${i}`, [{ time: 1700000000 + i, open: 100, high: 105, low: 99, close: 104 }]);
        }
      });

      // All 10 should be present
      expect(Object.keys(useMarketDataStore.getState().bars)).toHaveLength(10);

      // Add one more (11th)
      act(() => {
        setBars('SYM10', [{ time: 1700000000, open: 100, high: 105, low: 99, close: 104 }]);
      });

      // Still 10 (LRU eviction)
      const bars = useMarketDataStore.getState().bars;
      expect(Object.keys(bars)).toHaveLength(10);

      // First symbol should be evicted
      expect(bars['SYM0']).toBeUndefined();
      // New symbol should be present
      expect(bars['SYM10']).toBeDefined();
    });
  });

  describe('appendBar', () => {
    it('appends bar to existing data', () => {
      const { setBars, appendBar } = useMarketDataStore.getState();

      act(() => {
        setBars('AAPL', [{ time: 1700000000, open: 100, high: 105, low: 99, close: 104 }]);
        appendBar('AAPL', { time: 1700086400, open: 104, high: 108, low: 103, close: 107 });
      });

      const bars = useMarketDataStore.getState().bars['AAPL'];
      expect(bars).toHaveLength(2);
    });

    it('creates array if symbol has no data', () => {
      const { appendBar } = useMarketDataStore.getState();

      act(() => {
        appendBar('NEWSTOCK', { time: 1700000000, open: 100, high: 105, low: 99, close: 104 });
      });

      const bars = useMarketDataStore.getState().bars['NEWSTOCK'];
      expect(bars).toHaveLength(1);
    });
  });

  describe('updateLastBar', () => {
    it('updates bar with same timestamp', () => {
      const { setBars, updateLastBar } = useMarketDataStore.getState();

      act(() => {
        setBars('AAPL', [{ time: 1700000000, open: 100, high: 105, low: 99, close: 104 }]);
        updateLastBar('AAPL', { time: 1700000000, open: 100, high: 110, low: 99, close: 108 });
      });

      const bars = useMarketDataStore.getState().bars['AAPL'];
      expect(bars).toHaveLength(1);
      expect(bars[0].high).toBe(110);
      expect(bars[0].close).toBe(108);
    });

    it('appends bar with different timestamp', () => {
      const { setBars, updateLastBar } = useMarketDataStore.getState();

      act(() => {
        setBars('AAPL', [{ time: 1700000000, open: 100, high: 105, low: 99, close: 104 }]);
        updateLastBar('AAPL', { time: 1700086400, open: 104, high: 108, low: 103, close: 107 });
      });

      const bars = useMarketDataStore.getState().bars['AAPL'];
      expect(bars).toHaveLength(2);
    });

    it('creates array if no existing data', () => {
      const { updateLastBar } = useMarketDataStore.getState();

      act(() => {
        updateLastBar('AAPL', { time: 1700000000, open: 100, high: 105, low: 99, close: 104 });
      });

      const bars = useMarketDataStore.getState().bars['AAPL'];
      expect(bars).toHaveLength(1);
    });
  });

  describe('WebSocket state', () => {
    it('sets connected state', () => {
      const { setWsConnected } = useMarketDataStore.getState();

      act(() => {
        setWsConnected(true);
      });

      const state = useMarketDataStore.getState();
      expect(state.wsConnected).toBe(true);
      expect(state.wsReconnecting).toBe(false);
      expect(state.lastError).toBeNull();
    });

    it('sets reconnecting state', () => {
      const { setWsReconnecting } = useMarketDataStore.getState();

      act(() => {
        setWsReconnecting(true);
      });

      expect(useMarketDataStore.getState().wsReconnecting).toBe(true);
    });

    it('sets last error', () => {
      const { setLastError } = useMarketDataStore.getState();

      act(() => {
        setLastError('Connection failed');
      });

      expect(useMarketDataStore.getState().lastError).toBe('Connection failed');
    });
  });

  describe('subscriptions', () => {
    it('subscribes to symbol', () => {
      const { subscribe, isSubscribed } = useMarketDataStore.getState();

      act(() => {
        subscribe('AAPL');
      });

      expect(isSubscribed('AAPL')).toBe(true);
      expect(useMarketDataStore.getState().subscribedSymbols.has('AAPL')).toBe(true);
    });

    it('unsubscribes from symbol', () => {
      const { subscribe, unsubscribe, isSubscribed } = useMarketDataStore.getState();

      act(() => {
        subscribe('AAPL');
        unsubscribe('AAPL');
      });

      expect(isSubscribed('AAPL')).toBe(false);
    });

    it('clears all subscriptions', () => {
      const { subscribe, clearSubscriptions } = useMarketDataStore.getState();

      act(() => {
        subscribe('AAPL');
        subscribe('MSFT');
        subscribe('GOOGL');
        clearSubscriptions();
      });

      expect(useMarketDataStore.getState().subscribedSymbols.size).toBe(0);
    });
  });

  describe('loading states', () => {
    it('sets loading state for bars', () => {
      const { setLoadingBars } = useMarketDataStore.getState();

      act(() => {
        setLoadingBars('AAPL', true);
      });

      expect(useMarketDataStore.getState().isLoadingBars['AAPL']).toBe(true);

      act(() => {
        setLoadingBars('AAPL', false);
      });

      expect(useMarketDataStore.getState().isLoadingBars['AAPL']).toBe(false);
    });
  });

  describe('selectors', () => {
    describe('getQuote', () => {
      it('returns quote for symbol', async () => {
        const { updateQuote, getQuote } = useMarketDataStore.getState();
        const quote: QuoteData = { symbol: 'AAPL', last: 150, timestamp: '' };

        act(() => {
          updateQuote('AAPL', quote);
        });

        await act(async () => {
          await new Promise((r) => setTimeout(r, 50));
        });

        expect(getQuote('AAPL')).toBeDefined();
        expect(getQuote('AAPL')?.last).toBe(150);
      });

      it('returns undefined for unknown symbol', () => {
        expect(useMarketDataStore.getState().getQuote('UNKNOWN')).toBeUndefined();
      });
    });

    describe('getBars', () => {
      it('returns bars for symbol', () => {
        const { setBars, getBars } = useMarketDataStore.getState();

        act(() => {
          setBars('AAPL', [{ time: 1700000000, open: 100, high: 105, low: 99, close: 104 }]);
        });

        const bars = getBars('AAPL');
        expect(bars).toHaveLength(1);
      });

      it('returns empty array for unknown symbol', () => {
        expect(useMarketDataStore.getState().getBars('UNKNOWN')).toEqual([]);
      });
    });
  });

  describe('reset', () => {
    it('resets all state', async () => {
      const { updateQuote, setBars, subscribe, setWsConnected, reset } = useMarketDataStore.getState();

      act(() => {
        updateQuote('AAPL', { symbol: 'AAPL', last: 150, timestamp: '' });
        setBars('AAPL', [{ time: 1700000000, open: 100, high: 105, low: 99, close: 104 }]);
        subscribe('AAPL');
        setWsConnected(true);
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      act(() => {
        reset();
      });

      const state = useMarketDataStore.getState();
      expect(state.quotes).toEqual({});
      expect(state.bars).toEqual({});
      expect(state.subscribedSymbols.size).toBe(0);
      expect(state.wsConnected).toBe(false);
    });
  });
});
