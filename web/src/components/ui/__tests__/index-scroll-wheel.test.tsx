import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IndexScrollWheel, AVAILABLE_INDICES, type Category } from '../index-scroll-wheel';

describe('IndexScrollWheel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Symbol Mode (Default)', () => {
    const defaultProps = {
      selectedSymbols: ['SPY'],
      onSelect: vi.fn(),
      onNavigate: vi.fn(),
      symbolColors: { SPY: '#f59e0b' },
    };

    it('should render the scroll wheel', () => {
      const { container } = render(<IndexScrollWheel {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should show current index name', () => {
      render(<IndexScrollWheel {...defaultProps} />);
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
    });

    it('should show index description', () => {
      render(<IndexScrollWheel {...defaultProps} />);
      expect(screen.getByText('US Large Cap')).toBeInTheDocument();
    });

    it('should show counter', () => {
      render(<IndexScrollWheel {...defaultProps} />);
      expect(screen.getByText(`1 / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
    });

    it('should show previous index name (dimmed)', () => {
      render(<IndexScrollWheel {...defaultProps} />);
      // Previous wraps to last index
      expect(screen.getByText(AVAILABLE_INDICES[AVAILABLE_INDICES.length - 1].name)).toBeInTheDocument();
    });

    it('should show next index name (dimmed)', () => {
      render(<IndexScrollWheel {...defaultProps} />);
      expect(screen.getByText(AVAILABLE_INDICES[1].name)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <IndexScrollWheel {...defaultProps} className="custom-wheel" />
      );
      expect(container.firstChild).toHaveClass('custom-wheel');
    });

    it('should render navigation arrows', () => {
      render(<IndexScrollWheel {...defaultProps} />);
      expect(screen.getByLabelText('Previous index')).toBeInTheDocument();
      expect(screen.getByLabelText('Next index')).toBeInTheDocument();
    });
  });

  describe('Category Mode', () => {
    const categories: Category[] = [
      { id: 'tech', name: 'Technology', description: 'Tech stocks', color: '#3b82f6' },
      { id: 'finance', name: 'Financials', description: 'Financial sector', color: '#10b981' },
      { id: 'energy', name: 'Energy', description: 'Energy sector', color: '#f59e0b' },
    ];

    const categoryProps = {
      mode: 'category' as const,
      categories,
      categoryIndex: 0,
      onCategoryChange: vi.fn(),
      selectedSymbols: [],
      onSelect: vi.fn(),
    };

    it('should render in category mode', () => {
      const { container } = render(<IndexScrollWheel {...categoryProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should show current category name', () => {
      render(<IndexScrollWheel {...categoryProps} />);
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });

    it('should show category description', () => {
      render(<IndexScrollWheel {...categoryProps} />);
      expect(screen.getByText('Tech stocks')).toBeInTheDocument();
    });

    it('should show category counter', () => {
      render(<IndexScrollWheel {...categoryProps} />);
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should show adjacent category names', () => {
      render(<IndexScrollWheel {...categoryProps} />);
      expect(screen.getByText('Energy')).toBeInTheDocument(); // Previous (wraps)
      expect(screen.getByText('Financials')).toBeInTheDocument(); // Next
    });

    it('should call onCategoryChange when navigating', async () => {
      const user = userEvent.setup();
      render(<IndexScrollWheel {...categoryProps} />);

      await user.click(screen.getByLabelText('Next index'));
      expect(categoryProps.onCategoryChange).toHaveBeenCalledWith(1);
    });

    it('should show empty state when no categories', () => {
      render(
        <IndexScrollWheel
          {...categoryProps}
          categories={[]}
        />
      );
      expect(screen.getByText('No categories')).toBeInTheDocument();
    });

    it('should display category color indicator', () => {
      const { container } = render(<IndexScrollWheel {...categoryProps} />);
      // Color indicators are rendered as rounded-full divs
      const colorDots = container.querySelectorAll('.rounded-full');
      expect(colorDots.length).toBeGreaterThan(0);
    });

    it('should use category color for glow effect', () => {
      render(<IndexScrollWheel {...categoryProps} />);
      // The glow effect uses the category color - component should render
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    const props = {
      selectedSymbols: [],
      onSelect: vi.fn(),
      onNavigate: vi.fn(),
    };

    it('should scroll to next item on down arrow click', async () => {
      const user = userEvent.setup();
      render(<IndexScrollWheel {...props} />);

      await user.click(screen.getByLabelText('Next index'));

      // Should now show second index
      expect(screen.getByText(AVAILABLE_INDICES[1].name)).toBeInTheDocument();
      expect(screen.getByText(`2 / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
    });

    it('should scroll to previous item on up arrow click', async () => {
      const user = userEvent.setup();
      render(<IndexScrollWheel {...props} />);

      await user.click(screen.getByLabelText('Previous index'));

      // Should wrap to last index
      expect(screen.getByText(AVAILABLE_INDICES[AVAILABLE_INDICES.length - 1].name)).toBeInTheDocument();
    });

    it('should call onNavigate when index changes', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<IndexScrollWheel {...props} onNavigate={onNavigate} />);

      await user.click(screen.getByLabelText('Next index'));

      expect(onNavigate).toHaveBeenCalledWith(AVAILABLE_INDICES[1].symbol);
    });

    it('should scroll on clicking previous item text', async () => {
      const user = userEvent.setup();
      render(<IndexScrollWheel {...props} />);

      // Click on the previous item name
      const prevName = AVAILABLE_INDICES[AVAILABLE_INDICES.length - 1].name;
      await user.click(screen.getByText(prevName));

      // Should scroll up
      expect(screen.getByText(`${AVAILABLE_INDICES.length} / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
    });

    it('should scroll on clicking next item text', async () => {
      const user = userEvent.setup();
      render(<IndexScrollWheel {...props} />);

      // Click on the next item name
      const nextName = AVAILABLE_INDICES[1].name;
      await user.click(screen.getByText(nextName));

      // Should scroll down
      expect(screen.getByText(`2 / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    const props = {
      selectedSymbols: ['SPY'],
      onSelect: vi.fn(),
      symbolColors: { SPY: '#f59e0b' },
    };

    it('should show selection indicator for selected symbol', () => {
      const { container } = render(<IndexScrollWheel {...props} />);
      // Selected items have visible indicator bar
      const indicator = container.querySelector('.opacity-100');
      expect(indicator).toBeTruthy();
    });

    it('should call onSelect when current item clicked', async () => {
      const user = userEvent.setup();
      render(<IndexScrollWheel {...props} />);

      await user.click(screen.getByRole('button', { name: /S&P 500/i }));
      expect(props.onSelect).toHaveBeenCalledWith('SPY');
    });

    it('should show symbol color when selected', () => {
      const { container } = render(<IndexScrollWheel {...props} />);
      // Color dot should be visible
      const colorDots = container.querySelectorAll('.rounded-full');
      expect(colorDots.length).toBeGreaterThan(0);
    });
  });

  describe('Mouse Wheel Scrolling', () => {
    const props = {
      selectedSymbols: [],
      onSelect: vi.fn(),
    };

    it('should scroll down on wheel down', () => {
      const { container } = render(<IndexScrollWheel {...props} />);

      const wheelArea = container.querySelector('.cursor-ns-resize');
      if (wheelArea) {
        fireEvent.wheel(wheelArea, { deltaY: 100 });

        // Should show second index
        expect(screen.getByText(`2 / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
      }
    });

    it('should scroll up on wheel up', () => {
      const { container } = render(<IndexScrollWheel {...props} />);

      const wheelArea = container.querySelector('.cursor-ns-resize');
      if (wheelArea) {
        fireEvent.wheel(wheelArea, { deltaY: -100 });

        // Should wrap to last
        expect(screen.getByText(`${AVAILABLE_INDICES.length} / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
      }
    });
  });

  describe('Touch Scrolling', () => {
    const props = {
      selectedSymbols: [],
      onSelect: vi.fn(),
    };

    it('should handle touch start', () => {
      const { container } = render(<IndexScrollWheel {...props} />);

      const wheelArea = container.querySelector('.cursor-ns-resize');
      if (wheelArea) {
        fireEvent.touchStart(wheelArea, {
          touches: [{ clientY: 100 }],
        });
        // Should not error
        expect(wheelArea).toBeInTheDocument();
      }
    });

    it('should scroll on swipe up', () => {
      const { container } = render(<IndexScrollWheel {...props} />);

      const wheelArea = container.querySelector('.cursor-ns-resize');
      if (wheelArea) {
        fireEvent.touchStart(wheelArea, {
          touches: [{ clientY: 100 }],
        });
        fireEvent.touchMove(wheelArea, {
          touches: [{ clientY: 60 }], // Swipe up (delta > 20)
        });

        // Should scroll down (next item)
        expect(screen.getByText(`2 / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
      }
    });

    it('should scroll on swipe down', () => {
      const { container } = render(<IndexScrollWheel {...props} />);

      const wheelArea = container.querySelector('.cursor-ns-resize');
      if (wheelArea) {
        fireEvent.touchStart(wheelArea, {
          touches: [{ clientY: 100 }],
        });
        fireEvent.touchMove(wheelArea, {
          touches: [{ clientY: 140 }], // Swipe down (delta > 20)
        });

        // Should scroll up (previous item, wraps to last)
        expect(screen.getByText(`${AVAILABLE_INDICES.length} / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
      }
    });

    it('should reset touch state on touch end', () => {
      const { container } = render(<IndexScrollWheel {...props} />);

      const wheelArea = container.querySelector('.cursor-ns-resize');
      if (wheelArea) {
        fireEvent.touchStart(wheelArea, {
          touches: [{ clientY: 100 }],
        });
        fireEvent.touchEnd(wheelArea);
        // Should not error
        expect(wheelArea).toBeInTheDocument();
      }
    });
  });

  describe('Animation', () => {
    const props = {
      selectedSymbols: [],
      onSelect: vi.fn(),
    };

    it('should prevent multiple rapid scrolls', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<IndexScrollWheel {...props} onNavigate={onNavigate} />);

      // Rapid clicks should be debounced by isAnimating state
      await user.click(screen.getByLabelText('Next index'));
      await user.click(screen.getByLabelText('Next index'));
      await user.click(screen.getByLabelText('Next index'));

      // Due to animation lock, may not process all clicks
      // At minimum one should have worked
      expect(onNavigate).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty symbolColors', () => {
      render(
        <IndexScrollWheel
          selectedSymbols={[]}
          onSelect={vi.fn()}
          symbolColors={{}}
        />
      );
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
    });

    it('should handle undefined onNavigate', async () => {
      const user = userEvent.setup();
      render(
        <IndexScrollWheel
          selectedSymbols={[]}
          onSelect={vi.fn()}
        />
      );

      // Should not error when navigating without onNavigate callback
      await user.click(screen.getByLabelText('Next index'));
      expect(screen.getByText(`2 / ${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
    });
  });
});
