import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TradingLayout } from '../TradingLayout';
import { useTradingStore } from '@/lib/stores/trading-store';

// Mock dependencies
vi.mock('@/lib/stores/trading-store');

// Mock ResizablePanel components
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children, direction, className }: any) => (
    <div data-testid="resizable-panel-group" data-direction={direction} className={className}>
      {children}
    </div>
  ),
  ResizablePanel: ({ children, defaultSize, minSize, maxSize, className }: any) => (
    <div
      data-testid="resizable-panel"
      data-default-size={defaultSize}
      data-min-size={minSize}
      data-max-size={maxSize}
      className={className}
    >
      {children}
    </div>
  ),
  ResizableHandle: ({ withHandle }: any) => (
    <div data-testid="resizable-handle" data-with-handle={withHandle}>Handle</div>
  ),
}));

describe('TradingLayout', () => {
  const mockWatchlistPanel = <div data-testid="watchlist-panel">Watchlist</div>;
  const mockChartPanel = <div data-testid="chart-panel">Chart</div>;
  const mockOrderPanel = <div data-testid="order-panel">Order</div>;
  const mockChatPanel = <div data-testid="chat-panel">Chat</div>;

  beforeEach(() => {
    vi.clearAllMocks();

    (useTradingStore as any).mockReturnValue({
      showWatchlist: true,
      showOrderPanel: true,
      showChatPanel: true,
    });
  });

  describe('Rendering', () => {
    it('should render the layout container', () => {
      const { container } = render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      expect(container.firstChild).toHaveClass('flex-1', 'h-full', 'overflow-hidden');
    });

    it('should render ResizablePanelGroup with horizontal direction', () => {
      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panelGroup = screen.getByTestId('resizable-panel-group');
      expect(panelGroup).toHaveAttribute('data-direction', 'horizontal');
    });
  });

  describe('Panel Visibility', () => {
    it('should render all panels when all are visible', () => {
      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      expect(screen.getByTestId('watchlist-panel')).toBeInTheDocument();
      expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
      expect(screen.getByTestId('order-panel')).toBeInTheDocument();
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    });

    it('should not render watchlist when hidden', () => {
      (useTradingStore as any).mockReturnValue({
        showWatchlist: false,
        showOrderPanel: true,
        showChatPanel: true,
      });

      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      expect(screen.queryByTestId('watchlist-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
    });

    it('should not render order panel when hidden', () => {
      (useTradingStore as any).mockReturnValue({
        showWatchlist: true,
        showOrderPanel: false,
        showChatPanel: true,
      });

      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      expect(screen.queryByTestId('order-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
    });

    it('should not render chat panel when hidden', () => {
      (useTradingStore as any).mockReturnValue({
        showWatchlist: true,
        showOrderPanel: true,
        showChatPanel: false,
      });

      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
    });

    it('should always render chart panel', () => {
      (useTradingStore as any).mockReturnValue({
        showWatchlist: false,
        showOrderPanel: false,
        showChatPanel: false,
      });

      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
    });
  });

  describe('Resize Handles', () => {
    it('should render handles between visible panels', () => {
      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const handles = screen.getAllByTestId('resizable-handle');
      // Watchlist | Chart | Order | Chat = 3 handles
      expect(handles.length).toBe(3);
    });

    it('should render fewer handles when panels are hidden', () => {
      (useTradingStore as any).mockReturnValue({
        showWatchlist: false,
        showOrderPanel: false,
        showChatPanel: true,
      });

      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const handles = screen.getAllByTestId('resizable-handle');
      // Chart | Chat = 1 handle
      expect(handles.length).toBe(1);
    });

    it('should render handles with withHandle prop', () => {
      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const handles = screen.getAllByTestId('resizable-handle');
      handles.forEach((handle) => {
        expect(handle).toHaveAttribute('data-with-handle', 'true');
      });
    });
  });

  describe('Panel Sizes', () => {
    it('should set watchlist panel sizes', () => {
      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panels = screen.getAllByTestId('resizable-panel');
      const watchlistPanel = panels[0];

      expect(watchlistPanel).toHaveAttribute('data-default-size', '15');
      expect(watchlistPanel).toHaveAttribute('data-min-size', '10');
      expect(watchlistPanel).toHaveAttribute('data-max-size', '25');
    });

    it('should set chart panel size based on chat visibility', () => {
      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panels = screen.getAllByTestId('resizable-panel');
      const chartPanel = panels[1];

      // When chat is visible, chart is 45%
      expect(chartPanel).toHaveAttribute('data-default-size', '45');
    });

    it('should expand chart panel when chat is hidden', () => {
      (useTradingStore as any).mockReturnValue({
        showWatchlist: true,
        showOrderPanel: true,
        showChatPanel: false,
      });

      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panels = screen.getAllByTestId('resizable-panel');
      const chartPanel = panels[1];

      // When chat is hidden, chart is 60%
      expect(chartPanel).toHaveAttribute('data-default-size', '60');
    });

    it('should set order panel sizes', () => {
      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panels = screen.getAllByTestId('resizable-panel');
      const orderPanel = panels[2];

      expect(orderPanel).toHaveAttribute('data-default-size', '18');
      expect(orderPanel).toHaveAttribute('data-min-size', '15');
      expect(orderPanel).toHaveAttribute('data-max-size', '30');
    });

    it('should set chat panel sizes', () => {
      render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panels = screen.getAllByTestId('resizable-panel');
      const chatPanel = panels[3];

      expect(chatPanel).toHaveAttribute('data-default-size', '22');
      expect(chatPanel).toHaveAttribute('data-min-size', '18');
      expect(chatPanel).toHaveAttribute('data-max-size', '35');
    });
  });

  describe('Panel Styling', () => {
    it('should apply border styles to panels', () => {
      const { container } = render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      // Watchlist has border-r
      expect(container.querySelector('.border-r')).toBeInTheDocument();
      // Order and chat have border-l
      const borderLeftElements = container.querySelectorAll('.border-l');
      expect(borderLeftElements.length).toBe(2);
    });

    it('should apply bg-card to panels', () => {
      const { container } = render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const bgCardElements = container.querySelectorAll('.bg-card');
      expect(bgCardElements.length).toBe(4);
    });

    it('should apply overflow-hidden to panel containers', () => {
      const { container } = render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const overflowHiddenElements = container.querySelectorAll('.overflow-hidden');
      // Main container + 4 panel containers
      expect(overflowHiddenElements.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Minimum Width Constraints', () => {
    it('should set min-width on watchlist panel', () => {
      const { container } = render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panels = screen.getAllByTestId('resizable-panel');
      expect(panels[0]).toHaveClass('min-w-[200px]');
    });

    it('should set min-width on order panel', () => {
      const { container } = render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panels = screen.getAllByTestId('resizable-panel');
      expect(panels[2]).toHaveClass('min-w-[240px]');
    });

    it('should set min-width on chat panel', () => {
      const { container } = render(
        <TradingLayout
          watchlistPanel={mockWatchlistPanel}
          chartPanel={mockChartPanel}
          orderPanel={mockOrderPanel}
          chatPanel={mockChatPanel}
        />
      );

      const panels = screen.getAllByTestId('resizable-panel');
      expect(panels[3]).toHaveClass('min-w-[280px]');
    });
  });
});
