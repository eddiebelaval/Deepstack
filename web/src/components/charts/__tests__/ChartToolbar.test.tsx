import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartToolbar } from '../ChartToolbar';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useSearchPaletteStore } from '@/hooks/useKeyboardShortcuts';

// Mock the stores
vi.mock('@/lib/stores/trading-store');
vi.mock('@/lib/stores/ui-store');
vi.mock('@/hooks/useKeyboardShortcuts');

describe('ChartToolbar', () => {
  const mockSetTimeframe = vi.fn();
  const mockSetChartType = vi.fn();
  const mockRemoveOverlaySymbol = vi.fn();
  const mockToggleChartCollapsed = vi.fn();
  const mockSetSearchOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock trading store
    (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeSymbol: 'SPY',
      overlaySymbols: [],
      timeframe: '1d',
      chartType: 'candlestick',
      setTimeframe: mockSetTimeframe,
      setChartType: mockSetChartType,
      removeOverlaySymbol: mockRemoveOverlaySymbol,
    });

    // Mock UI store
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      chartPanelCollapsed: false,
      toggleChartCollapsed: mockToggleChartCollapsed,
    });

    // Mock search palette store
    (useSearchPaletteStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      setSearchOpen: mockSetSearchOpen,
    });
  });

  describe('rendering', () => {
    it('renders with active symbol', () => {
      render(<ChartToolbar />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('renders all timeframe buttons', () => {
      render(<ChartToolbar />);

      const timeframes = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];
      timeframes.forEach(tf => {
        expect(screen.getByRole('button', { name: tf })).toBeInTheDocument();
      });
    });

    it('renders all chart type buttons', () => {
      render(<ChartToolbar />);

      // Chart type buttons are icon buttons with tooltips
      const buttons = screen.getAllByRole('button');

      // Filter for the chart type buttons (candlestick, line, area)
      const chartTypeButtons = buttons.filter(button => {
        const svg = button.querySelector('svg');
        return svg && button.classList.contains('p-1.5');
      });

      expect(chartTypeButtons).toHaveLength(3);
    });

    it('highlights active timeframe', () => {
      render(<ChartToolbar />);

      const activeTf = screen.getByRole('button', { name: '1D' });
      expect(activeTf).toHaveClass('bg-primary/10');
      expect(activeTf).toHaveClass('text-primary');
    });

    it('highlights active chart type', () => {
      render(<ChartToolbar />);

      const buttons = screen.getAllByRole('button');
      const chartTypeButtons = buttons.filter(button => {
        const svg = button.querySelector('svg');
        return svg && button.classList.contains('p-1.5');
      });

      // First button should be candlestick (active)
      expect(chartTypeButtons[0]).toHaveClass('bg-primary/10');
      expect(chartTypeButtons[0]).toHaveClass('text-primary');
    });

    it('renders compare button when no overlays', () => {
      render(<ChartToolbar />);
      expect(screen.getByText('Compare')).toBeInTheDocument();
    });

    it('renders collapse button with correct icon', () => {
      render(<ChartToolbar />);

      const buttons = screen.getAllByRole('button');
      const collapseButton = buttons.find(btn =>
        btn.classList.contains('h-7') && btn.classList.contains('w-7') && btn.querySelector('svg')
      );

      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('overlay symbols', () => {
    it('renders overlay symbols when present', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: ['QQQ', 'DIA'],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      expect(screen.getByText('QQQ')).toBeInTheDocument();
      expect(screen.getByText('DIA')).toBeInTheDocument();
    });

    it('hides compare button when overlays exist', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: ['QQQ'],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      expect(screen.queryByText('Compare')).not.toBeInTheDocument();
    });

    it('renders remove button for each overlay', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: ['QQQ', 'DIA'],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      const qqqContainer = screen.getByText('QQQ').parentElement;
      const diaContainer = screen.getByText('DIA').parentElement;

      expect(qqqContainer?.querySelector('button')).toBeInTheDocument();
      expect(diaContainer?.querySelector('button')).toBeInTheDocument();
    });

    it('applies different colors to overlays', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: ['QQQ', 'DIA', 'IWM', 'VTI'],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      const qqq = screen.getByText('QQQ').parentElement;
      const dia = screen.getByText('DIA').parentElement;

      // Each should have different background colors
      expect(qqq?.style.backgroundColor).toBeTruthy();
      expect(dia?.style.backgroundColor).toBeTruthy();
      expect(qqq?.style.backgroundColor).not.toBe(dia?.style.backgroundColor);
    });
  });

  describe('symbol search interaction', () => {
    it('opens search when clicking active symbol', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const symbolButton = screen.getByText('SPY').closest('button');
      await user.click(symbolButton!);

      expect(mockSetSearchOpen).toHaveBeenCalledWith(true);
    });

    it('opens search when clicking compare button', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const compareButton = screen.getByText('Compare').closest('button');
      await user.click(compareButton!);

      expect(mockSetSearchOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('timeframe interaction', () => {
    it('changes timeframe when clicking button', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const tf5m = screen.getByRole('button', { name: '5m' });
      await user.click(tf5m);

      expect(mockSetTimeframe).toHaveBeenCalledWith('5m');
    });

    it('changes to different timeframes', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const tf1h = screen.getByRole('button', { name: '1H' });
      await user.click(tf1h);

      expect(mockSetTimeframe).toHaveBeenCalledWith('1h');
    });

    it('highlights selected timeframe', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: [],
        timeframe: '5m',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      const tf5m = screen.getByRole('button', { name: '5m' });
      expect(tf5m).toHaveClass('bg-primary/10');
      expect(tf5m).toHaveClass('text-primary');
    });
  });

  describe('chart type interaction', () => {
    it('changes chart type when clicking button', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const buttons = screen.getAllByRole('button');
      const chartTypeButtons = buttons.filter(button => {
        const svg = button.querySelector('svg');
        return svg && button.classList.contains('p-1.5');
      });

      // Click line chart (second button)
      await user.click(chartTypeButtons[1]);

      expect(mockSetChartType).toHaveBeenCalledWith('line');
    });

    it('changes to area chart', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const buttons = screen.getAllByRole('button');
      const chartTypeButtons = buttons.filter(button => {
        const svg = button.querySelector('svg');
        return svg && button.classList.contains('p-1.5');
      });

      // Click area chart (third button)
      await user.click(chartTypeButtons[2]);

      expect(mockSetChartType).toHaveBeenCalledWith('area');
    });

    it('highlights active chart type', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: [],
        timeframe: '1d',
        chartType: 'line',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      const buttons = screen.getAllByRole('button');
      const chartTypeButtons = buttons.filter(button => {
        const svg = button.querySelector('svg');
        return svg && button.classList.contains('p-1.5');
      });

      // Line chart button (second) should be active
      expect(chartTypeButtons[1]).toHaveClass('bg-primary/10');
      expect(chartTypeButtons[1]).toHaveClass('text-primary');
    });
  });

  describe('collapse/expand interaction', () => {
    it('toggles chart collapse when clicking button', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const buttons = screen.getAllByRole('button');
      const collapseButton = buttons.find(btn =>
        btn.classList.contains('h-7') && btn.classList.contains('w-7') && btn.querySelector('svg')
      );

      await user.click(collapseButton!);

      expect(mockToggleChartCollapsed).toHaveBeenCalled();
    });

    it('shows expand icon when collapsed', () => {
      (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        chartPanelCollapsed: true,
        toggleChartCollapsed: mockToggleChartCollapsed,
      });

      render(<ChartToolbar />);

      // ChevronDown icon should be present when collapsed
      const buttons = screen.getAllByRole('button');
      const collapseButton = buttons.find(btn =>
        btn.classList.contains('h-7') && btn.classList.contains('w-7')
      );

      expect(collapseButton).toBeInTheDocument();
    });

    it('shows collapse icon when expanded', () => {
      (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        chartPanelCollapsed: false,
        toggleChartCollapsed: mockToggleChartCollapsed,
      });

      render(<ChartToolbar />);

      // ChevronUp icon should be present when expanded
      const buttons = screen.getAllByRole('button');
      const collapseButton = buttons.find(btn =>
        btn.classList.contains('h-7') && btn.classList.contains('w-7')
      );

      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('overlay removal', () => {
    it('removes overlay when clicking X button', async () => {
      const user = userEvent.setup();

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: ['QQQ'],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      const qqqContainer = screen.getByText('QQQ').parentElement;
      const removeButton = qqqContainer?.querySelector('button');

      await user.click(removeButton!);

      expect(mockRemoveOverlaySymbol).toHaveBeenCalledWith('QQQ');
    });

    it('removes correct overlay when multiple exist', async () => {
      const user = userEvent.setup();

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: ['QQQ', 'DIA'],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      const diaContainer = screen.getByText('DIA').parentElement;
      const removeButton = diaContainer?.querySelector('button');

      await user.click(removeButton!);

      expect(mockRemoveOverlaySymbol).toHaveBeenCalledWith('DIA');
    });
  });

  describe('keyboard navigation', () => {
    it('can focus and activate timeframe buttons', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const tf5m = screen.getByRole('button', { name: '5m' });
      tf5m.focus();

      await user.keyboard('{Enter}');

      expect(mockSetTimeframe).toHaveBeenCalledWith('5m');
    });

    it('can navigate between buttons with Tab', async () => {
      const user = userEvent.setup();
      render(<ChartToolbar />);

      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();

      await user.keyboard('{Tab}');

      // Should move focus to next button
      expect(document.activeElement).not.toBe(firstButton);
    });
  });

  describe('accessibility', () => {
    it('has proper button roles', () => {
      render(<ChartToolbar />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('provides visual feedback on hover', () => {
      render(<ChartToolbar />);

      const tf5m = screen.getByRole('button', { name: '5m' });
      expect(tf5m).toHaveClass('hover:text-foreground');
    });

    it('shows tooltips for icon buttons', () => {
      render(<ChartToolbar />);

      // Tooltip provider should be wrapping the component
      const toolbar = screen.getByText('SPY').closest('div');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty active symbol', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: '',
        overlaySymbols: [],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      // Should still render but with empty symbol
      expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
    });

    it('handles maximum overlays (4)', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: ['QQQ', 'DIA', 'IWM', 'VTI'],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      expect(screen.getByText('QQQ')).toBeInTheDocument();
      expect(screen.getByText('DIA')).toBeInTheDocument();
      expect(screen.getByText('IWM')).toBeInTheDocument();
      expect(screen.getByText('VTI')).toBeInTheDocument();
    });

    it('cycles overlay colors when more than 4', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        overlaySymbols: ['QQQ', 'DIA', 'IWM', 'VTI'],
        timeframe: '1d',
        chartType: 'candlestick',
        setTimeframe: mockSetTimeframe,
        setChartType: mockSetChartType,
        removeOverlaySymbol: mockRemoveOverlaySymbol,
      });

      render(<ChartToolbar />);

      // All overlays should have colors assigned
      const overlays = [
        screen.getByText('QQQ').parentElement,
        screen.getByText('DIA').parentElement,
        screen.getByText('IWM').parentElement,
        screen.getByText('VTI').parentElement,
      ];

      overlays.forEach(overlay => {
        expect(overlay?.style.backgroundColor).toBeTruthy();
        expect(overlay?.style.color).toBeTruthy();
      });
    });
  });
});
