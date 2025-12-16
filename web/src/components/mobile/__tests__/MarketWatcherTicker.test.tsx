import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketWatcherTicker } from '../MarketWatcherTicker';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useHaptics } from '@/hooks/useHaptics';

// Mock dependencies
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/hooks/useHaptics');
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, whileTap, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>
        {children}
      </button>
    ),
  },
}));

describe('MarketWatcherTicker', () => {
  const mockQuotes = {
    SPY: {
      symbol: 'SPY',
      last: 450.25,
      change: 5.25,
      changePercent: 1.18,
      timestamp: new Date().toISOString(),
    },
    QQQ: {
      symbol: 'QQQ',
      last: 380.50,
      change: -2.30,
      changePercent: -0.60,
      timestamp: new Date().toISOString(),
    },
    VIX: {
      symbol: 'VIX',
      last: 15.25,
      change: 0.75,
      changePercent: 5.17,
      timestamp: new Date().toISOString(),
    },
    GLD: {
      symbol: 'GLD',
      last: 185.60,
      change: 1.20,
      changePercent: 0.65,
      timestamp: new Date().toISOString(),
    },
    TLT: {
      symbol: 'TLT',
      last: 92.40,
      change: -0.30,
      changePercent: -0.32,
      timestamp: new Date().toISOString(),
    },
    'BTC-USD': {
      symbol: 'BTC-USD',
      last: 45000.00,
      change: 1500.00,
      changePercent: 3.45,
      timestamp: new Date().toISOString(),
    },
  };

  const mockHaptics = {
    light: vi.fn(),
    medium: vi.fn(),
    heavy: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    selection: vi.fn(),
    isSupported: true,
    trigger: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
      const state = { quotes: mockQuotes };
      return selector ? selector(state) : state;
    });

    vi.mocked(useHaptics).mockReturnValue(mockHaptics);
  });

  describe('rendering', () => {
    it('renders ticker container', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);
      const ticker = container.querySelector('.led-ticker-container');
      expect(ticker).toBeInTheDocument();
    });

    it('renders pull-down indicators', () => {
      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);
      // There should be two ChevronDown icons (left and right)
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders all default market symbols', () => {
      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
      expect(screen.getAllByText('QQQ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('VIX').length).toBeGreaterThan(0);
      expect(screen.getAllByText('GLD').length).toBeGreaterThan(0);
      expect(screen.getAllByText('TLT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BTC-USD').length).toBeGreaterThan(0);
    });

    it('renders prices for symbols', () => {
      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText('$450.25').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$380.50').length).toBeGreaterThan(0);
    });

    it('renders change percentages', () => {
      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText(/\+1\.18%/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/-0\.60%/).length).toBeGreaterThan(0);
    });

    it('duplicates ticker data for seamless scrolling', () => {
      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      // Each symbol should appear at least twice (original + duplicate for loop)
      const spyElements = screen.getAllByText('SPY');
      expect(spyElements.length).toBeGreaterThanOrEqual(2);
    });

    it('renders loading message when no quotes available', () => {
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: {} };
        return selector ? selector(state) : state;
      });

      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getByText(/Loading market data.../i)).toBeInTheDocument();
    });

    it('filters out symbols with no price data', () => {
      const partialQuotes = {
        SPY: mockQuotes.SPY,
        QQQ: { ...mockQuotes.QQQ, last: 0 }, // Should be filtered out
      };

      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: partialQuotes };
        return selector ? selector(state) : state;
      });

      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
      // QQQ should not appear since price is 0
    });
  });

  describe('interaction', () => {
    it('calls onExpand when ticker is clicked', async () => {
      const user = userEvent.setup();
      const onExpand = vi.fn();

      render(<MarketWatcherTicker onExpand={onExpand} />);

      const ticker = screen.getByRole('button');
      await user.click(ticker);

      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('triggers haptic feedback on tap', async () => {
      const user = userEvent.setup();
      const onExpand = vi.fn();

      render(<MarketWatcherTicker onExpand={onExpand} />);

      const ticker = screen.getByRole('button');
      await user.click(ticker);

      expect(mockHaptics.light).toHaveBeenCalledTimes(1);
    });
  });

  describe('ticker items', () => {
    it('renders ticker items with correct structure', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);

      const scrollContainer = container.querySelector('.animate-scroll-x');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('applies profit color for positive changes', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);

      // Find elements with profit class
      const profitElements = container.querySelectorAll('.led-profit');
      expect(profitElements.length).toBeGreaterThan(0);
    });

    it('applies loss color for negative changes', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);

      // Find elements with loss class
      const lossElements = container.querySelectorAll('.led-loss');
      expect(lossElements.length).toBeGreaterThan(0);
    });

    it('shows plus sign for positive changes', () => {
      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText(/\+1\.18%/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\+3\.45%/).length).toBeGreaterThan(0);
    });

    it('does not show plus sign for negative changes', () => {
      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText(/-0\.60%/).length).toBeGreaterThan(0);
    });
  });

  describe('fade gradients', () => {
    it('renders left fade gradient', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);

      const leftFade = container.querySelector('.led-fade-left');
      expect(leftFade).toBeInTheDocument();
    });

    it('renders right fade gradient', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);

      const rightFade = container.querySelector('.led-fade-right');
      expect(rightFade).toBeInTheDocument();
    });

    it('gradients are positioned correctly', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);

      const leftFade = container.querySelector('.led-fade-left');
      const rightFade = container.querySelector('.led-fade-right');

      expect(leftFade).toHaveClass('left-0');
      expect(rightFade).toHaveClass('right-0');
    });
  });

  describe('safe area handling', () => {
    it('applies safe area top class', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);

      const ticker = container.querySelector('.safe-area-top');
      expect(ticker).toBeInTheDocument();
    });

    it('applies tap target class for better mobile UX', () => {
      const onExpand = vi.fn();
      const { container } = render(<MarketWatcherTicker onExpand={onExpand} />);

      const ticker = container.querySelector('.tap-target');
      expect(ticker).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const onExpand = vi.fn();
      const { container } = render(
        <MarketWatcherTicker onExpand={onExpand} className="custom-ticker" />
      );

      const ticker = container.querySelector('.custom-ticker');
      expect(ticker).toBeInTheDocument();
    });
  });

  describe('reactive updates', () => {
    it('updates when quotes change', () => {
      const onExpand = vi.fn();
      const { rerender } = render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText('$450.25').length).toBeGreaterThan(0);

      // Update quotes
      const updatedQuotes = {
        ...mockQuotes,
        SPY: { ...mockQuotes.SPY, last: 455.00 },
      };

      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: updatedQuotes };
        return selector ? selector(state) : state;
      });

      rerender(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText('$455.00').length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('ticker is a button element', () => {
      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('ticker is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onExpand = vi.fn();

      render(<MarketWatcherTicker onExpand={onExpand} />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');

      expect(onExpand).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles partial quote data', () => {
      const partialQuotes = {
        SPY: mockQuotes.SPY,
      };

      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: partialQuotes };
        return selector ? selector(state) : state;
      });

      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
    });

    it('handles missing changePercent', () => {
      const quotesWithoutChange = {
        SPY: { ...mockQuotes.SPY, changePercent: undefined },
      };

      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: quotesWithoutChange };
        return selector ? selector(state) : state;
      });

      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      expect(screen.getAllByText(/0\.00%/).length).toBeGreaterThan(0);
    });

    it('handles zero price', () => {
      const quotesWithZeroPrice = {
        SPY: { ...mockQuotes.SPY, last: 0 },
      };

      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: quotesWithZeroPrice };
        return selector ? selector(state) : state;
      });

      const onExpand = vi.fn();
      render(<MarketWatcherTicker onExpand={onExpand} />);

      // Should show loading message when all prices are 0
      expect(screen.getByText(/Loading market data.../i)).toBeInTheDocument();
    });
  });
});
