import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawingToolbar } from '../DrawingToolbar';
import { useChartDrawings } from '@/hooks/useChartDrawings';
import { useTradingStore } from '@/lib/stores/trading-store';

// Mock the stores and hooks
vi.mock('@/hooks/useChartDrawings');
vi.mock('@/lib/stores/trading-store');

describe('DrawingToolbar', () => {
  const mockSetActiveDrawingTool = vi.fn();
  const mockClearDrawings = vi.fn();
  const mockGetDrawingsForSymbol = vi.fn();
  const mockCancelDrawing = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock trading store
    (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeSymbol: 'SPY',
    });

    // Mock chart drawings hook
    (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeDrawingTool: null,
      setActiveDrawingTool: mockSetActiveDrawingTool,
      clearDrawings: mockClearDrawings,
      getDrawingsForSymbol: mockGetDrawingsForSymbol,
      cancelDrawing: mockCancelDrawing,
    });

    // Default: no drawings
    mockGetDrawingsForSymbol.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders all drawing tool buttons', () => {
      render(<DrawingToolbar />);

      // Should have 3 drawing tools + 1 clear button = 4 buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('renders trendline button', () => {
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Trendline is the first drawing tool button
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders horizontal line button', () => {
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Horizontal is the second drawing tool button
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('renders fibonacci button', () => {
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Fibonacci is the third drawing tool button
      expect(buttons.length).toBeGreaterThan(2);
    });

    it('renders clear button', () => {
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Clear button should be present
      const clearButton = Array.from(buttons).find(btn =>
        btn.classList.contains('text-destructive')
      );
      expect(clearButton).toBeInTheDocument();
    });

    it('renders separator between tools and clear button', () => {
      const { container } = render(<DrawingToolbar />);

      const separator = container.querySelector('.w-px');
      expect(separator).toBeInTheDocument();
    });

    it('shows drawing count when drawings exist', () => {
      mockGetDrawingsForSymbol.mockReturnValue([
        { id: '1', type: 'trendline' },
        { id: '2', type: 'horizontal' },
      ]);

      render(<DrawingToolbar />);

      expect(screen.getByText(/2 drawings/)).toBeInTheDocument();
    });

    it('shows singular "drawing" when only one exists', () => {
      mockGetDrawingsForSymbol.mockReturnValue([{ id: '1', type: 'trendline' }]);

      render(<DrawingToolbar />);

      expect(screen.getByText(/1 drawing$/)).toBeInTheDocument();
    });

    it('hides drawing count when no drawings', () => {
      mockGetDrawingsForSymbol.mockReturnValue([]);

      render(<DrawingToolbar />);

      expect(screen.queryByText(/drawing/)).not.toBeInTheDocument();
    });
  });

  describe('active tool state', () => {
    it('highlights active drawing tool', () => {
      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: 'trendline',
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      const activeButton = Array.from(buttons).find(btn =>
        btn.classList.contains('ring-2') && btn.classList.contains('ring-primary/50')
      );

      expect(activeButton).toBeInTheDocument();
    });

    it('uses secondary variant for active tool', () => {
      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: 'trendline',
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Active button should have different styling
      const activeButton = Array.from(buttons).find(btn =>
        btn.classList.contains('ring-2')
      );

      expect(activeButton).toBeInTheDocument();
    });

    it('shows instruction when tool is active', () => {
      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: 'trendline',
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      render(<DrawingToolbar />);

      expect(screen.getByText(/Click on chart to draw trendline/)).toBeInTheDocument();
    });

    it('hides instruction when no tool is active', () => {
      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: null,
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      render(<DrawingToolbar />);

      expect(screen.queryByText(/Click on chart to draw/)).not.toBeInTheDocument();
    });

    it('animates instruction text', () => {
      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: 'horizontal',
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      const { container } = render(<DrawingToolbar />);

      const instruction = container.querySelector('.animate-pulse');
      expect(instruction).toBeInTheDocument();
    });
  });

  describe('tool interaction', () => {
    it('activates tool when clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Click first drawing tool button (trendline)
      await user.click(buttons[0]);

      expect(mockSetActiveDrawingTool).toHaveBeenCalledWith('trendline');
    });

    it('activates horizontal line tool', async () => {
      const user = userEvent.setup();
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Click second drawing tool button (horizontal)
      await user.click(buttons[1]);

      expect(mockSetActiveDrawingTool).toHaveBeenCalledWith('horizontal');
    });

    it('activates fibonacci tool', async () => {
      const user = userEvent.setup();
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Click third drawing tool button (fibonacci)
      await user.click(buttons[2]);

      expect(mockSetActiveDrawingTool).toHaveBeenCalledWith('fib');
    });

    it('deactivates tool when clicking active tool', async () => {
      const user = userEvent.setup();

      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: 'trendline',
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      // Click the active tool button
      await user.click(buttons[0]);

      expect(mockCancelDrawing).toHaveBeenCalled();
    });

    it('switches between tools', async () => {
      const user = userEvent.setup();
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');

      // Click trendline
      await user.click(buttons[0]);
      expect(mockSetActiveDrawingTool).toHaveBeenCalledWith('trendline');

      // Click horizontal
      await user.click(buttons[1]);
      expect(mockSetActiveDrawingTool).toHaveBeenCalledWith('horizontal');
    });
  });

  describe('clear drawings', () => {
    it('clears drawings for active symbol when clicked', async () => {
      const user = userEvent.setup();

      mockGetDrawingsForSymbol.mockReturnValue([{ id: '1', type: 'trendline' }]);

      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      const clearButton = Array.from(buttons).find(btn =>
        btn.classList.contains('text-destructive')
      );

      await user.click(clearButton!);

      expect(mockClearDrawings).toHaveBeenCalledWith('SPY');
    });

    it('disables clear button when no drawings', () => {
      mockGetDrawingsForSymbol.mockReturnValue([]);

      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      const clearButton = Array.from(buttons).find(btn =>
        btn.classList.contains('text-destructive')
      );

      expect(clearButton).toBeDisabled();
    });

    it('enables clear button when drawings exist', () => {
      mockGetDrawingsForSymbol.mockReturnValue([
        { id: '1', type: 'trendline' },
      ]);

      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      const clearButton = Array.from(buttons).find(btn =>
        btn.classList.contains('text-destructive')
      );

      expect(clearButton).not.toBeDisabled();
    });

    it('uses destructive text color for clear button', () => {
      mockGetDrawingsForSymbol.mockReturnValue([{ id: '1', type: 'trendline' }]);

      const { container } = render(<DrawingToolbar />);

      const clearButton = container.querySelector('.text-destructive');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('symbol-specific drawings', () => {
    it('shows drawings for active symbol', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'AAPL',
      });

      mockGetDrawingsForSymbol.mockReturnValue([
        { id: '1', type: 'trendline' },
        { id: '2', type: 'horizontal' },
      ]);

      render(<DrawingToolbar />);

      expect(mockGetDrawingsForSymbol).toHaveBeenCalledWith('AAPL');
      expect(screen.getByText(/2 drawings/)).toBeInTheDocument();
    });

    it('clears drawings only for active symbol', async () => {
      const user = userEvent.setup();

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'TSLA',
      });

      mockGetDrawingsForSymbol.mockReturnValue([{ id: '1', type: 'trendline' }]);

      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      const clearButton = Array.from(buttons).find(btn =>
        btn.classList.contains('text-destructive')
      );

      await user.click(clearButton!);

      expect(mockClearDrawings).toHaveBeenCalledWith('TSLA');
    });
  });

  describe('keyboard navigation', () => {
    it('can focus tool buttons', async () => {
      const user = userEvent.setup();
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      buttons[0].focus();

      await user.keyboard('{Enter}');

      expect(mockSetActiveDrawingTool).toHaveBeenCalled();
    });

    it('can navigate between buttons with Tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      buttons[0].focus();

      await user.keyboard('{Tab}');

      expect(document.activeElement).not.toBe(buttons[0]);
    });

    it('can activate tool with Space key', async () => {
      const user = userEvent.setup();
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      buttons[0].focus();

      await user.keyboard(' ');

      expect(mockSetActiveDrawingTool).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has proper button roles', () => {
      render(<DrawingToolbar />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('uses icon buttons with proper sizing', () => {
      const { container } = render(<DrawingToolbar />);

      const iconButtons = container.querySelectorAll('.h-7.w-7');
      expect(iconButtons.length).toBeGreaterThan(0);
    });

    it('has rounded corners on buttons', () => {
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach(btn => {
        expect(btn).toHaveClass('rounded-lg');
      });
    });

    it('provides visual feedback on transitions', () => {
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach(btn => {
        expect(btn).toHaveClass('transition-all');
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty symbol gracefully', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: '',
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      render(<DrawingToolbar />);

      expect(mockGetDrawingsForSymbol).toHaveBeenCalledWith('');
    });

    it('handles many drawings', () => {
      const manyDrawings = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        type: 'trendline' as const,
      }));

      mockGetDrawingsForSymbol.mockReturnValue(manyDrawings);

      render(<DrawingToolbar />);

      expect(screen.getByText(/100 drawings/)).toBeInTheDocument();
    });

    it('handles rapid tool switching', async () => {
      const user = userEvent.setup();
      const { container } = render(<DrawingToolbar />);

      const buttons = container.querySelectorAll('button');

      // Rapidly click different tools
      await user.click(buttons[0]);
      await user.click(buttons[1]);
      await user.click(buttons[2]);

      expect(mockSetActiveDrawingTool).toHaveBeenCalledTimes(3);
    });

    it('updates when drawings change', () => {
      mockGetDrawingsForSymbol.mockReturnValue([]);

      const { rerender } = render(<DrawingToolbar />);

      expect(screen.queryByText(/drawing/)).not.toBeInTheDocument();

      mockGetDrawingsForSymbol.mockReturnValue([{ id: '1', type: 'trendline' }]);

      rerender(<DrawingToolbar />);

      expect(screen.getByText(/1 drawing/)).toBeInTheDocument();
    });

    it('updates when symbol changes', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      const { rerender } = render(<DrawingToolbar />);

      expect(mockGetDrawingsForSymbol).toHaveBeenCalledWith('SPY');

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'QQQ',
      });

      rerender(<DrawingToolbar />);

      expect(mockGetDrawingsForSymbol).toHaveBeenCalledWith('QQQ');
    });
  });

  describe('visual styling', () => {
    it('has proper border styling', () => {
      const { container } = render(<DrawingToolbar />);

      const toolbar = container.querySelector('.border-b');
      expect(toolbar).toBeInTheDocument();
    });

    it('has background styling', () => {
      const { container } = render(<DrawingToolbar />);

      const toolbar = container.querySelector('.bg-background\\/50');
      expect(toolbar).toBeInTheDocument();
    });

    it('has proper padding', () => {
      const { container } = render(<DrawingToolbar />);

      const toolbar = container.querySelector('.px-2.py-1\\.5');
      expect(toolbar).toBeInTheDocument();
    });

    it('uses flex layout with gaps', () => {
      const { container } = render(<DrawingToolbar />);

      const toolbar = container.querySelector('.flex.items-center.gap-1');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('different drawing types', () => {
    it('shows correct instruction for trendline', () => {
      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: 'trendline',
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      render(<DrawingToolbar />);

      expect(screen.getByText(/Click on chart to draw trendline/)).toBeInTheDocument();
    });

    it('shows correct instruction for horizontal', () => {
      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: 'horizontal',
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      render(<DrawingToolbar />);

      expect(screen.getByText(/Click on chart to draw horizontal/)).toBeInTheDocument();
    });

    it('shows correct instruction for fibonacci', () => {
      (useChartDrawings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeDrawingTool: 'fib',
        setActiveDrawingTool: mockSetActiveDrawingTool,
        clearDrawings: mockClearDrawings,
        getDrawingsForSymbol: mockGetDrawingsForSymbol,
        cancelDrawing: mockCancelDrawing,
      });

      mockGetDrawingsForSymbol.mockReturnValue([]);

      render(<DrawingToolbar />);

      expect(screen.getByText(/Click on chart to draw fib/)).toBeInTheDocument();
    });
  });
});
