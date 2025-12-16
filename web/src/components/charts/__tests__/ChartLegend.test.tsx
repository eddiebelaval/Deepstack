import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartLegend, type ChartLegendData } from '../ChartLegend';

describe('ChartLegend', () => {
  const mockData: ChartLegendData = {
    time: 1640000000,
    open: 450.5,
    high: 455.75,
    low: 449.25,
    close: 454.0,
    volume: 1500000,
  };

  describe('rendering', () => {
    it('renders symbol when no data provided', () => {
      render(<ChartLegend symbol="SPY" data={null} />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('renders symbol with OHLCV data', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('displays all OHLC values', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);

      expect(screen.getByText(/450\.50/)).toBeInTheDocument(); // Open
      expect(screen.getByText(/455\.75/)).toBeInTheDocument(); // High
      expect(screen.getByText(/449\.25/)).toBeInTheDocument(); // Low
      expect(screen.getByText(/454\.00/)).toBeInTheDocument(); // Close
    });

    it('displays volume when provided', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);
      expect(screen.getByText(/1\.5M/)).toBeInTheDocument();
    });

    it('hides volume when not provided', () => {
      const dataWithoutVolume = { ...mockData, volume: undefined };
      render(<ChartLegend symbol="SPY" data={dataWithoutVolume} />);

      expect(screen.queryByText(/Vol/)).not.toBeInTheDocument();
    });

    it('hides volume when zero', () => {
      const dataWithZeroVolume = { ...mockData, volume: 0 };
      render(<ChartLegend symbol="SPY" data={dataWithZeroVolume} />);

      expect(screen.queryByText(/Vol/)).not.toBeInTheDocument();
    });
  });

  describe('price formatting', () => {
    it('formats high prices with 2 decimals', () => {
      const highPrice = {
        ...mockData,
        open: 150.5,
        high: 155.75,
        low: 149.25,
        close: 154.0,
      };

      render(<ChartLegend symbol="SPY" data={highPrice} />);

      expect(screen.getByText(/150\.50/)).toBeInTheDocument();
      expect(screen.getByText(/155\.75/)).toBeInTheDocument();
    });

    it('formats medium prices with 3 decimals', () => {
      const mediumPrice = {
        ...mockData,
        open: 5.5,
        high: 5.75,
        low: 5.25,
        close: 5.4,
      };

      render(<ChartLegend symbol="SPY" data={mediumPrice} />);

      expect(screen.getByText(/5\.500/)).toBeInTheDocument();
      expect(screen.getByText(/5\.750/)).toBeInTheDocument();
    });

    it('formats low prices with 4 decimals', () => {
      const lowPrice = {
        ...mockData,
        open: 0.5,
        high: 0.55,
        low: 0.45,
        close: 0.52,
      };

      render(<ChartLegend symbol="SPY" data={lowPrice} />);

      expect(screen.getByText(/0\.5000/)).toBeInTheDocument();
      expect(screen.getByText(/0\.5500/)).toBeInTheDocument();
    });

    it('formats very low prices with 6 decimals', () => {
      const veryLowPrice = {
        ...mockData,
        open: 0.005,
        high: 0.0055,
        low: 0.0045,
        close: 0.0052,
      };

      render(<ChartLegend symbol="SPY" data={veryLowPrice} />);

      expect(screen.getByText(/0\.005000/)).toBeInTheDocument();
      expect(screen.getByText(/0\.005500/)).toBeInTheDocument();
    });
  });

  describe('volume formatting', () => {
    it('formats billions with B suffix', () => {
      const billionVolume = { ...mockData, volume: 2500000000 };
      render(<ChartLegend symbol="SPY" data={billionVolume} />);

      expect(screen.getByText(/2\.5B/)).toBeInTheDocument();
    });

    it('formats millions with M suffix', () => {
      const millionVolume = { ...mockData, volume: 3500000 };
      render(<ChartLegend symbol="SPY" data={millionVolume} />);

      expect(screen.getByText(/3\.5M/)).toBeInTheDocument();
    });

    it('formats thousands with K suffix', () => {
      const thousandVolume = { ...mockData, volume: 5500 };
      render(<ChartLegend symbol="SPY" data={thousandVolume} />);

      expect(screen.getByText(/5\.5K/)).toBeInTheDocument();
    });

    it('formats small volumes without suffix', () => {
      const smallVolume = { ...mockData, volume: 500 };
      render(<ChartLegend symbol="SPY" data={smallVolume} />);

      expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it('rounds volume to 1 decimal place', () => {
      const volume = { ...mockData, volume: 1234567 };
      render(<ChartLegend symbol="SPY" data={volume} />);

      expect(screen.getByText(/1\.2M/)).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('shows green when close is higher than open', () => {
      const upData = {
        ...mockData,
        open: 100,
        close: 110,
      };

      const { container } = render(<ChartLegend symbol="SPY" data={upData} />);

      // Check for green color classes
      const greenElements = container.querySelectorAll('.text-green-500, .text-green-400');
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it('shows red when close is lower than open', () => {
      const downData = {
        ...mockData,
        open: 110,
        close: 100,
      };

      const { container } = render(<ChartLegend symbol="SPY" data={downData} />);

      // Check for red color classes
      const redElements = container.querySelectorAll('.text-red-500, .text-red-400');
      expect(redElements.length).toBeGreaterThan(0);
    });

    it('shows green when close equals open', () => {
      const flatData = {
        ...mockData,
        open: 100,
        close: 100,
      };

      const { container } = render(<ChartLegend symbol="SPY" data={flatData} />);

      // When equal, it's considered "up" (isUp = close >= open)
      const greenElements = container.querySelectorAll('.text-green-500, .text-green-400');
      expect(greenElements.length).toBeGreaterThan(0);
    });
  });

  describe('percentage change display', () => {
    it('displays positive percentage change', () => {
      const upData = {
        ...mockData,
        close: 110,
      };

      render(<ChartLegend symbol="SPY" data={upData} prevClose={100} />);

      expect(screen.getByText(/\+10\.00%/)).toBeInTheDocument();
    });

    it('displays negative percentage change', () => {
      const downData = {
        ...mockData,
        close: 90,
      };

      render(<ChartLegend symbol="SPY" data={downData} prevClose={100} />);

      expect(screen.getByText(/-10\.00%/)).toBeInTheDocument();
    });

    it('displays zero percentage change', () => {
      const flatData = {
        ...mockData,
        close: 100,
      };

      render(<ChartLegend symbol="SPY" data={flatData} prevClose={100} />);

      expect(screen.getByText(/\+0\.00%/)).toBeInTheDocument();
    });

    it('hides percentage when prevClose not provided', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('hides percentage when prevClose is zero', () => {
      render(<ChartLegend symbol="SPY" data={mockData} prevClose={0} />);

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('formats percentage with 2 decimal places', () => {
      const data = {
        ...mockData,
        close: 100.5,
      };

      render(<ChartLegend symbol="SPY" data={data} prevClose={100} />);

      expect(screen.getByText(/\+0\.50%/)).toBeInTheDocument();
    });

    it('handles small percentage changes', () => {
      const data = {
        ...mockData,
        close: 100.01,
      };

      render(<ChartLegend symbol="SPY" data={data} prevClose={100} />);

      expect(screen.getByText(/\+0\.01%/)).toBeInTheDocument();
    });
  });

  describe('OHLC labels', () => {
    it('displays O label for open', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);
      expect(screen.getByText('O')).toBeInTheDocument();
    });

    it('displays H label for high', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);
      expect(screen.getByText('H')).toBeInTheDocument();
    });

    it('displays L label for low', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('displays C label for close', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('displays Vol label when volume present', () => {
      render(<ChartLegend symbol="SPY" data={mockData} />);
      expect(screen.getByText('Vol')).toBeInTheDocument();
    });
  });

  describe('layout and positioning', () => {
    it('positions legend absolutely at top-left', () => {
      const { container } = render(<ChartLegend symbol="SPY" data={mockData} />);

      const legend = container.firstChild as HTMLElement;
      expect(legend).toHaveClass('absolute');
      expect(legend).toHaveClass('top-3');
      expect(legend).toHaveClass('left-3');
    });

    it('is not interactive (pointer-events-none)', () => {
      const { container } = render(<ChartLegend symbol="SPY" data={mockData} />);

      const legend = container.firstChild as HTMLElement;
      expect(legend).toHaveClass('pointer-events-none');
    });

    it('is not selectable (select-none)', () => {
      const { container } = render(<ChartLegend symbol="SPY" data={mockData} />);

      const legend = container.firstChild as HTMLElement;
      expect(legend).toHaveClass('select-none');
    });

    it('has proper z-index for overlay', () => {
      const { container } = render(<ChartLegend symbol="SPY" data={mockData} />);

      const legend = container.firstChild as HTMLElement;
      expect(legend).toHaveClass('z-20');
    });
  });

  describe('edge cases', () => {
    it('handles very large prices', () => {
      const largePrice = {
        ...mockData,
        open: 999999.99,
        high: 1000000.0,
        low: 999998.0,
        close: 999999.5,
      };

      render(<ChartLegend symbol="SPY" data={largePrice} />);

      expect(screen.getByText(/999999\.99/)).toBeInTheDocument();
    });

    it('handles very small prices', () => {
      const smallPrice = {
        ...mockData,
        open: 0.000001,
        high: 0.000002,
        low: 0.0000005,
        close: 0.0000015,
      };

      render(<ChartLegend symbol="SPY" data={smallPrice} />);

      expect(screen.getByText(/0\.000001/)).toBeInTheDocument();
    });

    it('handles zero prices gracefully', () => {
      const zeroPrice = {
        ...mockData,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
      };

      render(<ChartLegend symbol="SPY" data={zeroPrice} />);

      // Zero price formats to 0.000000 (6 decimals) - there will be multiple (O, H, L, C)
      const zeroValues = screen.getAllByText(/0\.000000/);
      expect(zeroValues.length).toBeGreaterThan(0);
    });

    it('handles negative prices', () => {
      const negativePrice = {
        ...mockData,
        open: -10,
        high: -5,
        low: -15,
        close: -8,
      };

      render(<ChartLegend symbol="SPY" data={negativePrice} />);

      // Should still render (even though negative prices are unusual)
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('handles very large volume', () => {
      const largeVolume = {
        ...mockData,
        volume: 999999999999,
      };

      render(<ChartLegend symbol="SPY" data={largeVolume} />);

      expect(screen.getByText(/B/)).toBeInTheDocument();
    });

    it('handles long symbol names', () => {
      render(<ChartLegend symbol="VERYLONGSYMBOLNAME" data={mockData} />);

      expect(screen.getByText('VERYLONGSYMBOLNAME')).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('has displayName set', () => {
      expect(ChartLegend.displayName).toBe('ChartLegend');
    });

    it('re-renders when data changes', () => {
      const { rerender } = render(<ChartLegend symbol="SPY" data={mockData} />);

      expect(screen.getByText(/454\.00/)).toBeInTheDocument();

      const newData = { ...mockData, close: 460.0 };
      rerender(<ChartLegend symbol="SPY" data={newData} />);

      expect(screen.getByText(/460\.00/)).toBeInTheDocument();
    });

    it('re-renders when symbol changes', () => {
      const { rerender } = render(<ChartLegend symbol="SPY" data={mockData} />);

      expect(screen.getByText('SPY')).toBeInTheDocument();

      rerender(<ChartLegend symbol="QQQ" data={mockData} />);

      expect(screen.getByText('QQQ')).toBeInTheDocument();
      expect(screen.queryByText('SPY')).not.toBeInTheDocument();
    });

    it('re-renders when prevClose changes', () => {
      const { rerender } = render(
        <ChartLegend symbol="SPY" data={mockData} prevClose={400} />
      );

      expect(screen.getByText(/\+13\.50%/)).toBeInTheDocument();

      rerender(<ChartLegend symbol="SPY" data={mockData} prevClose={450} />);

      expect(screen.getByText(/\+0\.89%/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('uses semantic HTML structure', () => {
      const { container } = render(<ChartLegend symbol="SPY" data={mockData} />);

      // Should have div structure with proper nesting
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('uses monospace font for numeric values', () => {
      const { container } = render(<ChartLegend symbol="SPY" data={mockData} />);

      const numericElements = container.querySelectorAll('.font-mono');
      expect(numericElements.length).toBeGreaterThan(0);
    });

    it('uses tabular-nums for aligned numbers', () => {
      const { container } = render(<ChartLegend symbol="SPY" data={mockData} />);

      const tabularElements = container.querySelectorAll('.tabular-nums');
      expect(tabularElements.length).toBeGreaterThan(0);
    });
  });
});
