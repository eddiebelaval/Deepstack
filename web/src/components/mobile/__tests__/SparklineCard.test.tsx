import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import { SparklineCard } from '../SparklineCard';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useBarData } from '@/hooks/useBarData';

// Mock dependencies
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/hooks/useBarData');
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, whileTap, className, style, ...props }: any) => (
      <button onClick={onClick} className={className} style={style} {...props}>
        {children}
      </button>
    ),
  },
}));

describe('SparklineCard', () => {
  const mockQuote = {
    symbol: 'SPY',
    last: 450.25,
    change: 5.25,
    changePercent: 1.18,
    timestamp: new Date().toISOString(),
  };

  const mockBars = Array.from({ length: 50 }, (_, i) => ({
    time: Date.now() - (50 - i) * 60000,
    value: 440 + Math.random() * 20,
  }));

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useMarketDataStore
    vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
      const state = {
        quotes: {
          SPY: mockQuote,
        },
      };
      return selector ? selector(state) : state;
    });

    // Mock useBarData
    vi.mocked(useBarData).mockReturnValue({
      data: { bars: mockBars },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  describe('rendering', () => {
    it('renders symbol name', () => {
      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('renders current price', () => {
      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText('$450.25')).toBeInTheDocument();
    });

    it('renders change percentage with positive indicator', () => {
      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText(/\+1\.18%/)).toBeInTheDocument();
    });

    it('renders negative change percentage', () => {
      const negativeQuote = { ...mockQuote, changePercent: -1.5, change: -6.75 };
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: { SPY: negativeQuote } };
        return selector ? selector(state) : state;
      });

      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText(/-1\.50%/)).toBeInTheDocument();
    });

    it('renders neutral indicator when change is zero', () => {
      const neutralQuote = { ...mockQuote, changePercent: 0, change: 0 };
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: { SPY: neutralQuote } };
        return selector ? selector(state) : state;
      });

      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText(/0\.00%/)).toBeInTheDocument();
    });

    it('renders placeholder when no price data', () => {
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: {} };
        return selector ? selector(state) : state;
      });

      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('sparkline chart', () => {
    it('renders SVG sparkline with bar data', () => {
      const { container } = render(<SparklineCard symbol="SPY" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders loading state when bar data is loading', () => {
      vi.mocked(useBarData).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { container } = render(<SparklineCard symbol="SPY" />);
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });

    it('renders placeholder when no bar data available', () => {
      vi.mocked(useBarData).mockReturnValue({
        data: { bars: [] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { container } = render(<SparklineCard symbol="SPY" />);
      // Should not have a chart SVG path, only the horizontal line
      const chartPath = container.querySelector('svg path[stroke]');
      expect(chartPath).not.toBeInTheDocument();
    });

    it('generates correct SVG path for bar data', () => {
      const { container } = render(<SparklineCard symbol="SPY" />);
      const path = container.querySelector('svg path[stroke]');
      expect(path).toBeInTheDocument();
      expect(path?.getAttribute('d')).toBeTruthy();
    });

    it('uses profit color for positive change', () => {
      const { container } = render(<SparklineCard symbol="SPY" />);
      const path = container.querySelector('svg path[stroke]');
      expect(path?.getAttribute('stroke')).toContain('145'); // profit hue
    });

    it('uses loss color for negative change', () => {
      const negativeQuote = { ...mockQuote, changePercent: -1.5 };
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: { SPY: negativeQuote } };
        return selector ? selector(state) : state;
      });

      const { container } = render(<SparklineCard symbol="SPY" />);
      const path = container.querySelector('svg path[stroke]');
      expect(path?.getAttribute('stroke')).toContain('25'); // loss hue
    });
  });

  describe('interaction', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<SparklineCard symbol="SPY" onClick={onClick} />);

      const card = screen.getByRole('button');
      await user.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when onClick is not provided', async () => {
      const user = userEvent.setup();
      render(<SparklineCard symbol="SPY" />);

      const card = screen.getByRole('button');
      await user.click(card);
      // Should not throw error
    });

    it('applies active styling when isActive is true', () => {
      const { container } = render(<SparklineCard symbol="SPY" isActive={true} />);
      const card = container.querySelector('.ring-2');
      expect(card).toBeInTheDocument();
    });

    it('does not apply active styling when isActive is false', () => {
      const { container } = render(<SparklineCard symbol="SPY" isActive={false} />);
      const card = container.querySelector('.ring-2');
      expect(card).not.toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('renders with medium size by default', () => {
      const { container } = render(<SparklineCard symbol="SPY" />);
      const symbol = screen.getByText('SPY');
      expect(symbol).toHaveClass('text-sm');
    });

    it('renders with small size when size="sm"', () => {
      const { container } = render(<SparklineCard symbol="SPY" size="sm" />);
      const symbol = screen.getByText('SPY');
      expect(symbol).toHaveClass('text-xs');
    });

    it('applies correct padding for small size', () => {
      const { container } = render(<SparklineCard symbol="SPY" size="sm" />);
      const card = container.querySelector('.p-2');
      expect(card).toBeInTheDocument();
    });

    it('applies correct padding for medium size', () => {
      const { container } = render(<SparklineCard symbol="SPY" size="md" />);
      const card = container.querySelector('.p-3');
      expect(card).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className to card', () => {
      const { container } = render(<SparklineCard symbol="SPY" className="custom-class" />);
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('data fetching', () => {
    it('fetches bar data with correct parameters', () => {
      render(<SparklineCard symbol="SPY" />);

      expect(useBarData).toHaveBeenCalledWith('SPY', '1d', true);
    });

    it('fetches bar data for different symbols', () => {
      const { rerender } = render(<SparklineCard symbol="SPY" />);
      expect(useBarData).toHaveBeenCalledWith('SPY', '1d', true);

      rerender(<SparklineCard symbol="QQQ" />);
      expect(useBarData).toHaveBeenCalledWith('QQQ', '1d', true);
    });
  });

  describe('trend indicators', () => {
    it('shows TrendingUp icon for positive change', () => {
      render(<SparklineCard symbol="SPY" />);
      // Check for the presence of the icon by its container
      const changeElement = screen.getByText(/\+1\.18%/).closest('span');
      expect(changeElement).toHaveClass('text-profit');
    });

    it('shows TrendingDown icon for negative change', () => {
      const negativeQuote = { ...mockQuote, changePercent: -1.5 };
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: { SPY: negativeQuote } };
        return selector ? selector(state) : state;
      });

      render(<SparklineCard symbol="SPY" />);
      const changeElement = screen.getByText(/-1\.50%/).closest('span');
      expect(changeElement).toHaveClass('text-loss');
    });

    it('shows Minus icon for zero change', () => {
      const neutralQuote = { ...mockQuote, changePercent: 0 };
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: { SPY: neutralQuote } };
        return selector ? selector(state) : state;
      });

      render(<SparklineCard symbol="SPY" />);
      const changeElement = screen.getByText(/0\.00%/).closest('span');
      expect(changeElement).toHaveClass('text-neutral');
    });
  });

  describe('memoization', () => {
    it('recalculates price points when bar data changes', () => {
      const { rerender } = render(<SparklineCard symbol="SPY" />);

      const newBars = Array.from({ length: 50 }, (_, i) => ({
        time: Date.now() - (50 - i) * 60000,
        value: 460 + Math.random() * 20,
      }));

      vi.mocked(useBarData).mockReturnValue({
        data: { bars: newBars },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      rerender(<SparklineCard symbol="SPY" />);

      const { container } = render(<SparklineCard symbol="SPY" />);
      const path = container.querySelector('svg path[stroke]');
      expect(path).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty bar data gracefully', () => {
      vi.mocked(useBarData).mockReturnValue({
        data: { bars: [] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('handles undefined bar data gracefully', () => {
      vi.mocked(useBarData).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('handles missing quote data gracefully', () => {
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: {} };
        return selector ? selector(state) : state;
      });

      render(<SparklineCard symbol="SPY" />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('handles single bar data point', () => {
      vi.mocked(useBarData).mockReturnValue({
        data: {
          bars: [{
            time: Date.now(),
            value: 450,
          }],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<SparklineCard symbol="SPY" />);
      // Should show placeholder when insufficient data
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });
  });
});
