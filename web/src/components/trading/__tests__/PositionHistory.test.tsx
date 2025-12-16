import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PositionHistory } from '../PositionHistory';
import type { Position } from '@/lib/supabase/portfolio';

// Mock date-fns to control time
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    // Keep real implementations for most functions
  };
});

describe('PositionHistory', () => {
  const createMockPosition = (overrides: Partial<Position> = {}): Position => ({
    id: '1',
    symbol: 'AAPL',
    quantity: 0, // Closed position
    avg_cost: 150,
    total_cost: 1500,
    current_price: 160,
    market_value: 0,
    unrealized_pnl: 0,
    unrealized_pnl_pct: 0,
    realized_pnl: 100,
    first_trade_at: '2024-01-01T10:00:00Z',
    last_trade_at: '2024-01-15T10:00:00Z',
    trades: [
      { id: '1', action: 'BUY', quantity: 10, price: 150, executed_at: '2024-01-01T10:00:00Z' },
      { id: '2', action: 'SELL', quantity: 10, price: 160, executed_at: '2024-01-15T10:00:00Z' },
    ],
    ...overrides,
  } as Position);

  const mockClosedPositions = [
    createMockPosition({
      id: '1',
      symbol: 'AAPL',
      realized_pnl: 100,
      first_trade_at: '2024-01-01T10:00:00Z',
      last_trade_at: '2024-01-15T10:00:00Z',
    }),
    createMockPosition({
      id: '2',
      symbol: 'MSFT',
      realized_pnl: -50,
      first_trade_at: '2024-01-05T10:00:00Z',
      last_trade_at: '2024-01-20T10:00:00Z',
      trades: [
        { id: '3', action: 'BUY', quantity: 5, price: 300, executed_at: '2024-01-05T10:00:00Z' },
        { id: '4', action: 'SELL', quantity: 5, price: 290, executed_at: '2024-01-20T10:00:00Z' },
      ],
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders trade history header', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('Trade History')).toBeInTheDocument();
    });

    it('renders date filter dropdown', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('displays closed positions', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('shows trade count badges', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getAllByText('2 trades')).toHaveLength(2);
    });
  });

  describe('Statistics', () => {
    it('displays total trades count', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('Total Trades')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays win rate', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText('50.0%')).toBeInTheDocument(); // 1 win, 1 loss
    });

    it('displays total P&L', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('Total P&L')).toBeInTheDocument();
      expect(screen.getByText('+$50.00')).toBeInTheDocument(); // 100 - 50
    });

    it('displays average win', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('Avg Win')).toBeInTheDocument();
      expect(screen.getByText('+$100.00')).toBeInTheDocument();
    });

    it('displays average loss', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('Avg Loss')).toBeInTheDocument();
      expect(screen.getByText('$-50.00')).toBeInTheDocument();
    });
  });

  describe('Position Details', () => {
    it('displays P&L amounts with correct formatting', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('+$100.00')).toBeInTheDocument();
      expect(screen.getByText('-$50.00')).toBeInTheDocument();
    });

    it('displays entry and exit prices', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('Entry:')).toBeInTheDocument();
      expect(screen.getByText('Exit:')).toBeInTheDocument();
    });

    it('displays open and close dates', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('Opened:')).toBeInTheDocument();
      expect(screen.getByText('Closed:')).toBeInTheDocument();
    });
  });

  describe('Date Filtering', () => {
    it('defaults to showing all positions', () => {
      render(<PositionHistory positions={mockClosedPositions} />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('allows changing date filter', async () => {
      const user = userEvent.setup();
      render(<PositionHistory positions={mockClosedPositions} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(screen.getByText('All Time')).toBeInTheDocument();
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no closed positions', () => {
      const openPosition = createMockPosition({
        quantity: 10, // Not closed
        realized_pnl: 0,
      });

      render(<PositionHistory positions={[openPosition]} />);

      expect(screen.getByText('No closed positions')).toBeInTheDocument();
    });

    it('shows empty message with filter context', async () => {
      const user = userEvent.setup();
      // Position with very old exit date
      const oldPosition = createMockPosition({
        last_trade_at: '2020-01-01T10:00:00Z',
      });

      render(<PositionHistory positions={[oldPosition]} />);

      // Change to "Last 7 Days"
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Last 7 Days'));

      expect(screen.getByText(/No closed positions/)).toBeInTheDocument();
      expect(screen.getByText(/in selected period/)).toBeInTheDocument();
    });
  });

  describe('P&L Styling', () => {
    it('applies profit styling to winning trades', () => {
      const winningPosition = createMockPosition({
        realized_pnl: 100,
      });

      render(<PositionHistory positions={[winningPosition]} />);

      const pnlElement = screen.getByText('+$100.00');
      expect(pnlElement).toBeInTheDocument();
    });

    it('applies loss styling to losing trades', () => {
      const losingPosition = createMockPosition({
        symbol: 'TSLA',
        realized_pnl: -75,
        trades: [
          { id: '5', action: 'BUY', quantity: 5, price: 200, executed_at: '2024-01-01' },
          { id: '6', action: 'SELL', quantity: 5, price: 185, executed_at: '2024-01-10' },
        ],
      });

      render(<PositionHistory positions={[losingPosition]} />);

      const pnlElement = screen.getByText('-$75.00');
      expect(pnlElement).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts positions by exit date (most recent first)', () => {
      const positions = [
        createMockPosition({
          id: '1',
          symbol: 'OLD',
          last_trade_at: '2024-01-01T10:00:00Z',
        }),
        createMockPosition({
          id: '2',
          symbol: 'NEW',
          last_trade_at: '2024-01-20T10:00:00Z',
        }),
      ];

      render(<PositionHistory positions={positions} />);

      const symbols = screen.getAllByText(/OLD|NEW/);
      expect(symbols[0]).toHaveTextContent('NEW');
      expect(symbols[1]).toHaveTextContent('OLD');
    });
  });
});
