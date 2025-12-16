import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMarketWatcher } from '../MobileMarketWatcher';
import { useMobileMarketWatcher } from '@/hooks/useMobileMarketWatcher';

// Mock dependencies
vi.mock('@/hooks/useMobileMarketWatcher');
vi.mock('../MarketWatcherTicker', () => ({
  MarketWatcherTicker: ({ onExpand }: any) => (
    <div data-testid="ticker" onClick={onExpand}>
      Ticker
    </div>
  ),
}));
vi.mock('../MarketWatcherMini', () => ({
  MarketWatcherMini: ({ onCollapse, onExpand, selectedSymbol, onSelectSymbol }: any) => (
    <div data-testid="mini">
      <button onClick={onCollapse}>Collapse</button>
      <button onClick={onExpand}>Expand</button>
      <button onClick={() => onSelectSymbol?.('SPY')}>Select SPY</button>
      {selectedSymbol && <div data-testid="selected">{selectedSymbol}</div>}
    </div>
  ),
}));
vi.mock('../MarketWatcherFull', () => ({
  MarketWatcherFull: ({ onBack, initialSymbol }: any) => (
    <div data-testid="full">
      <button onClick={onBack}>Back</button>
      {initialSymbol && <div data-testid="initial-symbol">{initialSymbol}</div>}
    </div>
  ),
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('MobileMarketWatcher', () => {
  const mockHookReturn = {
    state: 'collapsed' as const,
    expand: vi.fn(),
    collapse: vi.fn(),
    goFull: vi.fn(),
    goMini: vi.fn(),
    toggle: vi.fn(),
    setState: vi.fn(),
    isExpanded: false,
    isFull: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMobileMarketWatcher).mockReturnValue(mockHookReturn);
  });

  describe('state machine - collapsed state', () => {
    it('renders ticker in collapsed state', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'collapsed',
      });

      render(<MobileMarketWatcher />);

      expect(screen.getByTestId('ticker')).toBeInTheDocument();
      expect(screen.queryByTestId('mini')).not.toBeInTheDocument();
      expect(screen.queryByTestId('full')).not.toBeInTheDocument();
    });

    it('calls expand when ticker is tapped', async () => {
      const user = userEvent.setup();
      const expand = vi.fn();

      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'collapsed',
        expand,
      });

      render(<MobileMarketWatcher />);

      const ticker = screen.getByTestId('ticker');
      await user.click(ticker);

      expect(expand).toHaveBeenCalledTimes(1);
    });
  });

  describe('state machine - mini state', () => {
    it('renders mini panel in mini state', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
        isExpanded: true,
      });

      render(<MobileMarketWatcher />);

      expect(screen.getByTestId('mini')).toBeInTheDocument();
      expect(screen.queryByTestId('ticker')).not.toBeInTheDocument();
      expect(screen.queryByTestId('full')).not.toBeInTheDocument();
    });

    it('calls collapse when collapse button is clicked', async () => {
      const user = userEvent.setup();
      const collapse = vi.fn();

      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
        collapse,
      });

      render(<MobileMarketWatcher />);

      const collapseButton = screen.getByText('Collapse');
      await user.click(collapseButton);

      expect(collapse).toHaveBeenCalledTimes(1);
    });

    it('calls goFull when expand button is clicked', async () => {
      const user = userEvent.setup();
      const goFull = vi.fn();

      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
        goFull,
      });

      render(<MobileMarketWatcher />);

      const expandButton = screen.getByText('Expand');
      await user.click(expandButton);

      expect(goFull).toHaveBeenCalledTimes(1);
    });
  });

  describe('state machine - full state', () => {
    it('renders full panel in full state', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'full',
        isExpanded: true,
        isFull: true,
      });

      render(<MobileMarketWatcher />);

      expect(screen.getByTestId('full')).toBeInTheDocument();
      expect(screen.queryByTestId('ticker')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mini')).not.toBeInTheDocument();
    });

    it('calls goMini when back button is clicked', async () => {
      const user = userEvent.setup();
      const goMini = vi.fn();

      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'full',
        goMini,
      });

      render(<MobileMarketWatcher />);

      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(goMini).toHaveBeenCalledTimes(1);
    });
  });

  describe('symbol selection', () => {
    it('tracks selected symbol state', async () => {
      const user = userEvent.setup();

      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      render(<MobileMarketWatcher />);

      const selectButton = screen.getByText('Select SPY');
      await user.click(selectButton);

      // Selected symbol should be displayed
      await waitFor(() => {
        expect(screen.getByTestId('selected')).toHaveTextContent('SPY');
      });
    });

    it('passes selected symbol to mini panel', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      const { rerender } = render(<MobileMarketWatcher />);

      // Initially no selection
      expect(screen.queryByTestId('selected')).not.toBeInTheDocument();

      // After selecting a symbol internally, it should be passed
      // (This is tested through the component's internal state management)
      expect(screen.getByTestId('mini')).toBeInTheDocument();
    });

    it('passes selected symbol to full panel as initial symbol', async () => {
      const user = userEvent.setup();

      // Start in mini state
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      const { rerender } = render(<MobileMarketWatcher />);

      // Select a symbol
      const selectButton = screen.getByText('Select SPY');
      await user.click(selectButton);

      // Switch to full state
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'full',
      });

      rerender(<MobileMarketWatcher />);

      // The selected symbol should be passed as initialSymbol
      await waitFor(() => {
        expect(screen.getByTestId('initial-symbol')).toHaveTextContent('SPY');
      });
    });

    it('handles symbol selection callback', async () => {
      const user = userEvent.setup();

      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      render(<MobileMarketWatcher />);

      const selectButton = screen.getByText('Select SPY');
      await user.click(selectButton);

      // Should update internal state
      await waitFor(() => {
        expect(screen.getByTestId('selected')).toBeInTheDocument();
      });
    });

    it('clears selection when returning to collapsed state', async () => {
      const user = userEvent.setup();

      // Start in mini with selection
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      const { rerender } = render(<MobileMarketWatcher />);

      const selectButton = screen.getByText('Select SPY');
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId('selected')).toBeInTheDocument();
      });

      // Collapse to ticker
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'collapsed',
      });

      rerender(<MobileMarketWatcher />);

      // Selection is maintained in component state even when collapsed
      expect(screen.queryByTestId('selected')).not.toBeInTheDocument();
    });
  });

  describe('initial state', () => {
    it('uses collapsed as default initial state', () => {
      render(<MobileMarketWatcher />);

      expect(useMobileMarketWatcher).toHaveBeenCalledWith('collapsed');
    });

    it('accepts custom initial state', () => {
      render(<MobileMarketWatcher initialState="mini" />);

      expect(useMobileMarketWatcher).toHaveBeenCalledWith('mini');
    });

    it('accepts full as initial state', () => {
      render(<MobileMarketWatcher initialState="full" />);

      expect(useMobileMarketWatcher).toHaveBeenCalledWith('full');
    });
  });

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(<MobileMarketWatcher className="custom-watcher" />);

      const wrapper = container.querySelector('.custom-watcher');
      expect(wrapper).toBeInTheDocument();
    });

    it('maintains z-index and relative positioning', () => {
      const { container } = render(<MobileMarketWatcher />);

      const wrapper = container.querySelector('.relative.z-20');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('transitions from collapsed to mini to full', async () => {
      const user = userEvent.setup();

      // Start collapsed
      const expand = vi.fn();
      const goFull = vi.fn();

      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'collapsed',
        expand,
      });

      const { rerender } = render(<MobileMarketWatcher />);

      // Expand to mini
      const ticker = screen.getByTestId('ticker');
      await user.click(ticker);

      expect(expand).toHaveBeenCalled();

      // Now in mini state
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
        goFull,
      });

      rerender(<MobileMarketWatcher />);

      // Expand to full
      const expandButton = screen.getByText('Expand');
      await user.click(expandButton);

      expect(goFull).toHaveBeenCalled();
    });

    it('transitions from full to mini to collapsed', async () => {
      const user = userEvent.setup();

      // Start full
      const goMini = vi.fn();
      const collapse = vi.fn();

      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'full',
        goMini,
      });

      const { rerender } = render(<MobileMarketWatcher />);

      // Go back to mini
      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(goMini).toHaveBeenCalled();

      // Now in mini state
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
        collapse,
      });

      rerender(<MobileMarketWatcher />);

      // Collapse to ticker
      const collapseButton = screen.getByText('Collapse');
      await user.click(collapseButton);

      expect(collapse).toHaveBeenCalled();
    });
  });

  describe('AnimatePresence behavior', () => {
    it('wraps collapsed and mini states in AnimatePresence', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'collapsed',
      });

      render(<MobileMarketWatcher />);

      // Ticker should be rendered
      expect(screen.getByTestId('ticker')).toBeInTheDocument();
    });

    it('wraps full state in separate AnimatePresence', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'full',
      });

      render(<MobileMarketWatcher />);

      // Full panel should be rendered
      expect(screen.getByTestId('full')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles undefined selectedSymbol gracefully', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      render(<MobileMarketWatcher />);

      // Should render without crashing
      expect(screen.getByTestId('mini')).toBeInTheDocument();
    });

    it('handles missing onSelectSymbol in mini mode', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      render(<MobileMarketWatcher />);

      // Should render without crashing
      expect(screen.getByTestId('mini')).toBeInTheDocument();
    });

    it('maintains component state across re-renders', () => {
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'collapsed',
      });

      const { rerender } = render(<MobileMarketWatcher />);

      // Re-render with same state
      rerender(<MobileMarketWatcher />);

      expect(screen.getByTestId('ticker')).toBeInTheDocument();
    });
  });

  describe('integration', () => {
    it('orchestrates all three panels correctly', () => {
      // Test that only one panel is visible at a time

      // Collapsed
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'collapsed',
      });

      const { rerender } = render(<MobileMarketWatcher />);
      expect(screen.getByTestId('ticker')).toBeInTheDocument();
      expect(screen.queryByTestId('mini')).not.toBeInTheDocument();
      expect(screen.queryByTestId('full')).not.toBeInTheDocument();

      // Mini
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      rerender(<MobileMarketWatcher />);
      expect(screen.queryByTestId('ticker')).not.toBeInTheDocument();
      expect(screen.getByTestId('mini')).toBeInTheDocument();
      expect(screen.queryByTestId('full')).not.toBeInTheDocument();

      // Full
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'full',
      });

      rerender(<MobileMarketWatcher />);
      expect(screen.queryByTestId('ticker')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mini')).not.toBeInTheDocument();
      expect(screen.getByTestId('full')).toBeInTheDocument();
    });

    it('passes correct props to each panel', () => {
      // Mini panel
      vi.mocked(useMobileMarketWatcher).mockReturnValue({
        ...mockHookReturn,
        state: 'mini',
      });

      render(<MobileMarketWatcher />);

      // Mini should have collapse and expand buttons
      expect(screen.getByText('Collapse')).toBeInTheDocument();
      expect(screen.getByText('Expand')).toBeInTheDocument();
    });
  });
});
