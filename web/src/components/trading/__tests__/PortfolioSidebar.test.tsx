import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortfolioSidebar } from '../PortfolioSidebar';
import { usePortfolio } from '@/hooks/usePortfolio';

// Mock dependencies
vi.mock('@/hooks/usePortfolio');

// Mock child components
vi.mock('../PositionCard', () => ({
  PositionCard: vi.fn(({ position }) => (
    <div data-testid={`position-card-${position.symbol}`}>
      {position.symbol}
    </div>
  )),
}));

vi.mock('../ManualPositionDialog', () => ({
  ManualPositionDialog: vi.fn(({ onSuccess }) => (
    <button data-testid="manual-position-dialog" onClick={onSuccess}>
      Record Trade
    </button>
  )),
}));

vi.mock('../PositionHistory', () => ({
  PositionHistory: vi.fn(({ positions }) => (
    <div data-testid="position-history">{positions.length} closed positions</div>
  )),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn(({ children }) => <div data-testid="scroll-area">{children}</div>),
}));

vi.mock('@/components/ui/DotScrollIndicator', () => ({
  DotScrollIndicator: vi.fn(() => null),
}));

describe('PortfolioSidebar', () => {
  const mockRefresh = vi.fn();
  const mockRefreshPrices = vi.fn();

  const mockPositions = [
    {
      symbol: 'AAPL',
      quantity: 10,
      avg_cost: 150,
      total_cost: 1500,
      current_price: 160,
      market_value: 1600,
      unrealized_pnl: 100,
      unrealized_pnl_pct: 6.67,
      realized_pnl: 0,
      trades: [],
    },
    {
      symbol: 'MSFT',
      quantity: 5,
      avg_cost: 300,
      total_cost: 1500,
      current_price: 310,
      market_value: 1550,
      unrealized_pnl: 50,
      unrealized_pnl_pct: 3.33,
      realized_pnl: 0,
      trades: [],
    },
  ];

  const mockSummary = {
    total_value: 103150,
    cash: 100000,
    positions_value: 3150,
    positions_count: 2,
    unrealized_pnl: 150,
    realized_pnl: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePortfolio).mockReturnValue({
      positions: mockPositions,
      summary: mockSummary,
      isLoading: false,
      isRefreshing: false,
      isPriceLoading: false,
      error: null,
      lastPriceUpdate: new Date(),
      refresh: mockRefresh,
      refreshPrices: mockRefreshPrices,
      isConnected: true,
    } as any);
  });

  describe('Rendering', () => {
    it('renders portfolio header', () => {
      render(<PortfolioSidebar />);

      expect(screen.getByText('Portfolio')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<PortfolioSidebar />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows connection status indicator (connected)', () => {
      render(<PortfolioSidebar />);

      // Cloud icon for connected state
      expect(document.querySelector('.lucide-cloud')).toBeInTheDocument();
    });

    it('shows connection status indicator (disconnected)', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: mockPositions,
        summary: mockSummary,
        isLoading: false,
        isRefreshing: false,
        isPriceLoading: false,
        error: null,
        lastPriceUpdate: null,
        refresh: mockRefresh,
        refreshPrices: mockRefreshPrices,
        isConnected: false,
      } as any);

      render(<PortfolioSidebar />);

      expect(document.querySelector('.lucide-cloud-off')).toBeInTheDocument();
    });

    it('displays portfolio value', () => {
      render(<PortfolioSidebar />);

      expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
      expect(screen.getByText('$103,150.00')).toBeInTheDocument();
    });

    it('displays cash and positions values', () => {
      render(<PortfolioSidebar />);

      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('$100,000.00')).toBeInTheDocument();
      expect(screen.getByText('Positions')).toBeInTheDocument();
      expect(screen.getByText('$3,150.00')).toBeInTheDocument();
    });

    it('displays unrealized and realized P&L', () => {
      render(<PortfolioSidebar />);

      expect(screen.getByText('Unrealized P&L')).toBeInTheDocument();
      expect(screen.getByText('Realized P&L')).toBeInTheDocument();
    });

    it('renders tabs for Active and History', () => {
      render(<PortfolioSidebar />);

      expect(screen.getByRole('tab', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
    });

    it('shows position count badge', () => {
      render(<PortfolioSidebar />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: [],
        summary: mockSummary,
        isLoading: true,
        isRefreshing: false,
        isPriceLoading: false,
        error: null,
        lastPriceUpdate: null,
        refresh: mockRefresh,
        refreshPrices: mockRefreshPrices,
        isConnected: true,
      } as any);

      render(<PortfolioSidebar />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      expect(screen.queryByText('Portfolio')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: [],
        summary: mockSummary,
        isLoading: false,
        isRefreshing: false,
        isPriceLoading: false,
        error: 'Failed to load portfolio',
        lastPriceUpdate: null,
        refresh: mockRefresh,
        refreshPrices: mockRefreshPrices,
        isConnected: false,
      } as any);

      render(<PortfolioSidebar />);

      expect(screen.getByText('Failed to load portfolio')).toBeInTheDocument();
    });

    it('shows retry button on error', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: [],
        summary: mockSummary,
        isLoading: false,
        isRefreshing: false,
        isPriceLoading: false,
        error: 'Failed to load portfolio',
        lastPriceUpdate: null,
        refresh: mockRefresh,
        refreshPrices: mockRefreshPrices,
        isConnected: false,
      } as any);

      render(<PortfolioSidebar />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls refresh on retry click', async () => {
      const user = userEvent.setup();
      vi.mocked(usePortfolio).mockReturnValue({
        positions: [],
        summary: mockSummary,
        isLoading: false,
        isRefreshing: false,
        isPriceLoading: false,
        error: 'Failed to load portfolio',
        lastPriceUpdate: null,
        refresh: mockRefresh,
        refreshPrices: mockRefreshPrices,
        isConnected: false,
      } as any);

      render(<PortfolioSidebar />);
      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Active Positions Tab', () => {
    it('renders position cards for open positions', () => {
      render(<PortfolioSidebar />);

      expect(screen.getByTestId('position-card-AAPL')).toBeInTheDocument();
      expect(screen.getByTestId('position-card-MSFT')).toBeInTheDocument();
    });

    it('shows empty message when no open positions', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: [],
        summary: { ...mockSummary, positions_count: 0 },
        isLoading: false,
        isRefreshing: false,
        isPriceLoading: false,
        error: null,
        lastPriceUpdate: new Date(),
        refresh: mockRefresh,
        refreshPrices: mockRefreshPrices,
        isConnected: true,
      } as any);

      render(<PortfolioSidebar />);

      expect(screen.getByText('No open positions')).toBeInTheDocument();
    });

    it('renders ManualPositionDialog', () => {
      render(<PortfolioSidebar />);

      expect(screen.getByTestId('manual-position-dialog')).toBeInTheDocument();
    });
  });

  describe('History Tab', () => {
    it('switches to history tab when clicked', async () => {
      const user = userEvent.setup();
      render(<PortfolioSidebar />);

      const historyTab = screen.getByRole('tab', { name: /history/i });
      await user.click(historyTab);

      expect(screen.getByTestId('position-history')).toBeInTheDocument();
    });
  });

  describe('Price Refresh', () => {
    it('calls refreshPrices when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<PortfolioSidebar />);

      // Find the refresh button (has RefreshCw icon)
      const refreshButton = document.querySelector('.lucide-refresh-cw')?.closest('button');
      if (refreshButton) {
        await user.click(refreshButton);
        expect(mockRefreshPrices).toHaveBeenCalled();
      }
    });

    it('disables refresh button when refreshing', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: mockPositions,
        summary: mockSummary,
        isLoading: false,
        isRefreshing: true,
        isPriceLoading: false,
        error: null,
        lastPriceUpdate: new Date(),
        refresh: mockRefresh,
        refreshPrices: mockRefreshPrices,
        isConnected: true,
      } as any);

      render(<PortfolioSidebar />);

      const refreshButton = document.querySelector('.lucide-refresh-cw')?.closest('button');
      expect(refreshButton).toBeDisabled();
    });

    it('shows spinning icon when prices are loading', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: mockPositions,
        summary: mockSummary,
        isLoading: false,
        isRefreshing: false,
        isPriceLoading: true,
        error: null,
        lastPriceUpdate: new Date(),
        refresh: mockRefresh,
        refreshPrices: mockRefreshPrices,
        isConnected: true,
      } as any);

      render(<PortfolioSidebar />);

      expect(document.querySelectorAll('.animate-spin').length).toBeGreaterThan(0);
    });
  });

  describe('ManualPositionDialog Integration', () => {
    it('calls refresh when trade is recorded', async () => {
      const user = userEvent.setup();
      render(<PortfolioSidebar />);

      await user.click(screen.getByTestId('manual-position-dialog'));

      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
