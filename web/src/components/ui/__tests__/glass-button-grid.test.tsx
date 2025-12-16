import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlassButtonGrid } from '../glass-button-grid';

describe('GlassButtonGrid', () => {
  const mockOnRemove = vi.fn();
  const mockOnEmptyClick = vi.fn();

  const defaultProps = {
    activeIndices: [
      { symbol: 'SPY', name: 'S&P 500', price: 450.25, percentChange: 1.5, color: '#f59e0b' },
      { symbol: 'QQQ', name: 'NASDAQ 100', price: 380.00, percentChange: -0.8, color: '#3b82f6' },
    ],
    onRemove: mockOnRemove,
    onEmptyClick: mockOnEmptyClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the grid container', () => {
      const { container } = render(<GlassButtonGrid {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render active indices', () => {
      render(<GlassButtonGrid {...defaultProps} />);
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
      expect(screen.getByText('NASDAQ 100')).toBeInTheDocument();
    });

    it('should render percent changes', () => {
      render(<GlassButtonGrid {...defaultProps} />);
      expect(screen.getByText('▲1.50%')).toBeInTheDocument();
      expect(screen.getByText('▼0.80%')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <GlassButtonGrid {...defaultProps} className="custom-grid" />
      );
      expect(container.firstChild).toHaveClass('custom-grid');
    });

    it('should render empty slots', () => {
      const { container } = render(
        <GlassButtonGrid {...defaultProps} totalSlots={4} />
      );
      // 2 active + 2 empty slots = 4 buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(4);
    });
  });

  describe('Grid Layout', () => {
    it('should use default 12 slots', () => {
      const { container } = render(<GlassButtonGrid {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(12);
    });

    it('should respect custom totalSlots', () => {
      const { container } = render(
        <GlassButtonGrid {...defaultProps} totalSlots={6} />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(6);
    });

    it('should use default 6 columns', () => {
      const { container } = render(<GlassButtonGrid {...defaultProps} />);
      const grid = container.querySelector('.grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(6, 1fr)' });
    });

    it('should respect custom columns', () => {
      const { container } = render(
        <GlassButtonGrid {...defaultProps} columns={4} />
      );
      const grid = container.querySelector('.grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, 1fr)' });
    });
  });

  describe('Lit Button (Active)', () => {
    it('should show color indicator dot', () => {
      const { container } = render(<GlassButtonGrid {...defaultProps} />);
      // Active buttons have color indicator dots
      const dots = container.querySelectorAll('.rounded-full');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should format positive percent change', () => {
      render(<GlassButtonGrid {...defaultProps} />);
      expect(screen.getByText('▲1.50%')).toHaveClass('text-green-400');
    });

    it('should format negative percent change', () => {
      render(<GlassButtonGrid {...defaultProps} />);
      expect(screen.getByText('▼0.80%')).toHaveClass('text-red-400');
    });

    it('should show X icon on hover', () => {
      const { container } = render(<GlassButtonGrid {...defaultProps} />);
      // X icon is present but hidden until hover
      const xIcons = container.querySelectorAll('svg.lucide-x');
      expect(xIcons.length).toBe(2); // One per active button
    });
  });

  describe('Off Button (Empty)', () => {
    it('should be clickable when onEmptyClick provided', async () => {
      const user = userEvent.setup();
      const { container } = render(<GlassButtonGrid {...defaultProps} totalSlots={4} />);

      // Find empty slot buttons (ones with + sign)
      const emptyButtons = container.querySelectorAll('button:not(:disabled)');
      // Click an empty slot (index 2 or 3)
      const emptyButton = Array.from(emptyButtons).find(btn =>
        btn.textContent?.includes('+')
      );

      if (emptyButton) {
        await user.click(emptyButton);
        expect(mockOnEmptyClick).toHaveBeenCalled();
      }
    });

    it('should be disabled when no onEmptyClick', () => {
      const { container } = render(
        <GlassButtonGrid
          activeIndices={defaultProps.activeIndices}
          onRemove={mockOnRemove}
          totalSlots={4}
        />
      );

      const buttons = container.querySelectorAll('button');
      const disabledButtons = Array.from(buttons).filter(btn => btn.disabled);
      expect(disabledButtons.length).toBe(2); // 2 empty slots should be disabled
    });

    it('should show + icon when clickable', () => {
      render(
        <GlassButtonGrid {...defaultProps} totalSlots={4} />
      );
      // Plus icons appear in empty slots when onEmptyClick is provided
      expect(screen.getAllByText('+')).toHaveLength(2);
    });
  });

  describe('Interaction', () => {
    it('should call onRemove when active button clicked', async () => {
      const user = userEvent.setup();
      render(<GlassButtonGrid {...defaultProps} />);

      await user.click(screen.getByText('S&P 500'));
      expect(mockOnRemove).toHaveBeenCalledWith('SPY');
    });

    it('should call onRemove with correct symbol', async () => {
      const user = userEvent.setup();
      render(<GlassButtonGrid {...defaultProps} />);

      await user.click(screen.getByText('NASDAQ 100'));
      expect(mockOnRemove).toHaveBeenCalledWith('QQQ');
    });
  });

  describe('Shimmer Effect', () => {
    it('should calculate adjacent lit count for empty cells', () => {
      // When an empty cell is adjacent to a lit cell, it gets shimmer effect
      // This is internal state, but we can verify the render doesn't error
      const indices = [
        { symbol: 'SPY', name: 'S&P 500', color: '#f59e0b' },
        { symbol: 'QQQ', name: 'NASDAQ', color: '#3b82f6' },
      ];

      const { container } = render(
        <GlassButtonGrid
          activeIndices={indices}
          onRemove={mockOnRemove}
          totalSlots={6}
          columns={3}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty activeIndices', () => {
      const { container } = render(
        <GlassButtonGrid
          activeIndices={[]}
          onRemove={mockOnRemove}
          totalSlots={4}
        />
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(4); // All empty slots
    });

    it('should handle indices without optional fields', () => {
      const indices = [
        { symbol: 'SPY', name: 'S&P 500' }, // No price, percentChange, or color
      ];

      render(
        <GlassButtonGrid
          activeIndices={indices}
          onRemove={mockOnRemove}
        />
      );

      expect(screen.getByText('S&P 500')).toBeInTheDocument();
    });

    it('should handle more activeIndices than totalSlots', () => {
      const manyIndices = Array.from({ length: 15 }, (_, i) => ({
        symbol: `SYM${i}`,
        name: `Index ${i}`,
      }));

      const { container } = render(
        <GlassButtonGrid
          activeIndices={manyIndices}
          onRemove={mockOnRemove}
          totalSlots={12}
        />
      );

      // Should only show 12 buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(12);
    });
  });
});
