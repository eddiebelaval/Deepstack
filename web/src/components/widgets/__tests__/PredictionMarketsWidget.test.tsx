import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PredictionMarketsWidget } from '../PredictionMarketsWidget';
import { fetchTrendingMarkets } from '@/lib/api/prediction-markets';

// Mock the API
vi.mock('@/lib/api/prediction-markets', () => ({
  fetchTrendingMarkets: vi.fn(),
}));

describe('PredictionMarketsWidget', () => {
  const mockMarkets = [
    {
      id: '1',
      platform: 'kalshi',
      title: 'Will BTC reach $100k by year end?',
      yesPrice: 0.65,
      url: 'https://kalshi.com/market/1',
    },
    {
      id: '2',
      platform: 'polymarket',
      title: 'Will the Fed cut rates in January?',
      yesPrice: 0.35,
      url: 'https://polymarket.com/market/2',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      (fetchTrendingMarkets as any).mockReturnValue(new Promise(() => {}));

      const { container } = render(<PredictionMarketsWidget />);

      // Loader2 uses animate-spin class
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      (fetchTrendingMarkets as any).mockResolvedValue({ markets: mockMarkets });
    });

    it('should render market titles', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Will BTC reach $100k by year end?')).toBeInTheDocument();
        expect(screen.getByText('Will the Fed cut rates in January?')).toBeInTheDocument();
      });
    });

    it('should render probability percentages', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('65%')).toBeInTheDocument();
        expect(screen.getByText('35%')).toBeInTheDocument();
      });
    });

    it('should render platform names', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('kalshi')).toBeInTheDocument();
        expect(screen.getByText('polymarket')).toBeInTheDocument();
      });
    });

    it('should render market links', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const links = screen.getAllByRole('link');
        expect(links[0]).toHaveAttribute('href', 'https://kalshi.com/market/1');
        expect(links[1]).toHaveAttribute('href', 'https://polymarket.com/market/2');
      });
    });

    it('should open links in new tab', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const links = screen.getAllByRole('link');
        links.forEach((link) => {
          expect(link).toHaveAttribute('target', '_blank');
          expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });
      });
    });
  });

  describe('Error State', () => {
    it('should show error message on failure', async () => {
      (fetchTrendingMarkets as any).mockRejectedValue(new Error('Network error'));

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      (fetchTrendingMarkets as any).mockRejectedValue(new Error('Network error'));

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading when retry button is clicked', async () => {
      const user = userEvent.setup();
      (fetchTrendingMarkets as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ markets: mockMarkets });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Will BTC reach $100k by year end?')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no markets', async () => {
      (fetchTrendingMarkets as any).mockResolvedValue({ markets: [] });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('No markets available')).toBeInTheDocument();
      });
    });
  });

  describe('Probability Styling', () => {
    beforeEach(() => {
      (fetchTrendingMarkets as any).mockResolvedValue({ markets: mockMarkets });
    });

    it('should style high probability (>=50%) in green', async () => {
      const { container } = render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const profitElements = container.querySelectorAll('.text-profit');
        expect(profitElements.length).toBeGreaterThan(0);
      });
    });

    it('should style low probability (<50%) in red', async () => {
      const { container } = render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const lossElements = container.querySelectorAll('.text-loss');
        expect(lossElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Auto-refresh', () => {
    it('should call fetchTrendingMarkets on mount', () => {
      (fetchTrendingMarkets as any).mockResolvedValue({ markets: mockMarkets });

      render(<PredictionMarketsWidget />);

      expect(fetchTrendingMarkets).toHaveBeenCalledWith({ limit: 4 });
    });
  });
});
