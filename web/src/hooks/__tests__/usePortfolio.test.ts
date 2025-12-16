import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePortfolio, usePlacePaperTrade } from '../usePortfolio';
import { useTradesSync } from '../useTradesSync';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import * as portfolio from '@/lib/supabase/portfolio';
import * as apiExtended from '@/lib/api-extended';
import type { TradeEntry } from '@/lib/stores/trades-store';
import type { Position } from '@/lib/supabase/portfolio';

// Hoist mocks
const mockAddTrade = vi.hoisted(() => vi.fn());
const mockDeleteTrade = vi.hoisted(() => vi.fn());
const mockCalculatePositions = vi.hoisted(() => vi.fn());
const mockUpdatePositionsWithPrices = vi.hoisted(() => vi.fn());
const mockCalculatePortfolioSummary = vi.hoisted(() => vi.fn());
const mockQuote = vi.hoisted(() => vi.fn());

// Mock dependencies
vi.mock('../useTradesSync', () => ({
  useTradesSync: vi.fn(),
}));

vi.mock('@/lib/supabase/portfolio', () => ({
  calculatePositions: mockCalculatePositions,
  updatePositionsWithPrices: mockUpdatePositionsWithPrices,
  calculatePortfolioSummary: mockCalculatePortfolioSummary,
}));

vi.mock('@/lib/api-extended', () => ({
  api: {
    quote: (...args: any[]) => mockQuote(...args),
  },
}));

// Create a mock store state that we can control
const mockMarketDataState = {
  quotes: {},
  subscribe: vi.fn(),
  updateQuote: vi.fn(),
};

vi.mock('@/lib/stores/market-data-store', () => {
  const actual = vi.importActual('@/lib/stores/market-data-store');
  return {
    ...actual,
    useMarketDataStore: vi.fn((selector: any) => {
      const store = mockMarketDataState;
      return typeof selector === 'function' ? selector(store) : store;
    }),
  };
});

// Add getState to useMarketDataStore mock
(vi.mocked as any).getState = () => mockMarketDataState;

// Mock trades
const mockTrade: TradeEntry = {
  id: 'trade-1',
  symbol: 'BTC',
  action: 'BUY',
  quantity: 1,
  price: 48000,
  executedAt: '2024-01-01T00:00:00Z',
  orderType: 'MKT',
  notes: 'Test trade',
  tags: [],
  userId: 'user-1',
  syncStatus: 'synced',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockPosition: Position = {
  symbol: 'BTC',
  quantity: 1,
  avg_cost: 48000,
  total_cost: 48000,
  current_price: 50000,
  market_value: 50000,
  unrealized_pnl: 2000,
  unrealized_pnl_pct: 4.17,
  realized_pnl: 0,
  trades: [mockTrade],
  first_trade_at: '2024-01-01T00:00:00Z',
  last_trade_at: '2024-01-01T00:00:00Z',
};

const mockSummary = {
  total_value: 102000,
  cash: 52000,
  positions_value: 50000,
  unrealized_pnl: 2000,
  realized_pnl: 0,
  day_pnl: 0,
  positions_count: 1,
};

describe('usePortfolio', () => {
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockUpdateQuote: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSubscribe = vi.fn();
    mockUpdateQuote = vi.fn();

    // Reset the mock market data state
    mockMarketDataState.quotes = {};
    mockMarketDataState.subscribe = mockSubscribe;
    mockMarketDataState.updateQuote = mockUpdateQuote;

    // Add getState to the mock store
    (useMarketDataStore as any).getState = vi.fn(() => mockMarketDataState);

    // Default useTradesSync mock
    vi.mocked(useTradesSync).mockReturnValue({
      trades: [],
      addTrade: mockAddTrade,
      deleteTrade: mockDeleteTrade,
      updateTrade: vi.fn(),
      isLoading: false,
      isOnline: true,
      error: null,
      getTradeById: vi.fn(),
    } as any);

    // Default market data store mock
    vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
      const store = mockMarketDataState;
      return typeof selector === 'function' ? selector(store) : store;
    });

    // Default portfolio calculations
    mockCalculatePositions.mockReturnValue([]);
    mockUpdatePositionsWithPrices.mockImplementation((positions) => positions);
    mockCalculatePortfolioSummary.mockReturnValue({
      total_value: 100000,
      cash: 100000,
      positions_value: 0,
      unrealized_pnl: 0,
      realized_pnl: 0,
      day_pnl: 0,
      positions_count: 0,
    });

    // Default api.quote mock - return a resolved promise
    mockQuote.mockResolvedValue({ symbol: 'BTC', last: 50000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => usePortfolio());

      expect(result.current.trades).toEqual([]);
      expect(result.current.positions).toEqual([]);
      expect(result.current.summary.total_value).toBe(100000);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.isPriceLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(true);
      expect(typeof result.current.refresh).toBe('function');
      expect(typeof result.current.refreshPrices).toBe('function');
      expect(typeof result.current.placeTrade).toBe('function');
      expect(typeof result.current.removeTrade).toBe('function');
    });

    it('reflects loading state from useTradesSync', () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: true,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.isLoading).toBe(true);
    });

    it('reflects error state from useTradesSync', () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: false,
        error: 'Failed to load',
        getTradeById: vi.fn(),
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.error).toBe('Failed to load');
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Position Calculations', () => {
    it('calculates positions from trades', () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [mockTrade],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      mockCalculatePositions.mockReturnValue([mockPosition]);
      mockUpdatePositionsWithPrices.mockReturnValue([mockPosition]);
      mockCalculatePortfolioSummary.mockReturnValue(mockSummary);

      const { result } = renderHook(() => usePortfolio());

      expect(mockCalculatePositions).toHaveBeenCalledWith([mockTrade]);
      expect(result.current.positions).toHaveLength(1);
      expect(result.current.positions[0].symbol).toBe('BTC');
    });

    it('returns empty positions when no trades', () => {
      const { result } = renderHook(() => usePortfolio());

      expect(result.current.positions).toEqual([]);
      expect(mockCalculatePositions).not.toHaveBeenCalled();
    });

    it('updates positions with live prices', () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [mockTrade],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      // Update the mock state directly
      mockMarketDataState.quotes = {
        BTC: { symbol: 'BTC', last: 50000, executedAt: '2024-01-01T00:00:00Z' },
      };

      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const store = mockMarketDataState;
        return typeof selector === 'function' ? selector(store) : store;
      });

      mockCalculatePositions.mockReturnValue([
        { ...mockPosition, current_price: undefined },
      ]);
      mockUpdatePositionsWithPrices.mockReturnValue([mockPosition]);

      const { result } = renderHook(() => usePortfolio());

      expect(mockUpdatePositionsWithPrices).toHaveBeenCalledWith(
        [{ ...mockPosition, current_price: undefined }],
        { BTC: 50000 }
      );
    });

    it('calculates portfolio summary correctly', () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [mockTrade],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      mockCalculatePositions.mockReturnValue([mockPosition]);
      mockUpdatePositionsWithPrices.mockReturnValue([mockPosition]);
      mockCalculatePortfolioSummary.mockReturnValue(mockSummary);

      const { result } = renderHook(() => usePortfolio());

      expect(mockCalculatePortfolioSummary).toHaveBeenCalledWith(
        [mockPosition],
        100000
      );
      expect(result.current.summary).toEqual(mockSummary);
    });
  });

  describe('Price Fetching', () => {
    beforeEach(() => {
      // Don't use fake timers for async tests - they interfere with promise resolution
      vi.useRealTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('subscribes to position symbols', async () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [mockTrade],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      mockCalculatePositions.mockReturnValue([mockPosition]);
      mockQuote.mockResolvedValue({ symbol: 'BTC', last: 50000 });

      renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith('BTC');
      });
    });

    it('fetches prices for open positions', async () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [mockTrade],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      mockCalculatePositions.mockReturnValue([mockPosition]);
      mockQuote.mockResolvedValue({ symbol: 'BTC', last: 50000, bid: 49900, ask: 50100 });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(mockQuote).toHaveBeenCalledWith('BTC');
      });

      // Wait for isPriceLoading to become false
      await waitFor(() => {
        expect(result.current.isPriceLoading).toBe(false);
      });

      expect(result.current.lastPriceUpdate).toBeInstanceOf(Date);
    });

    it('polls prices at specified interval', async () => {
      // Use fake timers only for this test
      vi.useFakeTimers();

      vi.mocked(useTradesSync).mockReturnValue({
        trades: [mockTrade],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      mockCalculatePositions.mockReturnValue([mockPosition]);
      mockQuote.mockResolvedValue({ symbol: 'BTC', last: 50000 });

      renderHook(() => usePortfolio({ pollInterval: 5000 }));

      // Wait for initial call and flush promises
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      // React may render twice in strict mode, so check at least 1 call
      expect(mockQuote).toHaveBeenCalled();
      const initialCallCount = mockQuote.mock.calls.length;
      mockQuote.mockClear();

      // Advance time by poll interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should have exactly 1 more call after advancing timer
      expect(mockQuote).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('does not fetch prices when no positions', () => {
      renderHook(() => usePortfolio());

      expect(mockQuote).not.toHaveBeenCalled();
      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    it('handles price fetch errors gracefully', async () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [mockTrade],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      mockCalculatePositions.mockReturnValue([mockPosition]);
      // Mock individual quote failures - they're caught internally and return null
      mockQuote.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => usePortfolio());

      // Wait for the price fetch to complete (even though it fails)
      await waitFor(() => {
        expect(result.current.isPriceLoading).toBe(false);
      });

      // Verify the quote was attempted
      expect(mockQuote).toHaveBeenCalledWith('BTC');

      // When individual quotes fail, they return null and don't update lastPriceUpdate
      expect(result.current.lastPriceUpdate).toBeNull();
    });

    it('manual refreshPrices works correctly', async () => {
      vi.mocked(useTradesSync).mockReturnValue({
        trades: [mockTrade],
        addTrade: mockAddTrade,
        deleteTrade: mockDeleteTrade,
        updateTrade: vi.fn(),
        isLoading: false,
        isOnline: true,
        error: null,
        getTradeById: vi.fn(),
      } as any);

      mockCalculatePositions.mockReturnValue([mockPosition]);
      mockQuote.mockResolvedValue({ symbol: 'BTC', last: 51000 });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(mockQuote).toHaveBeenCalledTimes(1);
      });

      mockQuote.mockClear();

      await act(async () => {
        await result.current.refreshPrices();
      });

      expect(mockQuote).toHaveBeenCalledTimes(1);
      expect(result.current.isPriceLoading).toBe(false);
    });
  });

  describe('Trade Operations', () => {
    it('places a new trade successfully', async () => {
      const newTrade = {
        symbol: 'ETH',
        action: 'BUY' as const,
        quantity: 10,
        price: 3000,
        orderType: 'MKT' as const,
        notes: 'New trade',
        tags: ['test'],
      };

      mockAddTrade.mockResolvedValue({
        ...newTrade,
        id: 'trade-2',
        executedAt: '2024-01-02T00:00:00Z',
        userId: 'user-1',
        syncStatus: 'synced',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      });

      const { result } = renderHook(() => usePortfolio());

      let trade: TradeEntry | undefined;
      await act(async () => {
        trade = await result.current.placeTrade(newTrade);
      });

      expect(mockAddTrade).toHaveBeenCalledWith(newTrade);
      expect(trade?.symbol).toBe('ETH');
      expect(trade?.id).toBe('trade-2');
    });

    it('removes a trade successfully', async () => {
      mockDeleteTrade.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePortfolio());

      await act(async () => {
        await result.current.removeTrade('trade-1');
      });

      expect(mockDeleteTrade).toHaveBeenCalledWith('trade-1');
    });

    it('handles trade placement errors', async () => {
      mockAddTrade.mockRejectedValue(new Error('Failed to add trade'));

      const { result } = renderHook(() => usePortfolio());

      await expect(
        act(async () => {
          await result.current.placeTrade({
            symbol: 'BTC',
            action: 'BUY',
            quantity: 1,
            price: 50000,
            orderType: 'MKT',
          });
        })
      ).rejects.toThrow('Failed to add trade');
    });
  });

  describe('Refresh', () => {
    it('refresh function completes successfully', async () => {
      const { result } = renderHook(() => usePortfolio());

      expect(result.current.isRefreshing).toBe(false);

      let refreshPromise: Promise<void>;
      act(() => {
        refreshPromise = result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(true);
      });

      await act(async () => {
        await refreshPromise;
      });

      expect(result.current.isRefreshing).toBe(false);
    });
  });
});

describe('usePlacePaperTrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useTradesSync).mockReturnValue({
      trades: [],
      addTrade: mockAddTrade,
      deleteTrade: mockDeleteTrade,
      updateTrade: vi.fn(),
      isLoading: false,
      isOnline: true,
      error: null,
      getTradeById: vi.fn(),
    } as any);
  });

  it('executes trade with provided price', async () => {
    const tradeParams = {
      symbol: 'BTC',
      action: 'BUY' as const,
      quantity: 1,
      price: 48000,
      orderType: 'LMT' as const,
      notes: 'Limit order',
      tags: ['manual'],
    };

    mockAddTrade.mockResolvedValue({
      ...tradeParams,
      id: 'trade-1',
      executedAt: '2024-01-01T00:00:00Z',
      userId: 'user-1',
      syncStatus: 'synced',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => usePlacePaperTrade());

    let trade: TradeEntry | null = null;
    await act(async () => {
      trade = await result.current.execute(tradeParams);
    });

    expect(mockAddTrade).toHaveBeenCalledWith(tradeParams);
    expect(trade?.symbol).toBe('BTC');
    expect(result.current.error).toBeNull();
  });

  it('fetches current price when not provided', async () => {
    mockQuote.mockResolvedValue({ symbol: 'BTC', last: 49500 });
    mockAddTrade.mockResolvedValue({
      id: 'trade-1',
      symbol: 'BTC',
      action: 'BUY',
      quantity: 1,
      price: 49500,
      orderType: 'MKT',
      executedAt: '2024-01-01T00:00:00Z',
      userId: 'user-1',
      syncStatus: 'synced',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => usePlacePaperTrade());

    await act(async () => {
      await result.current.execute({
        symbol: 'BTC',
        action: 'BUY',
        quantity: 1,
        orderType: 'MKT',
      });
    });

    expect(mockQuote).toHaveBeenCalledWith('BTC');
    expect(mockAddTrade).toHaveBeenCalledWith({
      symbol: 'BTC',
      action: 'BUY',
      quantity: 1,
      price: 49500,
      orderType: 'MKT',
    });
  });

  it('handles error when price cannot be fetched', async () => {
    mockQuote.mockResolvedValue({ symbol: 'BTC', last: null });

    const { result } = renderHook(() => usePlacePaperTrade());

    let trade: TradeEntry | null = null;
    await act(async () => {
      trade = await result.current.execute({
        symbol: 'BTC',
        action: 'BUY',
        quantity: 1,
        orderType: 'MKT',
      });
    });

    expect(trade).toBeNull();
    expect(result.current.error).toBe('Could not get current price');
  });

  it('handles trade execution errors', async () => {
    mockAddTrade.mockRejectedValue(new Error('Failed to place trade'));

    const { result } = renderHook(() => usePlacePaperTrade());

    let trade: TradeEntry | null = null;
    await act(async () => {
      trade = await result.current.execute({
        symbol: 'BTC',
        action: 'BUY',
        quantity: 1,
        price: 48000,
        orderType: 'MKT',
      });
    });

    expect(trade).toBeNull();
    expect(result.current.error).toBe('Failed to place trade');
  });

  it('clears error correctly', async () => {
    mockAddTrade.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => usePlacePaperTrade());

    await act(async () => {
      await result.current.execute({
        symbol: 'BTC',
        action: 'BUY',
        quantity: 1,
        price: 48000,
        orderType: 'MKT',
      });
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('manages submitting state correctly', async () => {
    let resolveAdd: any;
    const addPromise = new Promise((resolve) => {
      resolveAdd = resolve;
    });
    mockAddTrade.mockReturnValue(addPromise as any);

    const { result } = renderHook(() => usePlacePaperTrade());

    expect(result.current.isSubmitting).toBe(false);

    act(() => {
      result.current.execute({
        symbol: 'BTC',
        action: 'BUY',
        quantity: 1,
        price: 48000,
        orderType: 'MKT',
      });
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(true);
    });

    await act(async () => {
      resolveAdd({
        id: 'trade-1',
        symbol: 'BTC',
        action: 'BUY',
        quantity: 1,
        price: 48000,
        orderType: 'MKT',
        executedAt: '2024-01-01T00:00:00Z',
        userId: 'user-1',
        syncStatus: 'synced',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
