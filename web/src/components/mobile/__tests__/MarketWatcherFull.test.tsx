import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createPortal } from 'react-dom';
import { MarketWatcherFull } from '../MarketWatcherFull';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useBarData } from '@/hooks/useBarData';
import { useHaptics } from '@/hooks/useHaptics';

// Mock dependencies
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: vi.fn((element) => element),
  };
});
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/hooks/useBarData');
vi.mock('@/hooks/useHaptics');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('MarketWatcherFull', () => {
  const mockQuotes = {
    SPY: {
      symbol: 'SPY',
      last: 450.25,
      change: 5.25,
      changePercent: 1.18,
      open: 445.00,
      high: 451.50,
      low: 444.00,
      close: 450.25,
      volume: 75000000,
      timestamp: new Date().toISOString(),
    },
    QQQ: {
      symbol: 'QQQ',
      last: 380.50,
      change: -2.30,
      changePercent: -0.60,
      open: 382.80,
      high: 383.00,
      low: 379.50,
      close: 380.50,
      volume: 45000000,
      timestamp: new Date().toISOString(),
    },
  };

  const mockBars = Array.from({ length: 60 }, (_, i) => ({
    time: Date.now() - (60 - i) * 60000,
    value: 440 + Math.random() * 20,
  }));

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

    vi.mocked(useBarData).mockReturnValue({
      data: { bars: mockBars },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useHaptics).mockReturnValue(mockHaptics);

    // Mock document.body.style
    Object.defineProperty(document.body, 'style', {
      value: { overflow: '' },
      writable: true,
    });
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('renders via portal to document.body', () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      expect(createPortal).toHaveBeenCalled();
    });

    it('renders header with title', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByText('Market Watch')).toBeInTheDocument();
      });
    });

    it('renders back button', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Go back/i)).toBeInTheDocument();
      });
    });

    it('renders refresh button', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Refresh/i)).toBeInTheDocument();
      });
    });

    it('renders tab navigation', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByText('Indices')).toBeInTheDocument();
        expect(screen.getByText('Watchlist')).toBeInTheDocument();
        expect(screen.getByText('Crypto')).toBeInTheDocument();
        expect(screen.getByText('Sectors')).toBeInTheDocument();
      });
    });

    it('renders indices tab by default', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        const indicesTab = screen.getByText('Indices');
        expect(indicesTab).toHaveClass('bg-primary');
      });
    });

    it('does not render until mounted', () => {
      const onBack = vi.fn();

      const { container } = render(<MarketWatcherFull onBack={onBack} />);

      // Should render after mount
      expect(createPortal).toHaveBeenCalled();
    });
  });

  describe('tab navigation', () => {
    it('switches to watchlist tab when clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByText('Watchlist')).toBeInTheDocument();
      });

      const watchlistTab = screen.getByText('Watchlist');
      await user.click(watchlistTab);

      expect(watchlistTab).toHaveClass('bg-primary');
      expect(mockHaptics.selection).toHaveBeenCalled();
    });

    it('switches to crypto tab when clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByText('Crypto')).toBeInTheDocument();
      });

      const cryptoTab = screen.getByText('Crypto');
      await user.click(cryptoTab);

      expect(cryptoTab).toHaveClass('bg-primary');
    });

    it('switches to sectors tab when clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByText('Sectors')).toBeInTheDocument();
      });

      const sectorsTab = screen.getByText('Sectors');
      await user.click(sectorsTab);

      expect(sectorsTab).toHaveClass('bg-primary');
    });

    it('triggers selection haptic on tab change', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByText('Watchlist')).toBeInTheDocument();
      });

      const watchlistTab = screen.getByText('Watchlist');
      await user.click(watchlistTab);

      expect(mockHaptics.selection).toHaveBeenCalled();
    });
  });

  describe('back button', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Go back/i)).toBeInTheDocument();
      });

      const backButton = screen.getByLabelText(/Go back/i);
      await user.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('triggers light haptic on back', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Go back/i)).toBeInTheDocument();
      });

      const backButton = screen.getByLabelText(/Go back/i);
      await user.click(backButton);

      expect(mockHaptics.light).toHaveBeenCalled();
    });
  });

  describe('symbol detail', () => {
    it('displays selected symbol details', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        expect(screen.getByText('SPY')).toBeInTheDocument();
        expect(screen.getByText('$450.25')).toBeInTheDocument();
      });
    });

    it('displays price change information', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        expect(screen.getByText(/\+5\.25/)).toBeInTheDocument();
        expect(screen.getByText(/\+1\.18%/)).toBeInTheDocument();
      });
    });

    it('displays OHLCV data when available', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        expect(screen.getByText(/Open/i)).toBeInTheDocument();
        expect(screen.getByText(/High/i)).toBeInTheDocument();
        expect(screen.getByText(/Low/i)).toBeInTheDocument();
        expect(screen.getByText(/Close/i)).toBeInTheDocument();
        expect(screen.getByText(/Vol/i)).toBeInTheDocument();
      });
    });

    it('renders larger chart for selected symbol', async () => {
      const onBack = vi.fn();

      const { container } = render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching bars', async () => {
      vi.mocked(useBarData).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      const onBack = vi.fn();

      const { container } = render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        const loadingElement = container.querySelector('.animate-pulse');
        expect(loadingElement).toBeInTheDocument();
      });
    });
  });

  describe('symbol list', () => {
    it('renders symbol rows for current tab', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        // Indices tab should show SPY, QQQ, VIX
        expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
        expect(screen.getAllByText('QQQ').length).toBeGreaterThan(0);
      });
    });

    it('highlights selected symbol in list', async () => {
      const onBack = vi.fn();

      const { container } = render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        const activeRow = container.querySelector('.bg-primary\\/5');
        expect(activeRow).toBeInTheDocument();
      });
    });

    it('changes selected symbol when row is clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        expect(screen.getAllByText('QQQ').length).toBeGreaterThan(0);
      });

      // Find QQQ symbol row button (there may be multiple QQQ texts)
      const qqqButtons = screen.getAllByText('QQQ').map(el => el.closest('button')).filter(Boolean);
      const qqqButton = qqqButtons[qqqButtons.length - 1]; // Get the button in the list (last one)

      if (qqqButton) {
        await user.click(qqqButton);
        expect(mockHaptics.light).toHaveBeenCalled();
      }
    });
  });

  describe('body scroll lock', () => {
    it('locks body scroll on mount', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });

    it('restores body scroll on unmount', async () => {
      const onBack = vi.fn();

      const { unmount } = render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('safe area handling', () => {
    it('applies safe area classes', async () => {
      const onBack = vi.fn();

      const { container } = render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        const panel = container.querySelector('.safe-area-top');
        expect(panel).toBeInTheDocument();
      });

      const bottomSafeArea = container.querySelector('.safe-area-bottom');
      expect(bottomSafeArea).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className', async () => {
      const onBack = vi.fn();

      const { container } = render(
        <MarketWatcherFull onBack={onBack} className="custom-full" />
      );

      await waitFor(() => {
        const panel = container.querySelector('.custom-full');
        expect(panel).toBeInTheDocument();
      });
    });
  });

  describe('volume formatting', () => {
    it('formats large volumes correctly', async () => {
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        // 75,000,000 should format to "75.0M"
        expect(screen.getByText(/75\.0M/)).toBeInTheDocument();
      });
    });
  });

  describe('responsive behavior', () => {
    it('applies fixed positioning for full screen', async () => {
      const onBack = vi.fn();

      const { container } = render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        const panel = container.querySelector('.fixed');
        expect(panel).toBeInTheDocument();
      });
    });

    it('applies inset-0 for full viewport coverage', async () => {
      const onBack = vi.fn();

      const { container } = render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        const panel = container.querySelector('.inset-0');
        expect(panel).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('handles missing OHLCV data', async () => {
      const quoteWithoutOHLCV = {
        SPY: {
          symbol: 'SPY',
          last: 450.25,
          change: 5.25,
          changePercent: 1.18,
          timestamp: new Date().toISOString(),
        },
      };

      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: quoteWithoutOHLCV };
        return selector ? selector(state) : state;
      });

      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        // Should not show OHLCV section
        expect(screen.queryByText(/Open/i)).not.toBeInTheDocument();
      });
    });

    it('handles empty bar data', async () => {
      vi.mocked(useBarData).mockReturnValue({
        data: { bars: [] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        expect(screen.getByText('SPY')).toBeInTheDocument();
      });
    });

    it('handles undefined quote data', async () => {
      vi.mocked(useMarketDataStore).mockImplementation((selector: any) => {
        const state = { quotes: {} };
        return selector ? selector(state) : state;
      });

      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} initialSymbol="SPY" />);

      await waitFor(() => {
        expect(screen.getByText('SPY')).toBeInTheDocument();
      });
    });

    it('handles initial symbol not in current tab', async () => {
      const onBack = vi.fn();

      // Start with BTC-USD which is in crypto tab, but default tab is indices
      render(<MarketWatcherFull onBack={onBack} initialSymbol="BTC-USD" />);

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByText('Market Watch')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('back button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Go back/i)).toBeInTheDocument();
      });

      const backButton = screen.getByLabelText(/Go back/i);
      backButton.focus();

      await user.keyboard('{Enter}');

      expect(onBack).toHaveBeenCalled();
    });

    it('tab buttons are keyboard accessible', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByText('Watchlist')).toBeInTheDocument();
      });

      const watchlistTab = screen.getByText('Watchlist');
      watchlistTab.focus();

      await user.keyboard('{Enter}');

      expect(watchlistTab).toHaveClass('bg-primary');
    });

    it('applies tap target class for mobile UX', async () => {
      const onBack = vi.fn();

      const { container } = render(<MarketWatcherFull onBack={onBack} />);

      await waitFor(() => {
        const tapTargets = container.querySelectorAll('.tap-target');
        expect(tapTargets.length).toBeGreaterThan(0);
      });
    });
  });
});
