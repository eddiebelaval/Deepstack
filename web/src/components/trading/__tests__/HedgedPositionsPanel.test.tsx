import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HedgedPositionsPanel } from '../HedgedPositionsPanel';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HedgedPositionsPanel', () => {
  const mockCreatedPosition = {
    symbol: 'GME',
    total_shares: 100,
    entry_price: 150,
    current_value: 15000,
    total_pnl: 0,
    conviction: {
      shares: 60,
      value: 9000,
      pnl: 0,
    },
    tactical: {
      shares: 40,
      value: 6000,
      pnl: 0,
      shares_sold: 0,
    },
    next_target: 300, // 2x entry
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCreatedPosition),
    });
  });

  describe('Rendering', () => {
    it('renders header with title and badge', () => {
      render(<HedgedPositionsPanel />);

      expect(screen.getByText('Hedged Position Manager')).toBeInTheDocument();
      expect(screen.getByText('Conviction + Tactical')).toBeInTheDocument();
    });

    it('renders description text', () => {
      render(<HedgedPositionsPanel />);

      expect(screen.getByText(/Moon Bag/)).toBeInTheDocument();
      expect(screen.getByText(/Income Generator/)).toBeInTheDocument();
    });

    it('renders form inputs', () => {
      render(<HedgedPositionsPanel />);

      expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/total shares/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/entry price/i)).toBeInTheDocument();
    });

    it('renders conviction/tactical slider', () => {
      render(<HedgedPositionsPanel />);

      expect(screen.getByText(/conviction 60%/i)).toBeInTheDocument();
      expect(screen.getByText(/tactical 40%/i)).toBeInTheDocument();
    });

    it('renders create strategy button', () => {
      render(<HedgedPositionsPanel />);

      expect(screen.getByRole('button', { name: /create strategy/i })).toBeInTheDocument();
    });

    it('shows empty state when no position created', () => {
      render(<HedgedPositionsPanel />);

      expect(screen.getByText(/configure a position/i)).toBeInTheDocument();
    });
  });

  describe('Form Inputs', () => {
    it('allows entering symbol', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      const symbolInput = screen.getByLabelText(/symbol/i);
      await user.type(symbolInput, 'AAPL');

      expect(symbolInput).toHaveValue('AAPL');
    });

    it('allows entering shares', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      const sharesInput = screen.getByLabelText(/total shares/i);
      await user.clear(sharesInput);
      await user.type(sharesInput, '200');

      expect(sharesInput).toHaveValue(200);
    });

    it('allows entering entry price', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      const priceInput = screen.getByLabelText(/entry price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '175.50');

      expect(priceInput).toHaveValue(175.5);
    });

    it('disables create button when symbol is empty', () => {
      render(<HedgedPositionsPanel />);

      const createButton = screen.getByRole('button', { name: /create strategy/i });
      expect(createButton).toBeDisabled();
    });

    it('enables create button when symbol is entered', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      const symbolInput = screen.getByLabelText(/symbol/i);
      await user.type(symbolInput, 'AAPL');

      const createButton = screen.getByRole('button', { name: /create strategy/i });
      expect(createButton).not.toBeDisabled();
    });
  });

  describe('Strategy Creation', () => {
    it('calls API with correct data on form submission', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      // Fill form
      await user.type(screen.getByLabelText(/symbol/i), 'gme');

      // Click create
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/positions/hedged/create',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"symbol":"GME"'),
          })
        );
      });
    });

    it('converts symbol to uppercase', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      await user.type(screen.getByLabelText(/symbol/i), 'aapl');
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"symbol":"AAPL"'),
          })
        );
      });
    });

    it('displays created position details', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      await user.type(screen.getByLabelText(/symbol/i), 'GME');
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(screen.getByText('GME Strategy')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('displays conviction pod details', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      await user.type(screen.getByLabelText(/symbol/i), 'GME');
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(screen.getByText('Conviction Pod')).toBeInTheDocument();
        expect(screen.getByText('60 shares')).toBeInTheDocument();
      });
    });

    it('displays tactical pod details', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      await user.type(screen.getByLabelText(/symbol/i), 'GME');
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(screen.getByText('Tactical Pod')).toBeInTheDocument();
        expect(screen.getByText('40 shares')).toBeInTheDocument();
      });
    });

    it('displays next target price', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      await user.type(screen.getByLabelText(/symbol/i), 'GME');
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(screen.getByText('$300.00')).toBeInTheDocument();
      });
    });

    it('displays tactical scaling plan', async () => {
      const user = userEvent.setup();
      render(<HedgedPositionsPanel />);

      await user.type(screen.getByLabelText(/symbol/i), 'GME');
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(screen.getByText('Tactical Scaling Plan')).toBeInTheDocument();
        expect(screen.getByText('2.0x')).toBeInTheDocument();
        expect(screen.getByText('3.5x')).toBeInTheDocument();
        expect(screen.getByText('6.0x')).toBeInTheDocument();
        expect(screen.getByText('10.0x')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();

      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<HedgedPositionsPanel />);
      await user.type(screen.getByLabelText(/symbol/i), 'GME');
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to create position:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('handles non-ok response', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      });

      render(<HedgedPositionsPanel />);
      await user.type(screen.getByLabelText(/symbol/i), 'GME');
      await user.click(screen.getByRole('button', { name: /create strategy/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
