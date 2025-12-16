import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeepValuePanel } from '../DeepValuePanel';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock ScrollArea component
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn(({ children }) => <div data-testid="scroll-area">{children}</div>),
}));

// Mock DotScrollIndicator
vi.mock('@/components/ui/DotScrollIndicator', () => ({
  DotScrollIndicator: vi.fn(() => null),
}));

describe('DeepValuePanel', () => {
  const mockOpportunities = [
    {
      symbol: 'VALUE1',
      value_score: 85,
      metrics: {
        pe_ratio: 8.5,
        pb_ratio: 0.75,
        ev_ebitda: 5.2,
        fcf_yield: 0.12,
        debt_to_equity: 0.3,
        current_ratio: 2.1,
        roe: 0.15,
      },
      thesis: ['Trading below book value', 'Strong cash flow'],
      risks: ['Industry headwinds'],
      conviction: 'HIGH',
      target_price: 45.50,
    },
    {
      symbol: 'VALUE2',
      value_score: 72,
      metrics: {
        pe_ratio: 9.2,
        pb_ratio: 0.85,
        ev_ebitda: 6.1,
        fcf_yield: 0.09,
        debt_to_equity: 0.5,
        current_ratio: 1.8,
        roe: 0.12,
      },
      thesis: ['Undervalued assets'],
      risks: ['Management uncertainty', 'Market competition'],
      conviction: 'MEDIUM',
      target_price: 32.00,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpportunities),
    });
  });

  describe('Initial State', () => {
    it('renders header with title and badge', () => {
      render(<DeepValuePanel />);

      expect(screen.getByText('Deep Value Screener')).toBeInTheDocument();
      expect(screen.getByText('Icahn / Buffett Style')).toBeInTheDocument();
    });

    it('shows ready state before running screen', () => {
      render(<DeepValuePanel />);

      expect(screen.getByText('Ready to Scan')).toBeInTheDocument();
      expect(screen.getByText(/P\/B < 1.0/)).toBeInTheDocument();
    });

    it('renders Run Screen button', () => {
      render(<DeepValuePanel />);

      expect(screen.getByRole('button', { name: /run screen/i })).toBeInTheDocument();
    });
  });

  describe('Running Screen', () => {
    it('shows loading state when screening', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DeepValuePanel />);

      const runButton = screen.getByRole('button', { name: /run screen/i });
      await user.click(runButton);

      expect(screen.getByText('Screening...')).toBeInTheDocument();
      expect(runButton).toBeDisabled();
    });

    it('fetches data from correct endpoint', async () => {
      const user = userEvent.setup();
      render(<DeepValuePanel />);

      await user.click(screen.getByRole('button', { name: /run screen/i }));

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/strategies/deep-value/screen'
      );
    });

    it('displays opportunities after successful fetch', async () => {
      const user = userEvent.setup();
      render(<DeepValuePanel />);

      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(screen.getByText('VALUE1')).toBeInTheDocument();
        expect(screen.getByText('VALUE2')).toBeInTheDocument();
      });
    });

    it('displays value scores', async () => {
      const user = userEvent.setup();
      render(<DeepValuePanel />);

      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(screen.getByText('85/100')).toBeInTheDocument();
        expect(screen.getByText('72/100')).toBeInTheDocument();
      });
    });

    it('displays conviction badges', async () => {
      const user = userEvent.setup();
      render(<DeepValuePanel />);

      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(screen.getByText('HIGH CONVICTION')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM CONVICTION')).toBeInTheDocument();
      });
    });

    it('displays target prices', async () => {
      const user = userEvent.setup();
      render(<DeepValuePanel />);

      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(screen.getByText('$45.50')).toBeInTheDocument();
        expect(screen.getByText('$32.00')).toBeInTheDocument();
      });
    });

    it('displays financial metrics', async () => {
      const user = userEvent.setup();
      render(<DeepValuePanel />);

      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(screen.getByText('0.75')).toBeInTheDocument(); // P/B ratio
        expect(screen.getByText('8.5')).toBeInTheDocument(); // P/E ratio
        expect(screen.getByText('12.0%')).toBeInTheDocument(); // FCF yield
      });
    });

    it('displays investment thesis points', async () => {
      const user = userEvent.setup();
      render(<DeepValuePanel />);

      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(screen.getByText('Trading below book value')).toBeInTheDocument();
        expect(screen.getByText('Strong cash flow')).toBeInTheDocument();
      });
    });

    it('displays risk factors', async () => {
      const user = userEvent.setup();
      render(<DeepValuePanel />);

      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(screen.getByText('Industry headwinds')).toBeInTheDocument();
        expect(screen.getByText('Management uncertainty')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();

      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<DeepValuePanel />);
      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to run screen:',
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
        status: 500,
      });

      render(<DeepValuePanel />);
      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('re-enables button after error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();

      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<DeepValuePanel />);
      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run screen/i })).not.toBeDisabled();
      });
    });
  });

  describe('Empty Results', () => {
    it('handles empty results array', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<DeepValuePanel />);
      await user.click(screen.getByRole('button', { name: /run screen/i }));

      await waitFor(() => {
        // Should not show "Ready to Scan" anymore
        expect(screen.queryByText('Ready to Scan')).not.toBeInTheDocument();
      });
    });
  });
});
