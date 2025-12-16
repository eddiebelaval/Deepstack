import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IndicatorPanel } from '../IndicatorPanel';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';

// Mock the stores
vi.mock('@/lib/stores/trading-store');
vi.mock('@/lib/stores/market-data-store');

// Mock lightweight-charts
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({
      setData: vi.fn(),
      priceScale: vi.fn(() => ({
        applyOptions: vi.fn(),
      })),
    })),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({
      fitContent: vi.fn(),
    })),
    remove: vi.fn(),
  })),
  LineSeries: {},
  HistogramSeries: {},
  ColorType: {
    Solid: 'solid',
  },
  CrosshairMode: {
    Normal: 0,
  },
}));

// Mock indicator calculations
vi.mock('@/lib/indicators', () => ({
  calculateRSI: vi.fn(() => [
    { time: 1640000000, value: 65.5 },
    { time: 1640010000, value: 70.2 },
  ]),
  calculateMACD: vi.fn(() => [
    { time: 1640000000, macd: 1.5, signal: 1.2, histogram: 0.3 },
    { time: 1640010000, macd: 2.0, signal: 1.8, histogram: 0.2 },
  ]),
}));

describe('IndicatorPanel', () => {
  const mockBars = [
    { time: 1640000000, open: 100, high: 105, low: 99, close: 103, volume: 1000000 },
    { time: 1640010000, open: 103, high: 108, low: 102, close: 107, volume: 1500000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock trading store
    (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeSymbol: 'SPY',
      indicators: [],
    });

    // Mock market data store
    (useMarketDataStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      bars: {
        SPY: mockBars,
      },
    });
  });

  describe('rendering', () => {
    it('renders nothing when indicator not active', () => {
      const { container } = render(<IndicatorPanel type="RSI" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when indicator is active', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);
      expect(container.firstChild).not.toBeNull();
    });

    it('renders nothing when indicator exists but not visible', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: false },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders RSI header with period', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      render(<IndicatorPanel type="RSI" />);
      expect(screen.getByText('RSI(14)')).toBeInTheDocument();
    });

    it('renders MACD header with parameters', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          {
            id: 'macd-1',
            type: 'MACD',
            params: { fast: 12, slow: 26, signal: 9 },
            color: '#22c55e',
            visible: true
          },
        ],
      });

      render(<IndicatorPanel type="MACD" />);
      expect(screen.getByText('MACD(12,26,9)')).toBeInTheDocument();
    });

    it('applies custom height', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" height={200} />);
      const chartContainer = container.querySelector('[style*="height"]');
      expect(chartContainer).toHaveStyle({ height: '200px' });
    });

    it('uses default height when not specified', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);
      const chartContainer = container.querySelector('[style*="height"]');
      expect(chartContainer).toHaveStyle({ height: '120px' });
    });

    it('applies custom className', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('RSI indicator', () => {
    beforeEach(() => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });
    });

    it('renders RSI with custom period', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 20 }, color: '#f59e0b', visible: true },
        ],
      });

      render(<IndicatorPanel type="RSI" />);
      expect(screen.getByText('RSI(20)')).toBeInTheDocument();
    });

    it('shows overbought/oversold levels', () => {
      render(<IndicatorPanel type="RSI" />);

      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('has border at top', () => {
      const { container } = render(<IndicatorPanel type="RSI" />);

      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();
    });
  });

  describe('MACD indicator', () => {
    beforeEach(() => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          {
            id: 'macd-1',
            type: 'MACD',
            params: { fast: 12, slow: 26, signal: 9 },
            color: '#22c55e',
            visible: true
          },
        ],
      });
    });

    it('renders MACD with custom parameters', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          {
            id: 'macd-1',
            type: 'MACD',
            params: { fast: 8, slow: 21, signal: 5 },
            color: '#22c55e',
            visible: true
          },
        ],
      });

      render(<IndicatorPanel type="MACD" />);
      expect(screen.getByText('MACD(8,21,5)')).toBeInTheDocument();
    });

    it('does not show overbought/oversold levels', () => {
      render(<IndicatorPanel type="MACD" />);

      // MACD doesn't have the 70/30 levels that RSI has
      const levelText = screen.queryByText('70');
      expect(levelText).not.toBeInTheDocument();
    });
  });

  describe('data handling', () => {
    it('handles empty bars', () => {
      (useMarketDataStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        bars: {
          SPY: [],
        },
      });

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);
      expect(container.firstChild).not.toBeNull();
    });

    it('handles missing symbol in bars', () => {
      (useMarketDataStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        bars: {},
      });

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);
      expect(container.firstChild).not.toBeNull();
    });

    it('re-renders when bars change', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { rerender } = render(<IndicatorPanel type="RSI" />);

      expect(screen.getByText('RSI(14)')).toBeInTheDocument();

      // Update bars
      (useMarketDataStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        bars: {
          SPY: [
            ...mockBars,
            { time: 1640020000, open: 107, high: 110, low: 106, close: 109, volume: 2000000 },
          ],
        },
      });

      rerender(<IndicatorPanel type="RSI" />);

      expect(screen.getByText('RSI(14)')).toBeInTheDocument();
    });

    it('re-renders when symbol changes', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { rerender } = render(<IndicatorPanel type="RSI" />);

      expect(screen.getByText('RSI(14)')).toBeInTheDocument();

      // Change symbol
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'AAPL',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      (useMarketDataStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        bars: {
          AAPL: mockBars,
        },
      });

      rerender(<IndicatorPanel type="RSI" />);

      expect(screen.getByText('RSI(14)')).toBeInTheDocument();
    });
  });

  describe('parameter handling', () => {
    it('uses default RSI period when not specified', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: {}, color: '#f59e0b', visible: true },
        ],
      });

      render(<IndicatorPanel type="RSI" />);
      expect(screen.getByText('RSI(14)')).toBeInTheDocument();
    });

    it('uses default MACD parameters when not specified', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'macd-1', type: 'MACD', params: {}, color: '#22c55e', visible: true },
        ],
      });

      render(<IndicatorPanel type="MACD" />);
      expect(screen.getByText('MACD(12,26,9)')).toBeInTheDocument();
    });

    it('uses partial MACD parameters', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          {
            id: 'macd-1',
            type: 'MACD',
            params: { fast: 10 },
            color: '#22c55e',
            visible: true
          },
        ],
      });

      render(<IndicatorPanel type="MACD" />);
      expect(screen.getByText('MACD(10,26,9)')).toBeInTheDocument();
    });
  });

  describe('header styling', () => {
    it('has proper header structure', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);

      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).toBeInTheDocument();
    });

    it('has border bottom on header', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);

      const header = container.querySelector('.border-b.border-border');
      expect(header).toBeInTheDocument();
    });

    it('has proper padding on header', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);

      const header = container.querySelector('.px-2.py-1');
      expect(header).toBeInTheDocument();
    });
  });

  describe('chart container', () => {
    it('has full width', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" />);

      const chartContainer = container.querySelector('[style*="width"]');
      expect(chartContainer).toHaveStyle({ width: '100%' });
    });

    it('has specified height', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      const { container } = render(<IndicatorPanel type="RSI" height={150} />);

      const chartContainer = container.querySelector('[style*="height"]');
      expect(chartContainer).toHaveStyle({ height: '150px' });
    });
  });

  describe('edge cases', () => {
    it('handles very large period', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 200 }, color: '#f59e0b', visible: true },
        ],
      });

      render(<IndicatorPanel type="RSI" />);
      expect(screen.getByText('RSI(200)')).toBeInTheDocument();
    });

    it('handles multiple indicators of same type', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
          { id: 'rsi-2', type: 'RSI', params: { period: 20 }, color: '#3b82f6', visible: true },
        ],
      });

      // Should render the first matching indicator
      render(<IndicatorPanel type="RSI" />);
      expect(screen.getByText('RSI(14)')).toBeInTheDocument();
    });

    it('handles indicator with different color', () => {
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#ff0000', visible: true },
        ],
      });

      render(<IndicatorPanel type="RSI" />);
      expect(screen.getByText('RSI(14)')).toBeInTheDocument();
    });
  });

  describe('visibility toggling', () => {
    it('hides when toggled to invisible', () => {
      const { rerender } = render(<IndicatorPanel type="RSI" />);

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      rerender(<IndicatorPanel type="RSI" />);
      expect(screen.getByText('RSI(14)')).toBeInTheDocument();

      // Toggle to invisible
      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: false },
        ],
      });

      rerender(<IndicatorPanel type="RSI" />);
      expect(screen.queryByText('RSI(14)')).not.toBeInTheDocument();
    });

    it('shows when toggled to visible', () => {
      const { rerender } = render(<IndicatorPanel type="RSI" />);

      expect(screen.queryByText('RSI(14)')).not.toBeInTheDocument();

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'SPY',
        indicators: [
          { id: 'rsi-1', type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: true },
        ],
      });

      rerender(<IndicatorPanel type="RSI" />);
      expect(screen.getByText('RSI(14)')).toBeInTheDocument();
    });
  });
});
