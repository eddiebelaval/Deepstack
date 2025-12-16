import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MiniChartWidget } from '../MiniChartWidget';
import { useMarketDataStore } from '@/lib/stores/market-data-store';

// Mock market data store
vi.mock('@/lib/stores/market-data-store');

describe('MiniChartWidget', () => {
  const mockBars = [
    { close: 100 },
    { close: 101 },
    { close: 102 },
    { close: 101.5 },
    { close: 103 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useMarketDataStore as any).mockReturnValue({
      quotes: {
        SPY: { last: 450.25, changePercent: 1.25 },
        AAPL: { last: 175.50, changePercent: -0.75 },
      },
      getBars: vi.fn((symbol) => {
        if (symbol === 'SPY') return mockBars;
        return [];
      }),
    });
  });

  describe('Rendering', () => {
    it('should render the widget with symbol', () => {
      render(<MiniChartWidget symbol="SPY" />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('should render current price', () => {
      render(<MiniChartWidget symbol="SPY" />);
      expect(screen.getByText('$450.25')).toBeInTheDocument();
    });

    it('should render positive change percentage', () => {
      render(<MiniChartWidget symbol="SPY" />);
      expect(screen.getByText('+1.25%')).toBeInTheDocument();
    });

    it('should render negative change percentage', () => {
      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: { last: 450.25, changePercent: -1.25 },
        },
        getBars: vi.fn(() => mockBars),
      });

      render(<MiniChartWidget symbol="SPY" />);
      expect(screen.getByText('-1.25%')).toBeInTheDocument();
    });

    it('should default to SPY symbol', () => {
      render(<MiniChartWidget />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });
  });

  describe('Sparkline Chart', () => {
    it('should render SVG sparkline when data exists', () => {
      const { container } = render(<MiniChartWidget symbol="SPY" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render path element in SVG', () => {
      const { container } = render(<MiniChartWidget symbol="SPY" />);
      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
    });

    it('should show "No data" when no bars available', () => {
      (useMarketDataStore as any).mockReturnValue({
        quotes: { SPY: { last: 450.25, changePercent: 1.25 } },
        getBars: vi.fn(() => []),
      });

      render(<MiniChartWidget symbol="SPY" />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use green color for positive change', () => {
      const { container } = render(<MiniChartWidget symbol="SPY" />);
      const profitElements = container.querySelectorAll('.text-profit');
      expect(profitElements.length).toBeGreaterThan(0);
    });

    it('should use red color for negative change', () => {
      (useMarketDataStore as any).mockReturnValue({
        quotes: { SPY: { last: 450.25, changePercent: -1.25 } },
        getBars: vi.fn(() => mockBars),
      });

      const { container } = render(<MiniChartWidget symbol="SPY" />);
      const lossElements = container.querySelectorAll('.text-loss');
      expect(lossElements.length).toBeGreaterThan(0);
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MiniChartWidget symbol="SPY" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Missing Quote Data', () => {
    it('should handle missing quote gracefully', () => {
      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
        getBars: vi.fn(() => mockBars),
      });

      render(<MiniChartWidget symbol="UNKNOWN" />);
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('+0.00%')).toBeInTheDocument();
    });
  });
});
