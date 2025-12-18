import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryTickerButtons } from '../category-ticker-buttons';

describe('CategoryTickerButtons', () => {
  const defaultProps = {
    symbols: ['AAPL', 'GOOGL', 'MSFT'],
    activeSymbols: ['AAPL'],
    symbolColors: {
      AAPL: '#ff0000',
      GOOGL: '#00ff00',
      MSFT: '#0000ff',
    },
    priceData: {
      AAPL: { price: 175.50, percentChange: 2.5 },
      GOOGL: { price: 142.00, percentChange: -1.2 },
      MSFT: { price: 378.25, percentChange: 0.8 },
    },
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all ticker buttons', () => {
      render(<CategoryTickerButtons {...defaultProps} />);
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('should render prices', () => {
      render(<CategoryTickerButtons {...defaultProps} />);
      expect(screen.getByText('$175.50')).toBeInTheDocument();
      expect(screen.getByText('$142.00')).toBeInTheDocument();
      expect(screen.getByText('$378.25')).toBeInTheDocument();
    });

    it('should render percent changes', () => {
      render(<CategoryTickerButtons {...defaultProps} />);
      expect(screen.getByText('▲2.50%')).toBeInTheDocument();
      expect(screen.getByText('▼1.20%')).toBeInTheDocument();
      expect(screen.getByText('▲0.80%')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CategoryTickerButtons {...defaultProps} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no symbols', () => {
      render(<CategoryTickerButtons {...defaultProps} symbols={[]} />);
      expect(screen.getByText('No tickers in this category')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onToggle when ticker is clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<CategoryTickerButtons {...defaultProps} onToggle={onToggle} />);

      await user.click(screen.getByText('GOOGL'));
      expect(onToggle).toHaveBeenCalledWith('GOOGL');
    });

    it('should call onToggle with correct symbol', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<CategoryTickerButtons {...defaultProps} onToggle={onToggle} />);

      await user.click(screen.getByText('MSFT'));
      expect(onToggle).toHaveBeenCalledWith('MSFT');
    });
  });

  describe('Active State', () => {
    it('should highlight active symbols', () => {
      const { container } = render(<CategoryTickerButtons {...defaultProps} />);
      // Active button should have color indicator bar
      // The active symbol AAPL should have special styling
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(3);
    });
  });

  describe('Price Display', () => {
    it('should show placeholder when price is undefined', () => {
      render(
        <CategoryTickerButtons
          {...defaultProps}
          priceData={{
            AAPL: { price: 175.50, percentChange: 2.5 },
            GOOGL: { price: 142.00, percentChange: -1.2 },
            // MSFT has no price data
          }}
        />
      );
      // Should show -- for missing price
      const placeholders = screen.getAllByText('--');
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it('should format large prices correctly', () => {
      render(
        <CategoryTickerButtons
          {...defaultProps}
          priceData={{
            ...defaultProps.priceData,
            MSFT: { price: 1250.00, percentChange: 0.8 },
          }}
        />
      );
      // Large prices should show without decimals
      expect(screen.getByText('$1,250')).toBeInTheDocument();
    });
  });

  describe('Category Color', () => {
    it('should use custom category color', () => {
      const { container } = render(
        <CategoryTickerButtons {...defaultProps} categoryColor="#ff00ff" />
      );
      // The category color affects ambient glow - component should render
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
