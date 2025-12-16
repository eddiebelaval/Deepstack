import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScreenerPanel } from '../ScreenerPanel';
import { useScreenerStore } from '@/lib/stores/screener-store';
import { useTradingStore } from '@/lib/stores/trading-store';

// Mock stores
vi.mock('@/lib/stores/screener-store');
vi.mock('@/lib/stores/trading-store');

// Mock UI components
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn(({ children }) => <div data-testid="scroll-area">{children}</div>),
}));

describe('ScreenerPanel', () => {
  const mockSetFilter = vi.fn();
  const mockResetFilters = vi.fn();
  const mockRunScreener = vi.fn();
  const mockSetActiveSymbol = vi.fn();

  const mockFilters = {
    priceMin: undefined,
    priceMax: undefined,
    volumeMin: undefined,
    sector: undefined,
    sortBy: 'volume',
    sortOrder: 'desc' as const,
  };

  const mockResults = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 185.50,
      changePercent: 2.5,
      volume: 75000000,
      marketCap: 2900000000000,
      sector: 'Technology',
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      price: 420.30,
      changePercent: -1.2,
      volume: 25000000,
      marketCap: 3100000000000,
      sector: 'Technology',
    },
    {
      symbol: 'JPM',
      name: 'JPMorgan Chase',
      price: 195.20,
      changePercent: 0.8,
      volume: 12000000,
      marketCap: 550000000000,
      sector: 'Financials',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useScreenerStore).mockReturnValue({
      filters: mockFilters,
      results: mockResults,
      isLoading: false,
      error: null,
      setFilter: mockSetFilter,
      resetFilters: mockResetFilters,
      runScreener: mockRunScreener,
    } as any);

    vi.mocked(useTradingStore).mockReturnValue({
      setActiveSymbol: mockSetActiveSymbol,
    } as any);
  });

  describe('Rendering', () => {
    it('renders header with title', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('Stock Screener')).toBeInTheDocument();
    });

    it('renders BarChart icon', () => {
      render(<ScreenerPanel />);

      // Lucide icons may have different class naming
      const icon = document.querySelector('svg.lucide') || document.querySelector('[data-lucide]');
      expect(icon).toBeInTheDocument();
    });

    it('renders Reset and Screen buttons', () => {
      render(<ScreenerPanel />);

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /screen/i })).toBeInTheDocument();
    });

    it('renders filter section', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders filter inputs', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('Min Price')).toBeInTheDocument();
      expect(screen.getByText('Max Price')).toBeInTheDocument();
      expect(screen.getByText('Min Volume')).toBeInTheDocument();
      expect(screen.getByText('Sector')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
      expect(screen.getByText('Order')).toBeInTheDocument();
    });

    it('displays results count', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('3 results')).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    it('renders stock rows', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('JPM')).toBeInTheDocument();
    });

    it('displays company names', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corp.')).toBeInTheDocument();
    });

    it('displays stock prices', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('$185.50')).toBeInTheDocument();
      expect(screen.getByText('$420.30')).toBeInTheDocument();
    });

    it('displays sector badges', () => {
      render(<ScreenerPanel />);

      expect(screen.getAllByText('Technology').length).toBe(2);
      expect(screen.getByText('Financials')).toBeInTheDocument();
    });

    it('shows positive change with TrendingUp icon', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('+2.50%')).toBeInTheDocument();
      expect(document.querySelectorAll('.lucide-trending-up').length).toBeGreaterThan(0);
    });

    it('shows negative change with TrendingDown icon', () => {
      render(<ScreenerPanel />);

      expect(screen.getByText('-1.20%')).toBeInTheDocument();
      expect(document.querySelector('.lucide-trending-down')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      vi.mocked(useScreenerStore).mockReturnValue({
        filters: mockFilters,
        results: [],
        isLoading: true,
        error: null,
        setFilter: mockSetFilter,
        resetFilters: mockResetFilters,
        runScreener: mockRunScreener,
      } as any);

      render(<ScreenerPanel />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables Screen button when loading', () => {
      vi.mocked(useScreenerStore).mockReturnValue({
        filters: mockFilters,
        results: [],
        isLoading: true,
        error: null,
        setFilter: mockSetFilter,
        resetFilters: mockResetFilters,
        runScreener: mockRunScreener,
      } as any);

      render(<ScreenerPanel />);

      expect(screen.getByRole('button', { name: /screen/i })).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      vi.mocked(useScreenerStore).mockReturnValue({
        filters: mockFilters,
        results: [],
        isLoading: false,
        error: 'Failed to load stocks',
        setFilter: mockSetFilter,
        resetFilters: mockResetFilters,
        runScreener: mockRunScreener,
      } as any);

      render(<ScreenerPanel />);

      expect(screen.getByText('Failed to load stocks')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no results', () => {
      vi.mocked(useScreenerStore).mockReturnValue({
        filters: mockFilters,
        results: [],
        isLoading: false,
        error: null,
        setFilter: mockSetFilter,
        resetFilters: mockResetFilters,
        runScreener: mockRunScreener,
      } as any);

      render(<ScreenerPanel />);

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Adjust filters and run screener')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls runScreener on Screen button click', async () => {
      const user = userEvent.setup();
      render(<ScreenerPanel />);

      await user.click(screen.getByRole('button', { name: /screen/i }));

      expect(mockRunScreener).toHaveBeenCalled();
    });

    it('calls resetFilters on Reset button click', async () => {
      const user = userEvent.setup();
      render(<ScreenerPanel />);

      await user.click(screen.getByRole('button', { name: /reset/i }));

      expect(mockResetFilters).toHaveBeenCalled();
    });

    it('calls setActiveSymbol when clicking a stock row', async () => {
      const user = userEvent.setup();
      render(<ScreenerPanel />);

      await user.click(screen.getByText('AAPL'));

      expect(mockSetActiveSymbol).toHaveBeenCalledWith('AAPL');
    });

    it('calls setFilter when changing price inputs', async () => {
      const user = userEvent.setup();
      render(<ScreenerPanel />);

      // Get number inputs by type
      const numberInputs = document.querySelectorAll('input[type="number"]');
      expect(numberInputs.length).toBeGreaterThan(0);

      // Type in first number input (price min)
      await user.type(numberInputs[0], '5');

      expect(mockSetFilter).toHaveBeenCalledWith('priceMin', 5);
    });
  });

  describe('Initial Load', () => {
    it('runs screener on mount when no results', () => {
      vi.mocked(useScreenerStore).mockReturnValue({
        filters: mockFilters,
        results: [],
        isLoading: false,
        error: null,
        setFilter: mockSetFilter,
        resetFilters: mockResetFilters,
        runScreener: mockRunScreener,
      } as any);

      render(<ScreenerPanel />);

      expect(mockRunScreener).toHaveBeenCalled();
    });

    it('does not run screener on mount when results exist', () => {
      render(<ScreenerPanel />);

      // mockRunScreener should NOT be called because results already exist
      expect(mockRunScreener).not.toHaveBeenCalled();
    });
  });

  describe('Market Cap Formatting', () => {
    it('formats trillion market cap correctly', () => {
      render(<ScreenerPanel />);

      // MSFT with $3.1T market cap
      expect(screen.getByText('Cap: $3.1T')).toBeInTheDocument();
    });

    it('formats billion market cap correctly', () => {
      render(<ScreenerPanel />);

      // JPM with $550B market cap
      expect(screen.getByText('Cap: $550.0B')).toBeInTheDocument();
    });
  });

  describe('Volume Formatting', () => {
    it('formats million volume correctly', () => {
      render(<ScreenerPanel />);

      // AAPL with 75M volume
      expect(screen.getByText('Vol: 75.0M')).toBeInTheDocument();
    });
  });
});
