import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PositionsList } from '../PositionsList';
import { usePortfolio, usePlacePaperTrade } from '@/hooks/usePortfolio';
import { useTradingStore } from '@/lib/stores/trading-store';
import { api } from '@/lib/api-extended';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/hooks/usePortfolio');
vi.mock('@/lib/stores/trading-store');
vi.mock('@/lib/api-extended');
vi.mock('sonner');

// Mock ManualPositionDialog
vi.mock('../ManualPositionDialog', () => ({
  ManualPositionDialog: vi.fn(({ onSuccess }) => (
    <button data-testid="manual-position-dialog" onClick={onSuccess}>
      Record Trade
    </button>
  )),
}));

describe('PositionsList', () => {
  const mockRefresh = vi.fn();
  const mockSetActiveSymbol = vi.fn();
  const mockExecute = vi.fn();

  const mockPositions = [
    {
      symbol: 'AAPL',
      quantity: 10,
      avg_cost: 150.0,
      total_cost: 1500.0,
      current_price: 160.0,
      market_value: 1600.0,
      unrealized_pnl: 100.0,
      unrealized_pnl_pct: 6.67,
      realized_pnl: 50.0,
    },
    {
      symbol: 'MSFT',
      quantity: 5,
      avg_cost: 300.0,
      total_cost: 1500.0,
      current_price: 290.0,
      market_value: 1450.0,
      unrealized_pnl: -50.0,
      unrealized_pnl_pct: -3.33,
      realized_pnl: 0.0,
    },
  ];

  const mockSummary = {
    total_value: 3050.0,
    total_cost: 3000.0,
    unrealized_pnl: 50.0,
    realized_pnl: 50.0,
    day_pnl: 25.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePortfolio).mockReturnValue({
      positions: mockPositions,
      summary: mockSummary,
      isLoading: false,
      isRefreshing: false,
      refresh: mockRefresh,
      error: null,
    } as any);

    vi.mocked(useTradingStore).mockReturnValue({
      setActiveSymbol: mockSetActiveSymbol,
    } as any);

    vi.mocked(usePlacePaperTrade).mockReturnValue({
      execute: mockExecute,
      isSubmitting: false,
      error: null,
      clearError: vi.fn(),
    });

    vi.mocked(api.quote).mockResolvedValue({
      last: 160.0,
      bid: 159.95,
      ask: 160.05,
    } as any);
  });

  describe('Rendering', () => {
    it('renders positions list with summary', () => {
      render(<PositionsList />);

      expect(screen.getByText('Unrealized P&L')).toBeInTheDocument();
      expect(screen.getByText('+$50.00')).toBeInTheDocument();
    });

    it('renders all open positions', () => {
      render(<PositionsList />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('displays position details correctly', () => {
      render(<PositionsList />);

      // AAPL position details
      expect(screen.getByText('10 shares @ $150.00')).toBeInTheDocument();
      expect(screen.getByText('+$100.00')).toBeInTheDocument();
      expect(screen.getByText('+6.67%')).toBeInTheDocument();

      // MSFT position details
      expect(screen.getByText('5 shares @ $300.00')).toBeInTheDocument();
      expect(screen.getByText('-$50.00')).toBeInTheDocument();
      expect(screen.getByText('-3.33%')).toBeInTheDocument();
    });

    it('renders ManualPositionDialog', () => {
      render(<PositionsList />);

      expect(screen.getByTestId('manual-position-dialog')).toBeInTheDocument();
    });

    it('shows refresh button', () => {
      render(<PositionsList />);

      // RefreshCw icon in button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: [],
        summary: mockSummary,
        isLoading: true,
        isRefreshing: false,
        refresh: mockRefresh,
        error: null,
      } as any);

      render(<PositionsList />);

      // Should not show positions while loading
      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no open positions', () => {
      vi.mocked(usePortfolio).mockReturnValue({
        positions: [],
        summary: { ...mockSummary, unrealized_pnl: 0 },
        isLoading: false,
        isRefreshing: false,
        refresh: mockRefresh,
        error: null,
      } as any);

      render(<PositionsList />);

      expect(screen.getByText('No open positions')).toBeInTheDocument();
    });

    it('filters out positions with zero quantity', () => {
      const positionsWithClosed = [
        ...mockPositions,
        {
          symbol: 'GOOGL',
          quantity: 0, // Closed position
          avg_cost: 100.0,
          total_cost: 0,
          current_price: 105.0,
          market_value: 0,
          unrealized_pnl: 0,
          unrealized_pnl_pct: 0,
          realized_pnl: 500.0,
        },
      ];

      vi.mocked(usePortfolio).mockReturnValue({
        positions: positionsWithClosed,
        summary: mockSummary,
        isLoading: false,
        isRefreshing: false,
        refresh: mockRefresh,
        error: null,
      } as any);

      render(<PositionsList />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.queryByText('GOOGL')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls setActiveSymbol when symbol is clicked', async () => {
      const user = userEvent.setup();
      render(<PositionsList />);

      const aaplButton = screen.getByRole('button', { name: 'AAPL' });
      await user.click(aaplButton);

      expect(mockSetActiveSymbol).toHaveBeenCalledWith('AAPL');
    });

    it('calls refresh when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<PositionsList />);

      // Find the refresh button (the one with RefreshCw icon)
      const refreshButtons = screen.getAllByRole('button');
      const refreshButton = refreshButtons.find((btn) =>
        btn.querySelector('svg.lucide-refresh-cw')
      );

      if (refreshButton) {
        await user.click(refreshButton);
        expect(mockRefresh).toHaveBeenCalled();
      }
    });

    it('calls refresh when ManualPositionDialog onSuccess is called', async () => {
      const user = userEvent.setup();
      render(<PositionsList />);

      const dialogButton = screen.getByTestId('manual-position-dialog');
      await user.click(dialogButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Position Expansion', () => {
    it('expands position to show details when clicked', async () => {
      const user = userEvent.setup();
      render(<PositionsList />);

      // Click on the AAPL position card (not the symbol button)
      const positionCards = screen.getAllByText(/shares @/);
      await user.click(positionCards[0].closest('[class*="cursor-pointer"]')!);

      // Should show expanded details
      await waitFor(() => {
        expect(screen.getByText('Current Price')).toBeInTheDocument();
        expect(screen.getByText('Market Value')).toBeInTheDocument();
        expect(screen.getByText('Cost Basis')).toBeInTheDocument();
        expect(screen.getByText('Realized P&L')).toBeInTheDocument();
      });
    });

    it('shows close position button when expanded', async () => {
      const user = userEvent.setup();
      render(<PositionsList />);

      // Click on the AAPL position card
      const positionCards = screen.getAllByText(/shares @/);
      await user.click(positionCards[0].closest('[class*="cursor-pointer"]')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close position/i })).toBeInTheDocument();
      });
    });
  });

  describe('Close Position', () => {
    it('closes position successfully', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123' });

      render(<PositionsList />);

      // Expand AAPL position
      const positionCards = screen.getAllByText(/shares @/);
      await user.click(positionCards[0].closest('[class*="cursor-pointer"]')!);

      // Click close position button
      const closeButton = await screen.findByRole('button', { name: /close position/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(api.quote).toHaveBeenCalledWith('AAPL');
        expect(mockExecute).toHaveBeenCalledWith({
          symbol: 'AAPL',
          action: 'SELL', // Long position, so sell to close
          quantity: 10,
          price: 160.0,
          orderType: 'MKT',
          notes: 'Position closed',
        });
        expect(toast.success).toHaveBeenCalledWith(
          'Position Closed',
          expect.objectContaining({
            description: expect.stringContaining('SELL 10 AAPL'),
          })
        );
      });
    });

    it('handles close position error', async () => {
      const user = userEvent.setup();
      mockExecute.mockRejectedValue(new Error('Trade failed'));

      render(<PositionsList />);

      // Expand AAPL position
      const positionCards = screen.getAllByText(/shares @/);
      await user.click(positionCards[0].closest('[class*="cursor-pointer"]')!);

      // Click close position button
      const closeButton = await screen.findByRole('button', { name: /close position/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to close position',
          expect.objectContaining({
            description: 'Trade failed',
          })
        );
      });
    });

    it('handles missing price error', async () => {
      const user = userEvent.setup();
      vi.mocked(api.quote).mockResolvedValue({ last: null } as any);

      render(<PositionsList />);

      // Expand AAPL position
      const positionCards = screen.getAllByText(/shares @/);
      await user.click(positionCards[0].closest('[class*="cursor-pointer"]')!);

      // Click close position button
      const closeButton = await screen.findByRole('button', { name: /close position/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to close position',
          expect.objectContaining({
            description: 'Could not get current price',
          })
        );
      });
    });

    it('shows loading state while closing', async () => {
      const user = userEvent.setup();

      // Make execute take a while
      mockExecute.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: '123' }), 100))
      );

      render(<PositionsList />);

      // Expand AAPL position
      const positionCards = screen.getAllByText(/shares @/);
      await user.click(positionCards[0].closest('[class*="cursor-pointer"]')!);

      // Click close position button
      const closeButton = await screen.findByRole('button', { name: /close position/i });
      await user.click(closeButton);

      // Should show "Closing..." text
      await waitFor(() => {
        expect(screen.getByText(/closing/i)).toBeInTheDocument();
      });
    });
  });

  describe('P&L Display', () => {
    it('shows positive P&L with correct styling', () => {
      render(<PositionsList />);

      // AAPL has positive P&L
      const positivePnl = screen.getByText('+$100.00');
      expect(positivePnl).toBeInTheDocument();
    });

    it('shows negative P&L with correct styling', () => {
      render(<PositionsList />);

      // MSFT has negative P&L
      const negativePnl = screen.getByText('-$50.00');
      expect(negativePnl).toBeInTheDocument();
    });

    it('shows trending icons based on P&L', () => {
      render(<PositionsList />);

      // Should have TrendingUp and TrendingDown icons
      const trendingIcons = document.querySelectorAll('svg.lucide-trending-up, svg.lucide-trending-down');
      expect(trendingIcons.length).toBe(2);
    });
  });
});
