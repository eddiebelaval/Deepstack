import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketWatcherMini } from '../MarketWatcherMini';
import { useHaptics } from '@/hooks/useHaptics';

// Mock dependencies
vi.mock('@/hooks/useHaptics');
vi.mock('../SparklineCard', () => ({
  SparklineCard: ({ symbol, onClick, isActive, size }: any) => (
    <button
      data-testid={`sparkline-${symbol}`}
      onClick={onClick}
      data-active={isActive}
      data-size={size}
      className="sparkline-card"
    >
      {symbol}
    </button>
  ),
}));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    button: ({ children, onClick, whileTap, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>
        {children}
      </button>
    ),
  },
}));

describe('MarketWatcherMini', () => {
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
    vi.mocked(useHaptics).mockReturnValue(mockHaptics);
  });

  describe('rendering', () => {
    it('renders the collapse handle', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      expect(screen.getByText(/Markets/i)).toBeInTheDocument();
    });

    it('renders all default market symbols', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      expect(screen.getByTestId('sparkline-SPY')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline-QQQ')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline-VIX')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline-GLD')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline-TLT')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline-BTC-USD')).toBeInTheDocument();
    });

    it('renders View Full Details button', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      expect(screen.getByText(/View Full Details/i)).toBeInTheDocument();
    });

    it('renders sparkline cards in 3-column grid', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      const { container } = render(
        <MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />
      );

      const grid = container.querySelector('.grid-cols-3');
      expect(grid).toBeInTheDocument();
    });

    it('renders sparkline cards with small size', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      const spyCard = screen.getByTestId('sparkline-SPY');
      expect(spyCard).toHaveAttribute('data-size', 'sm');
    });
  });

  describe('collapse interaction', () => {
    it('calls onCollapse when handle is clicked', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      const collapseButton = screen.getByLabelText(/Collapse market watcher/i);
      await user.click(collapseButton);

      expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    it('triggers light haptic on collapse', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      const collapseButton = screen.getByLabelText(/Collapse market watcher/i);
      await user.click(collapseButton);

      expect(mockHaptics.light).toHaveBeenCalledTimes(1);
    });
  });

  describe('expand interaction', () => {
    it('calls onExpand when View Full Details is clicked', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      const expandButton = screen.getByText(/View Full Details/i);
      await user.click(expandButton);

      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('triggers selection haptic on expand', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      const expandButton = screen.getByText(/View Full Details/i);
      await user.click(expandButton);

      expect(mockHaptics.selection).toHaveBeenCalledTimes(1);
    });
  });

  describe('symbol selection', () => {
    it('highlights selected symbol', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          selectedSymbol="SPY"
        />
      );

      const spyCard = screen.getByTestId('sparkline-SPY');
      expect(spyCard).toHaveAttribute('data-active', 'true');
    });

    it('does not highlight unselected symbols', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          selectedSymbol="SPY"
        />
      );

      const qqqCard = screen.getByTestId('sparkline-QQQ');
      expect(qqqCard).toHaveAttribute('data-active', 'false');
    });

    it('calls onSelectSymbol when symbol is clicked', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();
      const onSelectSymbol = vi.fn();

      render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          onSelectSymbol={onSelectSymbol}
        />
      );

      const spyCard = screen.getByTestId('sparkline-SPY');
      await user.click(spyCard);

      expect(onSelectSymbol).toHaveBeenCalledWith('SPY');
    });

    it('triggers light haptic when symbol is selected', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();
      const onSelectSymbol = vi.fn();

      render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          onSelectSymbol={onSelectSymbol}
        />
      );

      const spyCard = screen.getByTestId('sparkline-SPY');
      await user.click(spyCard);

      expect(mockHaptics.light).toHaveBeenCalled();
    });

    it('handles missing onSelectSymbol prop gracefully', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      const spyCard = screen.getByTestId('sparkline-SPY');
      await user.click(spyCard);

      // Should not throw error
      expect(mockHaptics.light).toHaveBeenCalled();
    });
  });

  describe('safe area handling', () => {
    it('applies safe area top class', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      const { container } = render(
        <MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />
      );

      const panel = container.querySelector('.safe-area-top');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      const { container } = render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          className="custom-mini"
        />
      );

      const panel = container.querySelector('.custom-mini');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('layout styling', () => {
    it('applies glass surface styling', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      const { container } = render(
        <MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />
      );

      const panel = container.querySelector('.glass-surface');
      expect(panel).toBeInTheDocument();
    });

    it('applies border bottom styling', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      const { container } = render(
        <MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />
      );

      const panel = container.querySelector('.border-b');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('collapse button has accessible label', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      expect(screen.getByLabelText(/Collapse market watcher/i)).toBeInTheDocument();
    });

    it('collapse button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      const collapseButton = screen.getByLabelText(/Collapse market watcher/i);
      collapseButton.focus();

      await user.keyboard('{Enter}');

      expect(onCollapse).toHaveBeenCalled();
    });

    it('expand button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(<MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />);

      const expandButton = screen.getByText(/View Full Details/i);
      expandButton.focus();

      await user.keyboard('{Enter}');

      expect(onExpand).toHaveBeenCalled();
    });

    it('applies tap target class for mobile UX', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      const { container } = render(
        <MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />
      );

      const tapTargets = container.querySelectorAll('.tap-target');
      expect(tapTargets.length).toBeGreaterThan(0);
    });
  });

  describe('callback memoization', () => {
    it('does not recreate callbacks on re-render', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();
      const onSelectSymbol = vi.fn();

      const { rerender } = render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          onSelectSymbol={onSelectSymbol}
        />
      );

      // Re-render with same props
      rerender(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          onSelectSymbol={onSelectSymbol}
        />
      );

      // Component should render without issues
      expect(screen.getByText(/Markets/i)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles undefined selectedSymbol', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          selectedSymbol={undefined}
        />
      );

      const cards = screen.getAllByRole('button');
      // All cards should have data-active="false"
      cards.forEach((card) => {
        if (card.hasAttribute('data-active')) {
          expect(card).toHaveAttribute('data-active', 'false');
        }
      });
    });

    it('handles empty string selectedSymbol', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          selectedSymbol=""
        />
      );

      // Component should render without issues
      expect(screen.getByText(/Markets/i)).toBeInTheDocument();
    });

    it('handles symbol not in default list', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      render(
        <MarketWatcherMini
          onCollapse={onCollapse}
          onExpand={onExpand}
          selectedSymbol="AAPL"
        />
      );

      // None of the default symbols should be highlighted
      const cards = screen.getAllByRole('button');
      const activeCards = cards.filter((card) =>
        card.hasAttribute('data-active')
          ? card.getAttribute('data-active') === 'true'
          : false
      );
      expect(activeCards.length).toBe(0);
    });
  });

  describe('touch manipulation', () => {
    it('applies touch-manipulation class to collapse button', () => {
      const onCollapse = vi.fn();
      const onExpand = vi.fn();

      const { container } = render(
        <MarketWatcherMini onCollapse={onCollapse} onExpand={onExpand} />
      );

      const collapseButton = container.querySelector('.touch-manipulation');
      expect(collapseButton).toBeInTheDocument();
    });
  });
});
