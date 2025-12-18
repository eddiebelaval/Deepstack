import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionsScreenerPanel } from '../OptionsScreenerPanel';
import { useOptionsScreenerStore } from '@/lib/stores/options-screener-store';
import { useOptionsStrategyStore } from '@/lib/stores/options-strategy-store';
import { type OptionContract } from '@/lib/types/options';

// Mock stores
vi.mock('@/lib/stores/options-screener-store');
vi.mock('@/lib/stores/options-strategy-store');

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

const mockContract: OptionContract = {
  symbol: 'SPY241220C00450000',
  underlying_symbol: 'SPY',
  option_type: 'call',
  strike_price: 450,
  expiration_date: '2024-12-20',
  days_to_expiration: 30,
  bid: 2.50,
  ask: 2.55,
  last_price: 2.52,
  volume: 15000,
  open_interest: 50000,
  implied_volatility: 0.18,
  delta: 0.55,
  gamma: 0.05,
  theta: -0.03,
  vega: 0.12,
  bid_ask_spread: 0.05,
  bid_ask_spread_pct: 1.96,
  moneyness: 'atm',
  underlying_price: 450.25,
};

describe('OptionsScreenerPanel', () => {
  const mockAddSymbol = vi.fn();
  const mockRemoveSymbol = vi.fn();
  const mockRunScreen = vi.fn();
  const mockClearSelection = vi.fn();
  const mockAddLegFromContract = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useOptionsScreenerStore as any).mockReturnValue({
      filters: {
        underlying_symbols: ['SPY'],
        option_types: undefined,
        min_dte: 7,
        max_dte: 60,
        min_volume: 1000,
        min_open_interest: 1000,
        min_delta: undefined,
        max_delta: undefined,
        min_iv: undefined,
        max_iv: undefined,
        max_bid_ask_spread_pct: undefined,
        moneyness: undefined,
        sort_by: 'volume',
      },
      results: [],
      totalCount: 0,
      isLoading: false,
      hasRun: false,
      error: null,
      selectedContracts: [],
      addSymbol: mockAddSymbol,
      removeSymbol: mockRemoveSymbol,
      setOptionTypes: vi.fn(),
      setDteRange: vi.fn(),
      setMinVolume: vi.fn(),
      setMinOpenInterest: vi.fn(),
      setDeltaRange: vi.fn(),
      setIvRange: vi.fn(),
      setMaxBidAskSpread: vi.fn(),
      setMoneyness: vi.fn(),
      setSortBy: vi.fn(),
      runScreen: mockRunScreen,
      clearSelection: mockClearSelection,
    });

    (useOptionsStrategyStore as any).mockReturnValue({
      addLegFromContract: mockAddLegFromContract,
    });
  });

  describe('rendering', () => {
    it('renders title and description', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Options Screener')).toBeInTheDocument();
      expect(screen.getByText(/Screen options by volume, Greeks, IV/)).toBeInTheDocument();
    });

    it('renders Run Screen button', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Run Screen')).toBeInTheDocument();
    });

    it('renders symbol input section', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByPlaceholderText(/Add symbol/)).toBeInTheDocument();
    });

    it('renders Advanced Filters button', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    });
  });

  describe('symbol management', () => {
    it('displays existing symbols', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('allows adding symbols', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      const input = screen.getByPlaceholderText(/Add symbol/);
      await user.type(input, 'AAPL');
      await user.click(screen.getByRole('button', { name: /plus/i }));

      expect(mockAddSymbol).toHaveBeenCalledWith('AAPL');
    });

    it('allows adding symbols by pressing Enter', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      const input = screen.getByPlaceholderText(/Add symbol/);
      await user.type(input, 'TSLA{Enter}');

      expect(mockAddSymbol).toHaveBeenCalledWith('TSLA');
    });

    it('converts symbols to uppercase', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      const input = screen.getByPlaceholderText(/Add symbol/) as HTMLInputElement;
      await user.type(input, 'aapl');

      expect(input.value).toBe('AAPL');
    });

    it('allows removing symbols', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      const removeButton = screen.getByRole('button', { name: /x/i });
      await user.click(removeButton);

      expect(mockRemoveSymbol).toHaveBeenCalledWith('SPY');
    });

    it('clears input after adding symbol', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      const input = screen.getByPlaceholderText(/Add symbol/) as HTMLInputElement;
      await user.type(input, 'AAPL');
      await user.click(screen.getByRole('button', { name: /plus/i }));

      expect(input.value).toBe('');
    });
  });

  describe('run screen functionality', () => {
    it('calls runScreen when button is clicked', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      await user.click(screen.getByText('Run Screen'));

      expect(mockRunScreen).toHaveBeenCalled();
    });

    it('disables Run Screen button when loading', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        isLoading: true,
        filters: { underlying_symbols: ['SPY'] },
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Screening...')).toBeDisabled();
    });

    it('disables Run Screen button when no symbols', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        filters: { underlying_symbols: [] },
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Run Screen')).toBeDisabled();
    });

    it('shows Screening... text when loading', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        isLoading: true,
        filters: { underlying_symbols: ['SPY'] },
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Screening...')).toBeInTheDocument();
    });
  });

  describe('advanced filters', () => {
    it('expands filters when Advanced Filters is clicked', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      await user.click(screen.getByText('Advanced Filters'));

      await waitFor(() => {
        expect(screen.getByLabelText(/Option Type/)).toBeInTheDocument();
      });
    });

    it('renders all filter inputs when expanded', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      await user.click(screen.getByText('Advanced Filters'));

      await waitFor(() => {
        expect(screen.getByLabelText(/Option Type/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Min DTE/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Max DTE/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Min Volume/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Min Open Interest/)).toBeInTheDocument();
      });
    });

    it('shows current filter values', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      await user.click(screen.getByText('Advanced Filters'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('7')).toBeInTheDocument();
        expect(screen.getByDisplayValue('60')).toBeInTheDocument();
        expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
      });
    });
  });

  describe('results display', () => {
    it('shows ready state when no screen has run', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Ready to Screen')).toBeInTheDocument();
    });

    it('displays result count when screen has run', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        totalCount: 42,
        results: [],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Found 42 contracts')).toBeInTheDocument();
    });

    it('renders results table with contracts', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        totalCount: 1,
        results: [mockContract],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('2024-12-20')).toBeInTheDocument();
    });

    it('displays option type badges', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        results: [mockContract],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('displays volume and open interest', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        results: [mockContract],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('15,000')).toBeInTheDocument();
      expect(screen.getByText('50,000')).toBeInTheDocument();
    });

    it('displays bid and ask prices', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        results: [mockContract],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('$2.50')).toBeInTheDocument();
      expect(screen.getByText('$2.55')).toBeInTheDocument();
    });
  });

  describe('contract actions', () => {
    beforeEach(() => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        results: [mockContract],
      });
    });

    it('renders Buy and Sell buttons for each contract', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Buy')).toBeInTheDocument();
      expect(screen.getByText('Sell')).toBeInTheDocument();
    });

    it('adds contract to strategy when Buy is clicked', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      await user.click(screen.getByText('Buy'));

      expect(mockAddLegFromContract).toHaveBeenCalledWith(mockContract, 'buy');
    });

    it('adds contract to strategy when Sell is clicked', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);

      await user.click(screen.getByText('Sell'));

      expect(mockAddLegFromContract).toHaveBeenCalledWith(mockContract, 'sell');
    });
  });

  describe('error handling', () => {
    it('displays error message when screening fails', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        error: 'Failed to fetch options data',
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Screening Failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch options data')).toBeInTheDocument();
    });

    it('shows Retry button when error occurs', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        error: 'Network error',
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('retries screening when Retry is clicked', async () => {
      const user = userEvent.setup();
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        error: 'Network error',
      });

      render(<OptionsScreenerPanel />);
      await user.click(screen.getByText('Retry'));

      expect(mockRunScreen).toHaveBeenCalled();
    });
  });

  describe('selection management', () => {
    it('shows Clear Selection button when contracts are selected', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        selectedContracts: [mockContract],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText(/Clear Selection \(1\)/)).toBeInTheDocument();
    });

    it('calls clearSelection when Clear Selection is clicked', async () => {
      const user = userEvent.setup();
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        selectedContracts: [mockContract],
      });

      render(<OptionsScreenerPanel />);
      await user.click(screen.getByText(/Clear Selection/));

      expect(mockClearSelection).toHaveBeenCalled();
    });

    it('does not show Clear Selection button when no contracts selected', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        selectedContracts: [],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.queryByText(/Clear Selection/)).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('shows ready state with instructions', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Ready to Screen')).toBeInTheDocument();
      expect(screen.getByText(/Add symbols and configure filters/)).toBeInTheDocument();
    });

    it('shows empty results when no contracts found', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        totalCount: 0,
        results: [],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('Found 0 contracts')).toBeInTheDocument();
    });
  });

  describe('Greeks display', () => {
    it('displays delta values', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        results: [mockContract],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('0.55')).toBeInTheDocument();
    });

    it('displays IV values', () => {
      (useOptionsScreenerStore as any).mockReturnValue({
        ...useOptionsScreenerStore(),
        hasRun: true,
        results: [mockContract],
      });

      render(<OptionsScreenerPanel />);
      expect(screen.getByText('18%')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper heading structure', () => {
      render(<OptionsScreenerPanel />);
      expect(screen.getByRole('heading', { level: 2, name: /Options Screener/ })).toBeInTheDocument();
    });

    it('has labeled inputs', async () => {
      const user = userEvent.setup();
      render(<OptionsScreenerPanel />);
      await user.click(screen.getByText('Advanced Filters'));

      await waitFor(() => {
        expect(screen.getByLabelText(/Min Volume/)).toBeInTheDocument();
      });
    });
  });
});
