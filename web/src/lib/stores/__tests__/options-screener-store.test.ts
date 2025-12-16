import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useOptionsScreenerStore } from '../options-screener-store';
import { act } from '@testing-library/react';
import type { OptionContract, ScreenerFilters } from '@/lib/types/options';
import { DEFAULT_SCREENER_FILTERS } from '@/lib/types/options';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useOptionsScreenerStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useOptionsScreenerStore.setState({
        filters: { ...DEFAULT_SCREENER_FILTERS },
        results: [],
        totalCount: 0,
        isLoading: false,
        hasRun: false,
        error: null,
        selectedContracts: [],
      });
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Suppress console.error for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('has default filters', () => {
      const { filters } = useOptionsScreenerStore.getState();

      expect(filters.underlying_symbols).toEqual(['SPY']);
      expect(filters.min_dte).toBe(7);
      expect(filters.max_dte).toBe(45);
      expect(filters.min_volume).toBe(100);
      expect(filters.min_open_interest).toBe(500);
      expect(filters.sort_by).toBe('volume');
      expect(filters.sort_order).toBe('desc');
      expect(filters.limit).toBe(100);
    });

    it('has empty results', () => {
      const { results, totalCount } = useOptionsScreenerStore.getState();

      expect(results).toEqual([]);
      expect(totalCount).toBe(0);
    });

    it('is not loading', () => {
      const { isLoading } = useOptionsScreenerStore.getState();

      expect(isLoading).toBe(false);
    });

    it('has not run', () => {
      const { hasRun } = useOptionsScreenerStore.getState();

      expect(hasRun).toBe(false);
    });

    it('has no error', () => {
      const { error } = useOptionsScreenerStore.getState();

      expect(error).toBeNull();
    });

    it('has empty selected contracts', () => {
      const { selectedContracts } = useOptionsScreenerStore.getState();

      expect(selectedContracts).toEqual([]);
    });
  });

  describe('Filter Actions', () => {
    describe('setUnderlyingSymbols', () => {
      it('sets underlying symbols', () => {
        act(() => {
          useOptionsScreenerStore.getState().setUnderlyingSymbols(['AAPL', 'TSLA', 'NVDA']);
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).toEqual([
          'AAPL',
          'TSLA',
          'NVDA',
        ]);
      });

      it('replaces existing symbols', () => {
        act(() => {
          useOptionsScreenerStore.getState().setUnderlyingSymbols(['AAPL']);
          useOptionsScreenerStore.getState().setUnderlyingSymbols(['MSFT', 'GOOGL']);
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).toEqual([
          'MSFT',
          'GOOGL',
        ]);
      });

      it('accepts empty array', () => {
        act(() => {
          useOptionsScreenerStore.getState().setUnderlyingSymbols([]);
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).toEqual([]);
      });
    });

    describe('addSymbol', () => {
      it('adds symbol in uppercase', () => {
        act(() => {
          useOptionsScreenerStore.getState().addSymbol('aapl');
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).toContain('AAPL');
      });

      it('adds to existing symbols', () => {
        act(() => {
          useOptionsScreenerStore.getState().addSymbol('TSLA');
        });

        const symbols = useOptionsScreenerStore.getState().filters.underlying_symbols;
        expect(symbols).toContain('SPY'); // Default symbol
        expect(symbols).toContain('TSLA');
        expect(symbols).toHaveLength(2);
      });

      it('does not add duplicate symbols', () => {
        act(() => {
          useOptionsScreenerStore.getState().addSymbol('spy');
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).toEqual(['SPY']);
      });

      it('handles mixed case duplicates', () => {
        act(() => {
          useOptionsScreenerStore.getState().addSymbol('SPY');
          useOptionsScreenerStore.getState().addSymbol('spy');
          useOptionsScreenerStore.getState().addSymbol('Spy');
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).toEqual(['SPY']);
      });

      it('adds multiple unique symbols', () => {
        act(() => {
          useOptionsScreenerStore.getState().addSymbol('AAPL');
          useOptionsScreenerStore.getState().addSymbol('TSLA');
          useOptionsScreenerStore.getState().addSymbol('NVDA');
        });

        const symbols = useOptionsScreenerStore.getState().filters.underlying_symbols;
        expect(symbols).toHaveLength(4);
        expect(symbols).toEqual(['SPY', 'AAPL', 'TSLA', 'NVDA']);
      });
    });

    describe('removeSymbol', () => {
      beforeEach(() => {
        act(() => {
          useOptionsScreenerStore.getState().setUnderlyingSymbols(['SPY', 'AAPL', 'TSLA']);
        });
      });

      it('removes symbol', () => {
        act(() => {
          useOptionsScreenerStore.getState().removeSymbol('AAPL');
        });

        const symbols = useOptionsScreenerStore.getState().filters.underlying_symbols;
        expect(symbols).not.toContain('AAPL');
        expect(symbols).toHaveLength(2);
      });

      it('removes symbol case-insensitively', () => {
        act(() => {
          useOptionsScreenerStore.getState().removeSymbol('aapl');
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).not.toContain('AAPL');
      });

      it('handles non-existent symbol gracefully', () => {
        const originalSymbols = useOptionsScreenerStore.getState().filters.underlying_symbols;

        act(() => {
          useOptionsScreenerStore.getState().removeSymbol('NONEXISTENT');
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).toEqual(
          originalSymbols
        );
      });

      it('can remove all symbols', () => {
        act(() => {
          useOptionsScreenerStore.getState().removeSymbol('SPY');
          useOptionsScreenerStore.getState().removeSymbol('AAPL');
          useOptionsScreenerStore.getState().removeSymbol('TSLA');
        });

        expect(useOptionsScreenerStore.getState().filters.underlying_symbols).toEqual([]);
      });
    });

    describe('setOptionTypes', () => {
      it('sets call option type', () => {
        act(() => {
          useOptionsScreenerStore.getState().setOptionTypes(['call']);
        });

        expect(useOptionsScreenerStore.getState().filters.option_types).toEqual(['call']);
      });

      it('sets put option type', () => {
        act(() => {
          useOptionsScreenerStore.getState().setOptionTypes(['put']);
        });

        expect(useOptionsScreenerStore.getState().filters.option_types).toEqual(['put']);
      });

      it('sets both option types', () => {
        act(() => {
          useOptionsScreenerStore.getState().setOptionTypes(['call', 'put']);
        });

        expect(useOptionsScreenerStore.getState().filters.option_types).toEqual(['call', 'put']);
      });

      it('sets to undefined to clear filter', () => {
        act(() => {
          useOptionsScreenerStore.getState().setOptionTypes(['call']);
          useOptionsScreenerStore.getState().setOptionTypes(undefined);
        });

        expect(useOptionsScreenerStore.getState().filters.option_types).toBeUndefined();
      });
    });

    describe('setDteRange', () => {
      it('sets DTE range', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDteRange(14, 60);
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters.min_dte).toBe(14);
        expect(filters.max_dte).toBe(60);
      });

      it('handles zero minimum', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDteRange(0, 30);
        });

        expect(useOptionsScreenerStore.getState().filters.min_dte).toBe(0);
      });

      it('handles large maximum', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDteRange(7, 365);
        });

        expect(useOptionsScreenerStore.getState().filters.max_dte).toBe(365);
      });

      it('allows equal min and max', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDteRange(30, 30);
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters.min_dte).toBe(30);
        expect(filters.max_dte).toBe(30);
      });
    });

    describe('setMinVolume', () => {
      it('sets minimum volume', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMinVolume(500);
        });

        expect(useOptionsScreenerStore.getState().filters.min_volume).toBe(500);
      });

      it('handles zero volume', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMinVolume(0);
        });

        expect(useOptionsScreenerStore.getState().filters.min_volume).toBe(0);
      });

      it('handles large volume', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMinVolume(1000000);
        });

        expect(useOptionsScreenerStore.getState().filters.min_volume).toBe(1000000);
      });
    });

    describe('setMinOpenInterest', () => {
      it('sets minimum open interest', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMinOpenInterest(1000);
        });

        expect(useOptionsScreenerStore.getState().filters.min_open_interest).toBe(1000);
      });

      it('handles zero open interest', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMinOpenInterest(0);
        });

        expect(useOptionsScreenerStore.getState().filters.min_open_interest).toBe(0);
      });
    });

    describe('setDeltaRange', () => {
      it('sets delta range', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDeltaRange(0.30, 0.70);
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters.min_delta).toBe(0.30);
        expect(filters.max_delta).toBe(0.70);
      });

      it('sets only minimum delta', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDeltaRange(0.50, undefined);
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters.min_delta).toBe(0.50);
        expect(filters.max_delta).toBeUndefined();
      });

      it('sets only maximum delta', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDeltaRange(undefined, 0.50);
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters.min_delta).toBeUndefined();
        expect(filters.max_delta).toBe(0.50);
      });

      it('clears both values', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDeltaRange(0.30, 0.70);
          useOptionsScreenerStore.getState().setDeltaRange(undefined, undefined);
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters.min_delta).toBeUndefined();
        expect(filters.max_delta).toBeUndefined();
      });

      it('handles negative delta values', () => {
        act(() => {
          useOptionsScreenerStore.getState().setDeltaRange(-0.50, -0.30);
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters.min_delta).toBe(-0.50);
        expect(filters.max_delta).toBe(-0.30);
      });
    });

    describe('setIvRange', () => {
      it('sets IV range', () => {
        act(() => {
          useOptionsScreenerStore.getState().setIvRange(0.20, 0.40);
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters.min_iv).toBe(0.20);
        expect(filters.max_iv).toBe(0.40);
      });

      it('sets only minimum IV', () => {
        act(() => {
          useOptionsScreenerStore.getState().setIvRange(0.25, undefined);
        });

        expect(useOptionsScreenerStore.getState().filters.min_iv).toBe(0.25);
      });

      it('sets only maximum IV', () => {
        act(() => {
          useOptionsScreenerStore.getState().setIvRange(undefined, 0.60);
        });

        expect(useOptionsScreenerStore.getState().filters.max_iv).toBe(0.60);
      });
    });

    describe('setMaxBidAskSpread', () => {
      it('sets max bid-ask spread percentage', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMaxBidAskSpread(5);
        });

        expect(useOptionsScreenerStore.getState().filters.max_bid_ask_spread_pct).toBe(5);
      });

      it('clears max bid-ask spread with undefined', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMaxBidAskSpread(5);
          useOptionsScreenerStore.getState().setMaxBidAskSpread(undefined);
        });

        expect(useOptionsScreenerStore.getState().filters.max_bid_ask_spread_pct).toBeUndefined();
      });

      it('handles zero spread', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMaxBidAskSpread(0);
        });

        expect(useOptionsScreenerStore.getState().filters.max_bid_ask_spread_pct).toBe(0);
      });
    });

    describe('setMoneyness', () => {
      it('sets ITM moneyness', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMoneyness(['itm']);
        });

        expect(useOptionsScreenerStore.getState().filters.moneyness).toEqual(['itm']);
      });

      it('sets ATM moneyness', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMoneyness(['atm']);
        });

        expect(useOptionsScreenerStore.getState().filters.moneyness).toEqual(['atm']);
      });

      it('sets OTM moneyness', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMoneyness(['otm']);
        });

        expect(useOptionsScreenerStore.getState().filters.moneyness).toEqual(['otm']);
      });

      it('sets multiple moneyness values', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMoneyness(['itm', 'atm']);
        });

        expect(useOptionsScreenerStore.getState().filters.moneyness).toEqual(['itm', 'atm']);
      });

      it('clears moneyness with undefined', () => {
        act(() => {
          useOptionsScreenerStore.getState().setMoneyness(['itm']);
          useOptionsScreenerStore.getState().setMoneyness(undefined);
        });

        expect(useOptionsScreenerStore.getState().filters.moneyness).toBeUndefined();
      });
    });

    describe('setSortBy', () => {
      const sortByOptions = ['volume', 'open_interest', 'delta', 'iv', 'dte', 'bid_ask_spread'] as const;

      sortByOptions.forEach((sortBy) => {
        it(`sets sort by ${sortBy}`, () => {
          act(() => {
            useOptionsScreenerStore.getState().setSortBy(sortBy);
          });

          expect(useOptionsScreenerStore.getState().filters.sort_by).toBe(sortBy);
        });
      });
    });

    describe('setSortOrder', () => {
      it('sets ascending sort order', () => {
        act(() => {
          useOptionsScreenerStore.getState().setSortOrder('asc');
        });

        expect(useOptionsScreenerStore.getState().filters.sort_order).toBe('asc');
      });

      it('sets descending sort order', () => {
        act(() => {
          useOptionsScreenerStore.getState().setSortOrder('desc');
        });

        expect(useOptionsScreenerStore.getState().filters.sort_order).toBe('desc');
      });
    });

    describe('setLimit', () => {
      it('sets result limit', () => {
        act(() => {
          useOptionsScreenerStore.getState().setLimit(50);
        });

        expect(useOptionsScreenerStore.getState().filters.limit).toBe(50);
      });

      it('handles large limits', () => {
        act(() => {
          useOptionsScreenerStore.getState().setLimit(1000);
        });

        expect(useOptionsScreenerStore.getState().filters.limit).toBe(1000);
      });
    });

    describe('resetFilters', () => {
      it('resets all filters to defaults', () => {
        act(() => {
          useOptionsScreenerStore.getState().setUnderlyingSymbols(['AAPL']);
          useOptionsScreenerStore.getState().setOptionTypes(['call']);
          useOptionsScreenerStore.getState().setDteRange(30, 90);
          useOptionsScreenerStore.getState().setMinVolume(1000);
          useOptionsScreenerStore.getState().setDeltaRange(0.40, 0.60);
          useOptionsScreenerStore.getState().setMoneyness(['itm']);

          useOptionsScreenerStore.getState().resetFilters();
        });

        const filters = useOptionsScreenerStore.getState().filters;
        expect(filters).toEqual(DEFAULT_SCREENER_FILTERS);
      });

      it('preserves results when resetting filters', () => {
        const mockResults = [{ symbol: 'TEST' }] as any;

        act(() => {
          useOptionsScreenerStore.setState({ results: mockResults });
          useOptionsScreenerStore.getState().resetFilters();
        });

        expect(useOptionsScreenerStore.getState().results).toEqual(mockResults);
      });
    });
  });

  describe('Screen Action', () => {
    const mockContracts: OptionContract[] = [
      {
        symbol: 'SPY241220C00450000',
        underlying_symbol: 'SPY',
        option_type: 'call',
        strike_price: 450,
        expiration_date: '2024-12-20',
        days_to_expiration: 30,
        bid: 5.40,
        ask: 5.60,
        last_price: 5.50,
        volume: 1000,
        open_interest: 5000,
        delta: 0.55,
        gamma: 0.02,
        theta: -0.05,
        vega: 0.15,
        implied_volatility: 0.25,
        bid_ask_spread: 0.20,
        bid_ask_spread_pct: 3.6,
        moneyness: 'atm',
        underlying_price: 450,
      },
      {
        symbol: 'SPY241220P00450000',
        underlying_symbol: 'SPY',
        option_type: 'put',
        strike_price: 450,
        expiration_date: '2024-12-20',
        days_to_expiration: 30,
        bid: 5.30,
        ask: 5.50,
        last_price: 5.40,
        volume: 800,
        open_interest: 4000,
        delta: -0.45,
        gamma: 0.02,
        theta: -0.04,
        vega: 0.15,
        implied_volatility: 0.26,
        bid_ask_spread: 0.20,
        bid_ask_spread_pct: 3.7,
        moneyness: 'atm',
        underlying_price: 450,
      },
    ];

    describe('runScreen', () => {
      it('performs successful screen', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            contracts: mockContracts,
            total_count: 2,
          }),
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        const state = useOptionsScreenerStore.getState();
        expect(state.results).toEqual(mockContracts);
        expect(state.totalCount).toBe(2);
        expect(state.hasRun).toBe(true);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('sets isLoading during screen', async () => {
        let resolveScreen: any;
        const screenPromise = new Promise((resolve) => {
          resolveScreen = resolve;
        });

        mockFetch.mockReturnValueOnce(
          screenPromise.then(() => ({
            ok: true,
            json: async () => ({ contracts: mockContracts, total_count: 2 }),
          }))
        );

        const runPromise = act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        // Check loading state
        expect(useOptionsScreenerStore.getState().isLoading).toBe(true);

        resolveScreen();
        await runPromise;

        expect(useOptionsScreenerStore.getState().isLoading).toBe(false);
      });

      it('sends correct request payload', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ contracts: mockContracts, total_count: 2 }),
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/options/screen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(DEFAULT_SCREENER_FILTERS),
        });
      });

      it('validates symbols exist before screening', async () => {
        act(() => {
          useOptionsScreenerStore.getState().setUnderlyingSymbols([]);
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(useOptionsScreenerStore.getState().error).toBe(
          'Please add at least one symbol to screen'
        );
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('handles API error response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ detail: 'Invalid filter parameters' }),
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(useOptionsScreenerStore.getState().error).toBe('Invalid filter parameters');
        expect(useOptionsScreenerStore.getState().isLoading).toBe(false);
      });

      it('handles API error without detail', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({}),
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(useOptionsScreenerStore.getState().error).toBe('HTTP 500');
      });

      it('handles network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(useOptionsScreenerStore.getState().error).toBe('Network error');
        expect(useOptionsScreenerStore.getState().isLoading).toBe(false);
      });

      it('handles JSON parse error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => {
            throw new Error('Invalid JSON');
          },
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(useOptionsScreenerStore.getState().error).toBe('HTTP 400');
      });

      it('clears previous error on successful screen', async () => {
        act(() => {
          useOptionsScreenerStore.setState({ error: 'Previous error' });
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ contracts: mockContracts, total_count: 2 }),
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(useOptionsScreenerStore.getState().error).toBeNull();
      });

      it('shows success toast with contract count', async () => {
        const { toast } = await import('sonner');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ contracts: mockContracts, total_count: 2 }),
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(toast.success).toHaveBeenCalledWith('Screening Complete', {
          description: 'Found 2 contracts matching your criteria',
          duration: 3000,
        });
      });

      it('handles singular contract in toast', async () => {
        const { toast } = await import('sonner');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ contracts: [mockContracts[0]], total_count: 1 }),
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(toast.success).toHaveBeenCalledWith('Screening Complete', {
          description: 'Found 1 contract matching your criteria',
          duration: 3000,
        });
      });

      it('handles zero results', async () => {
        const { toast } = await import('sonner');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ contracts: [], total_count: 0 }),
        });

        await act(async () => {
          await useOptionsScreenerStore.getState().runScreen();
        });

        expect(useOptionsScreenerStore.getState().results).toEqual([]);
        expect(useOptionsScreenerStore.getState().totalCount).toBe(0);
        expect(toast.success).toHaveBeenCalledWith('Screening Complete', {
          description: 'Found 0 contracts matching your criteria',
          duration: 3000,
        });
      });
    });

    describe('clearResults', () => {
      beforeEach(() => {
        act(() => {
          useOptionsScreenerStore.setState({
            results: mockContracts,
            totalCount: 2,
            hasRun: true,
            error: 'Some error',
          });
        });
      });

      it('clears all results', () => {
        act(() => {
          useOptionsScreenerStore.getState().clearResults();
        });

        const state = useOptionsScreenerStore.getState();
        expect(state.results).toEqual([]);
        expect(state.totalCount).toBe(0);
        expect(state.hasRun).toBe(false);
        expect(state.error).toBeNull();
      });

      it('preserves filters when clearing results', () => {
        const originalFilters = useOptionsScreenerStore.getState().filters;

        act(() => {
          useOptionsScreenerStore.getState().clearResults();
        });

        expect(useOptionsScreenerStore.getState().filters).toEqual(originalFilters);
      });

      it('handles empty results gracefully', () => {
        act(() => {
          useOptionsScreenerStore.setState({
            results: [],
            totalCount: 0,
            hasRun: false,
          });

          useOptionsScreenerStore.getState().clearResults();
        });

        expect(useOptionsScreenerStore.getState().results).toEqual([]);
      });
    });
  });

  describe('Contract Selection', () => {
    const mockContract1: OptionContract = {
      symbol: 'SPY241220C00450000',
      underlying_symbol: 'SPY',
      option_type: 'call',
      strike_price: 450,
      expiration_date: '2024-12-20',
      days_to_expiration: 30,
      bid: 5.40,
      ask: 5.60,
      last_price: 5.50,
      volume: 1000,
      open_interest: 5000,
      delta: 0.55,
      gamma: 0.02,
      theta: -0.05,
      vega: 0.15,
      implied_volatility: 0.25,
      bid_ask_spread: 0.20,
      bid_ask_spread_pct: 3.6,
      moneyness: 'atm',
      underlying_price: 450,
    };

    const mockContract2: OptionContract = {
      ...mockContract1,
      symbol: 'SPY241220P00450000',
      option_type: 'put',
    };

    describe('selectContract', () => {
      it('selects a contract', () => {
        act(() => {
          useOptionsScreenerStore.getState().selectContract(mockContract1);
        });

        const selected = useOptionsScreenerStore.getState().selectedContracts;
        expect(selected).toHaveLength(1);
        expect(selected[0]).toEqual(mockContract1);
      });

      it('selects multiple contracts', () => {
        act(() => {
          useOptionsScreenerStore.getState().selectContract(mockContract1);
          useOptionsScreenerStore.getState().selectContract(mockContract2);
        });

        const selected = useOptionsScreenerStore.getState().selectedContracts;
        expect(selected).toHaveLength(2);
        expect(selected[0]).toEqual(mockContract1);
        expect(selected[1]).toEqual(mockContract2);
      });

      it('does not add duplicate contracts', () => {
        act(() => {
          useOptionsScreenerStore.getState().selectContract(mockContract1);
          useOptionsScreenerStore.getState().selectContract(mockContract1);
        });

        expect(useOptionsScreenerStore.getState().selectedContracts).toHaveLength(1);
      });

      it('identifies duplicates by symbol', () => {
        const duplicateContract = { ...mockContract1 };

        act(() => {
          useOptionsScreenerStore.getState().selectContract(mockContract1);
          useOptionsScreenerStore.getState().selectContract(duplicateContract);
        });

        expect(useOptionsScreenerStore.getState().selectedContracts).toHaveLength(1);
      });
    });

    describe('deselectContract', () => {
      beforeEach(() => {
        act(() => {
          useOptionsScreenerStore.getState().selectContract(mockContract1);
          useOptionsScreenerStore.getState().selectContract(mockContract2);
        });
      });

      it('deselects contract by symbol', () => {
        act(() => {
          useOptionsScreenerStore.getState().deselectContract('SPY241220C00450000');
        });

        const selected = useOptionsScreenerStore.getState().selectedContracts;
        expect(selected).toHaveLength(1);
        expect(selected[0].symbol).toBe('SPY241220P00450000');
      });

      it('handles non-existent symbol gracefully', () => {
        const originalSelected = useOptionsScreenerStore.getState().selectedContracts;

        act(() => {
          useOptionsScreenerStore.getState().deselectContract('NONEXISTENT');
        });

        expect(useOptionsScreenerStore.getState().selectedContracts).toEqual(originalSelected);
      });

      it('can deselect all contracts individually', () => {
        act(() => {
          useOptionsScreenerStore.getState().deselectContract('SPY241220C00450000');
          useOptionsScreenerStore.getState().deselectContract('SPY241220P00450000');
        });

        expect(useOptionsScreenerStore.getState().selectedContracts).toEqual([]);
      });
    });

    describe('clearSelection', () => {
      it('clears all selected contracts', () => {
        act(() => {
          useOptionsScreenerStore.getState().selectContract(mockContract1);
          useOptionsScreenerStore.getState().selectContract(mockContract2);

          useOptionsScreenerStore.getState().clearSelection();
        });

        expect(useOptionsScreenerStore.getState().selectedContracts).toEqual([]);
      });

      it('handles empty selection gracefully', () => {
        act(() => {
          useOptionsScreenerStore.getState().clearSelection();
        });

        expect(useOptionsScreenerStore.getState().selectedContracts).toEqual([]);
      });

      it('preserves results when clearing selection', () => {
        const mockResults = [mockContract1, mockContract2];

        act(() => {
          useOptionsScreenerStore.setState({ results: mockResults });
          useOptionsScreenerStore.getState().clearSelection();
        });

        expect(useOptionsScreenerStore.getState().results).toEqual(mockResults);
      });
    });
  });

  describe('Complex Workflows', () => {
    it('handles complete screening workflow', async () => {
      const mockResults = [
        {
          symbol: 'AAPL250117C00180000',
          underlying_symbol: 'AAPL',
          option_type: 'call',
          strike_price: 180,
          expiration_date: '2025-01-17',
          days_to_expiration: 33,
          bid: 4.40,
          ask: 4.60,
          last_price: 4.50,
          volume: 2000,
          open_interest: 8000,
          delta: 0.60,
          gamma: 0.03,
          theta: -0.06,
          vega: 0.20,
          implied_volatility: 0.30,
          bid_ask_spread: 0.20,
          bid_ask_spread_pct: 4.4,
          moneyness: 'otm',
          underlying_price: 175,
        },
      ] as OptionContract[];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contracts: mockResults, total_count: 1 }),
      });

      // Set up filters
      act(() => {
        useOptionsScreenerStore.getState().setUnderlyingSymbols(['AAPL']);
        useOptionsScreenerStore.getState().setOptionTypes(['call']);
        useOptionsScreenerStore.getState().setDteRange(30, 60);
        useOptionsScreenerStore.getState().setMinVolume(1000);
        useOptionsScreenerStore.getState().setDeltaRange(0.50, 0.70);
      });

      // Run screen
      await act(async () => {
        await useOptionsScreenerStore.getState().runScreen();
      });

      // Select result
      act(() => {
        useOptionsScreenerStore.getState().selectContract(mockResults[0]);
      });

      const state = useOptionsScreenerStore.getState();
      expect(state.results).toEqual(mockResults);
      expect(state.selectedContracts).toHaveLength(1);
      expect(state.hasRun).toBe(true);
      expect(state.error).toBeNull();
    });

    it('handles screen, modify filters, and re-screen', async () => {
      const firstResults = [{ symbol: 'RESULT1' }] as any;
      const secondResults = [{ symbol: 'RESULT2' }] as any;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ contracts: firstResults, total_count: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ contracts: secondResults, total_count: 1 }),
        });

      // First screen
      await act(async () => {
        await useOptionsScreenerStore.getState().runScreen();
      });

      expect(useOptionsScreenerStore.getState().results).toEqual(firstResults);

      // Modify filters
      act(() => {
        useOptionsScreenerStore.getState().setMinVolume(500);
      });

      // Second screen
      await act(async () => {
        await useOptionsScreenerStore.getState().runScreen();
      });

      expect(useOptionsScreenerStore.getState().results).toEqual(secondResults);
    });

    it('preserves selection through filter changes', () => {
      const mockContract = { symbol: 'TEST' } as any;

      act(() => {
        useOptionsScreenerStore.getState().selectContract(mockContract);
        useOptionsScreenerStore.getState().setMinVolume(500);
        useOptionsScreenerStore.getState().setDteRange(30, 60);
      });

      expect(useOptionsScreenerStore.getState().selectedContracts).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles extremely large result sets', async () => {
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        symbol: `CONTRACT${i}`,
        underlying_symbol: 'SPY',
        option_type: 'call',
        strike_price: 450 + i,
        expiration_date: '2024-12-20',
        days_to_expiration: 30,
        bid: 5.40,
        ask: 5.60,
        last_price: 5.50,
        volume: 1000,
        open_interest: 5000,
        delta: 0.55,
        gamma: 0.02,
        theta: -0.05,
        vega: 0.15,
        implied_volatility: 0.25,
        bid_ask_spread: 0.20,
        bid_ask_spread_pct: 3.6,
        moneyness: 'atm',
        underlying_price: 450,
      })) as OptionContract[];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contracts: largeResults, total_count: 1000 }),
      });

      await act(async () => {
        await useOptionsScreenerStore.getState().runScreen();
      });

      expect(useOptionsScreenerStore.getState().results).toHaveLength(1000);
      expect(useOptionsScreenerStore.getState().totalCount).toBe(1000);
    });

    it('handles API timeout gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await act(async () => {
        await useOptionsScreenerStore.getState().runScreen();
      });

      expect(useOptionsScreenerStore.getState().error).toBe('Request timeout');
      expect(useOptionsScreenerStore.getState().isLoading).toBe(false);
    });

    it('maintains state consistency after error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      await act(async () => {
        await useOptionsScreenerStore.getState().runScreen();
      });

      const state = useOptionsScreenerStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Test error');
      expect(state.results).toEqual([]);
    });
  });
});
