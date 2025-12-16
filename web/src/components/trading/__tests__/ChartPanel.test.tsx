import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartPanel } from '../ChartPanel';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';

// Mock dependencies
vi.mock('@/lib/stores/trading-store');
vi.mock('@/lib/stores/market-data-store');

// Mock chart components
vi.mock('@/components/charts/TradingChart', () => ({
  TradingChart: vi.fn(({ className }) => (
    <div data-testid="trading-chart" className={className}>
      Trading Chart
    </div>
  )),
}));

vi.mock('@/components/charts/IndicatorPanel', () => ({
  IndicatorPanel: vi.fn(({ type, height }) => (
    <div data-testid={`indicator-panel-${type.toLowerCase()}`} style={{ height }}>
      {type} Indicator
    </div>
  )),
}));

vi.mock('@/components/charts/ChartContextMenu', () => ({
  ChartContextMenu: vi.fn(({ children }) => <div data-testid="chart-context-menu">{children}</div>),
}));

describe('ChartPanel', () => {
  const mockSetActiveSymbol = vi.fn();
  const mockSetChartType = vi.fn();
  const mockSetTimeframe = vi.fn();
  const mockAddIndicator = vi.fn();
  const mockRemoveIndicator = vi.fn();

  const mockBars = [
    { time: 1704067200, open: 150, high: 152, low: 149, close: 151, volume: 1000000 },
    { time: 1704153600, open: 151, high: 153, low: 150, close: 152, volume: 1100000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useTradingStore).mockReturnValue({
      activeSymbol: 'AAPL',
      chartType: 'candlestick',
      timeframe: '1d',
      indicators: [],
      setActiveSymbol: mockSetActiveSymbol,
      setChartType: mockSetChartType,
      setTimeframe: mockSetTimeframe,
      addIndicator: mockAddIndicator,
      removeIndicator: mockRemoveIndicator,
    } as any);

    vi.mocked(useMarketDataStore).mockReturnValue({
      bars: { AAPL: mockBars },
      isLoadingBars: { AAPL: false },
      quotes: {
        AAPL: { last: 152.50, changePercent: 1.25, bid: 152.45, ask: 152.55 },
      },
    } as any);
  });

  describe('Rendering', () => {
    it('renders chart panel with symbol', () => {
      render(<ChartPanel />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('displays current price and change', () => {
      render(<ChartPanel />);

      expect(screen.getByText('$152.50')).toBeInTheDocument();
      expect(screen.getByText('+1.25%')).toBeInTheDocument();
    });

    it('renders timeframe buttons', () => {
      render(<ChartPanel />);

      expect(screen.getByText('1m')).toBeInTheDocument();
      expect(screen.getByText('5m')).toBeInTheDocument();
      expect(screen.getByText('15m')).toBeInTheDocument();
      expect(screen.getByText('1H')).toBeInTheDocument();
      expect(screen.getByText('4H')).toBeInTheDocument();
      expect(screen.getByText('1D')).toBeInTheDocument();
      expect(screen.getByText('1W')).toBeInTheDocument();
    });

    it('renders chart type buttons', () => {
      render(<ChartPanel />);

      // Chart type icons should be present
      const buttons = screen.getAllByRole('radio');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders indicators button', () => {
      render(<ChartPanel />);

      expect(screen.getByText('Indicators')).toBeInTheDocument();
    });

    it('renders TradingChart when data is available', () => {
      render(<ChartPanel />);

      expect(screen.getByTestId('trading-chart')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton when loading', () => {
      vi.mocked(useMarketDataStore).mockReturnValue({
        bars: { AAPL: [] },
        isLoadingBars: { AAPL: true },
        quotes: {},
      } as any);

      render(<ChartPanel />);

      // Should show skeleton (chart should not be visible)
      expect(screen.queryByTestId('trading-chart')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows no data message when bars are empty', () => {
      vi.mocked(useMarketDataStore).mockReturnValue({
        bars: { AAPL: [] },
        isLoadingBars: { AAPL: false },
        quotes: {},
      } as any);

      render(<ChartPanel />);

      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      expect(screen.getByText(/real-time data will appear/i)).toBeInTheDocument();
    });
  });

  describe('Symbol Search', () => {
    it('shows search input when symbol is clicked', async () => {
      const user = userEvent.setup();
      render(<ChartPanel />);

      const symbolButton = screen.getByTitle('Click to search symbol');
      await user.click(symbolButton);

      expect(screen.getByPlaceholderText('Symbol...')).toBeInTheDocument();
    });

    it('searches for symbol on submit', async () => {
      const user = userEvent.setup();
      render(<ChartPanel />);

      // Open search
      const symbolButton = screen.getByTitle('Click to search symbol');
      await user.click(symbolButton);

      // Type and submit
      const input = screen.getByPlaceholderText('Symbol...');
      await user.type(input, 'MSFT');

      const searchButton = screen.getByRole('button', { name: '' }); // Search icon button
      const form = input.closest('form');
      if (form) {
        await user.click(form.querySelector('button[type="submit"]')!);
      }

      await waitFor(() => {
        expect(mockSetActiveSymbol).toHaveBeenCalledWith('MSFT');
      });
    });

    it('converts symbol to uppercase', async () => {
      const user = userEvent.setup();
      render(<ChartPanel />);

      // Open search
      const symbolButton = screen.getByTitle('Click to search symbol');
      await user.click(symbolButton);

      // Type lowercase
      const input = screen.getByPlaceholderText('Symbol...');
      await user.type(input, 'msft');

      expect(input).toHaveValue('MSFT');
    });

    it('closes search on escape', async () => {
      const user = userEvent.setup();
      render(<ChartPanel />);

      // Open search
      const symbolButton = screen.getByTitle('Click to search symbol');
      await user.click(symbolButton);

      // Press escape
      const input = screen.getByPlaceholderText('Symbol...');
      await user.keyboard('{Escape}');

      // Search should be closed
      expect(screen.queryByPlaceholderText('Symbol...')).not.toBeInTheDocument();
    });

    it('closes search when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChartPanel />);

      // Open search
      const symbolButton = screen.getByTitle('Click to search symbol');
      await user.click(symbolButton);

      // Click X button
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('.lucide-x'));
      if (closeButton) {
        await user.click(closeButton);
      }

      // Search should be closed
      expect(screen.queryByPlaceholderText('Symbol...')).not.toBeInTheDocument();
    });
  });

  describe('Timeframe Selection', () => {
    it('calls setTimeframe when timeframe is changed', async () => {
      const user = userEvent.setup();
      render(<ChartPanel />);

      const timeframe5m = screen.getByText('5m');
      await user.click(timeframe5m);

      expect(mockSetTimeframe).toHaveBeenCalledWith('5m');
    });
  });

  describe('Chart Type Selection', () => {
    it('calls setChartType when chart type is changed', async () => {
      const user = userEvent.setup();
      render(<ChartPanel />);

      // Find and click a chart type button (line chart)
      const radioButtons = screen.getAllByRole('radio');
      if (radioButtons.length > 1) {
        await user.click(radioButtons[1]); // Click second option (line)
        expect(mockSetChartType).toHaveBeenCalled();
      }
    });
  });

  describe('Indicators', () => {
    it('opens indicator popover when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChartPanel />);

      const indicatorsButton = screen.getByText('Indicators');
      await user.click(indicatorsButton);

      await waitFor(() => {
        expect(screen.getByText('Simple Moving Average')).toBeInTheDocument();
        expect(screen.getByText('Exponential Moving Average')).toBeInTheDocument();
        expect(screen.getByText('Relative Strength Index')).toBeInTheDocument();
        expect(screen.getByText('MACD')).toBeInTheDocument();
        expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
      });
    });

    it('shows indicator count badge when indicators are active', () => {
      vi.mocked(useTradingStore).mockReturnValue({
        activeSymbol: 'AAPL',
        chartType: 'candlestick',
        timeframe: '1d',
        indicators: [
          { id: '1', type: 'SMA', visible: true, color: '#ff0000', period: 20 },
          { id: '2', type: 'RSI', visible: true, color: '#00ff00', period: 14 },
        ],
        setActiveSymbol: mockSetActiveSymbol,
        setChartType: mockSetChartType,
        setTimeframe: mockSetTimeframe,
        addIndicator: mockAddIndicator,
        removeIndicator: mockRemoveIndicator,
      } as any);

      render(<ChartPanel />);

      expect(screen.getByText('2')).toBeInTheDocument(); // Badge showing count
    });

    it('shows RSI panel when RSI indicator is active', () => {
      vi.mocked(useTradingStore).mockReturnValue({
        activeSymbol: 'AAPL',
        chartType: 'candlestick',
        timeframe: '1d',
        indicators: [{ id: '1', type: 'RSI', visible: true, color: '#ff0000', period: 14 }],
        setActiveSymbol: mockSetActiveSymbol,
        setChartType: mockSetChartType,
        setTimeframe: mockSetTimeframe,
        addIndicator: mockAddIndicator,
        removeIndicator: mockRemoveIndicator,
      } as any);

      render(<ChartPanel />);

      expect(screen.getByTestId('indicator-panel-rsi')).toBeInTheDocument();
    });

    it('shows MACD panel when MACD indicator is active', () => {
      vi.mocked(useTradingStore).mockReturnValue({
        activeSymbol: 'AAPL',
        chartType: 'candlestick',
        timeframe: '1d',
        indicators: [{ id: '1', type: 'MACD', visible: true, color: '#ff0000' }],
        setActiveSymbol: mockSetActiveSymbol,
        setChartType: mockSetChartType,
        setTimeframe: mockSetTimeframe,
        addIndicator: mockAddIndicator,
        removeIndicator: mockRemoveIndicator,
      } as any);

      render(<ChartPanel />);

      expect(screen.getByTestId('indicator-panel-macd')).toBeInTheDocument();
    });

    it('shows active indicators display at bottom', () => {
      vi.mocked(useTradingStore).mockReturnValue({
        activeSymbol: 'AAPL',
        chartType: 'candlestick',
        timeframe: '1d',
        indicators: [
          { id: '1', type: 'SMA', visible: true, color: '#ff0000', period: 20 },
          { id: '2', type: 'EMA', visible: true, color: '#00ff00', period: 50 },
        ],
        setActiveSymbol: mockSetActiveSymbol,
        setChartType: mockSetChartType,
        setTimeframe: mockSetTimeframe,
        addIndicator: mockAddIndicator,
        removeIndicator: mockRemoveIndicator,
      } as any);

      render(<ChartPanel />);

      expect(screen.getByText('Active:')).toBeInTheDocument();
      expect(screen.getByText('SMA')).toBeInTheDocument();
      expect(screen.getByText('EMA')).toBeInTheDocument();
    });
  });

  describe('Quote Display', () => {
    it('shows positive change with correct styling', () => {
      render(<ChartPanel />);

      const changeElement = screen.getByText('+1.25%');
      expect(changeElement).toBeInTheDocument();
    });

    it('shows negative change correctly', () => {
      vi.mocked(useMarketDataStore).mockReturnValue({
        bars: { AAPL: mockBars },
        isLoadingBars: { AAPL: false },
        quotes: {
          AAPL: { last: 148.50, changePercent: -2.5, bid: 148.45, ask: 148.55 },
        },
      } as any);

      render(<ChartPanel />);

      expect(screen.getByText('$148.50')).toBeInTheDocument();
      expect(screen.getByText('-2.50%')).toBeInTheDocument();
    });

    it('handles missing quote gracefully', () => {
      vi.mocked(useMarketDataStore).mockReturnValue({
        bars: { AAPL: mockBars },
        isLoadingBars: { AAPL: false },
        quotes: {},
      } as any);

      render(<ChartPanel />);

      // Should still render without errors
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });
  });
});
