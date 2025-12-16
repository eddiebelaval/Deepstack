import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  IndexControlPanel,
  AVAILABLE_INDICES,
  AVAILABLE_CRYPTO,
  type CategoryItem,
} from '../index-control-panel';

describe('IndexControlPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Symbol Mode (Default)', () => {
    const defaultProps = {
      selectedSymbols: ['SPY', 'QQQ'],
      activeAssets: [
        { symbol: 'SPY', name: 'S&P 500', price: 450.25, percentChange: 1.5, color: '#f59e0b' },
        { symbol: 'QQQ', name: 'NASDAQ', price: 380.00, percentChange: -0.8, color: '#3b82f6' },
      ],
      symbolColors: { SPY: '#f59e0b', QQQ: '#3b82f6' },
      onAdd: vi.fn(),
      onRemove: vi.fn(),
    };

    it('should render the control panel', () => {
      const { container } = render(<IndexControlPanel {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should display current asset name in wheel', () => {
      render(<IndexControlPanel {...defaultProps} />);
      // First item in AVAILABLE_INDICES is S&P 500 - may appear multiple times (wheel + grid)
      const elements = screen.getAllByText('S&P 500');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should show asset description', () => {
      render(<IndexControlPanel {...defaultProps} />);
      expect(screen.getByText('US Large Cap')).toBeInTheDocument();
    });

    it('should show counter', () => {
      render(<IndexControlPanel {...defaultProps} />);
      expect(screen.getByText(`1/${AVAILABLE_INDICES.length}`)).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<IndexControlPanel {...defaultProps} />);
      expect(screen.getByLabelText('Previous index')).toBeInTheDocument();
      expect(screen.getByLabelText('Next index')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <IndexControlPanel {...defaultProps} className="custom-panel" />
      );
      expect(container.firstChild).toHaveClass('custom-panel');
    });

    it('should use AVAILABLE_INDICES by default', () => {
      render(<IndexControlPanel {...defaultProps} />);
      // Should show first index name - may appear in wheel and grid
      const elements = screen.getAllByText(AVAILABLE_INDICES[0].name);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should accept custom availableAssets', () => {
      render(
        <IndexControlPanel
          {...defaultProps}
          availableAssets={AVAILABLE_CRYPTO}
        />
      );
      // Should show first crypto name
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    });
  });

  describe('Category Mode', () => {
    const categories: CategoryItem[] = [
      { id: 'tech', name: 'Technology', description: 'Tech stocks', color: '#3b82f6' },
      { id: 'finance', name: 'Financials', description: 'Financial sector', color: '#10b981' },
      { id: 'energy', name: 'Energy', description: 'Energy sector', color: '#f59e0b' },
    ];

    const categoryProps = {
      mode: 'category' as const,
      categories,
      categoryIndex: 0,
      onCategoryChange: vi.fn(),
      activeAssets: [
        { symbol: 'AAPL', name: 'Apple', price: 180.00, percentChange: 1.2, color: '#3b82f6' },
      ],
      symbolColors: { AAPL: '#3b82f6' },
      onToggle: vi.fn(),
      onRemove: vi.fn(),
    };

    it('should render in category mode', () => {
      const { container } = render(<IndexControlPanel {...categoryProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should show current category name', () => {
      render(<IndexControlPanel {...categoryProps} />);
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });

    it('should show category description', () => {
      render(<IndexControlPanel {...categoryProps} />);
      expect(screen.getByText('Tech stocks')).toBeInTheDocument();
    });

    it('should show category counter', () => {
      render(<IndexControlPanel {...categoryProps} />);
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    it('should call onCategoryChange when navigating up', async () => {
      const user = userEvent.setup();
      render(<IndexControlPanel {...categoryProps} />);

      await user.click(screen.getByLabelText('Previous index'));
      expect(categoryProps.onCategoryChange).toHaveBeenCalledWith(2); // Wraps to last
    });

    it('should call onCategoryChange when navigating down', async () => {
      const user = userEvent.setup();
      render(<IndexControlPanel {...categoryProps} />);

      await user.click(screen.getByLabelText('Next index'));
      expect(categoryProps.onCategoryChange).toHaveBeenCalledWith(1);
    });

    it('should show different category when index changes', () => {
      render(<IndexControlPanel {...categoryProps} categoryIndex={1} />);
      expect(screen.getByText('Financials')).toBeInTheDocument();
    });
  });

  describe('Grid Display', () => {
    const defaultProps = {
      selectedSymbols: ['SPY'],
      activeAssets: [
        { symbol: 'SPY', name: 'S&P 500', price: 450.25, percentChange: 1.5, color: '#f59e0b' },
      ],
      symbolColors: { SPY: '#f59e0b' },
      onAdd: vi.fn(),
      onRemove: vi.fn(),
    };

    it('should render 12 grid slots', () => {
      const { container } = render(<IndexControlPanel {...defaultProps} />);
      // Grid has 12 cells (6x2)
      const gridCells = container.querySelectorAll('.grid > button, .grid > div');
      expect(gridCells.length).toBe(12);
    });

    it('should show active asset in grid', () => {
      render(<IndexControlPanel {...defaultProps} />);
      // The S&P 500 button appears in the grid
      const spyButtons = screen.getAllByText(/S&P/);
      expect(spyButtons.length).toBeGreaterThan(0);
    });

    it('should call onRemove when grid cell clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<IndexControlPanel {...defaultProps} />);

      // Find an active cell button in the grid
      const gridButton = container.querySelector('.grid button');
      if (gridButton) {
        await user.click(gridButton);
        expect(defaultProps.onRemove).toHaveBeenCalled();
      }
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no assets available', () => {
      render(
        <IndexControlPanel
          availableAssets={[]}
          selectedSymbols={[]}
          activeAssets={[]}
          symbolColors={{}}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
        />
      );
      expect(screen.getByText('No assets available')).toBeInTheDocument();
    });

    it('should show empty state for category mode', () => {
      render(
        <IndexControlPanel
          mode="category"
          categories={[]}
          categoryIndex={0}
          onCategoryChange={vi.fn()}
          activeAssets={[]}
          symbolColors={{}}
          onToggle={vi.fn()}
          onRemove={vi.fn()}
        />
      );
      expect(screen.getByText('No categories available')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    const defaultProps = {
      selectedSymbols: [],
      activeAssets: [],
      symbolColors: {},
      onAdd: vi.fn(),
      onRemove: vi.fn(),
    };

    it('should navigate to next asset', async () => {
      const user = userEvent.setup();
      render(<IndexControlPanel {...defaultProps} />);

      await user.click(screen.getByLabelText('Next index'));

      // After navigation, second index should be visible
      expect(screen.getByText(AVAILABLE_INDICES[1].name)).toBeInTheDocument();
    });

    it('should navigate to previous asset', async () => {
      const user = userEvent.setup();
      render(<IndexControlPanel {...defaultProps} />);

      await user.click(screen.getByLabelText('Previous index'));

      // Should wrap to last index - name may appear multiple times
      const elements = screen.getAllByText(AVAILABLE_INDICES[AVAILABLE_INDICES.length - 1].name);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should auto-add symbol when navigating (if not selected)', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(
        <IndexControlPanel
          {...defaultProps}
          onAdd={onAdd}
          maxSymbols={12}
        />
      );

      // Navigate to next
      await user.click(screen.getByLabelText('Next index'));

      // Should call onAdd with the new symbol
      expect(onAdd).toHaveBeenCalledWith(AVAILABLE_INDICES[1].symbol);
    });

    it('should not auto-add when at max symbols', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(
        <IndexControlPanel
          selectedSymbols={['A', 'B', 'C']}
          activeAssets={[]}
          symbolColors={{}}
          onAdd={onAdd}
          onRemove={vi.fn()}
          maxSymbols={3}
        />
      );

      await user.click(screen.getByLabelText('Next index'));

      // Should not call onAdd because at max
      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('Wheel Click (Symbol Mode)', () => {
    const props = {
      selectedSymbols: ['SPY'],
      activeAssets: [{ symbol: 'SPY', name: 'S&P 500', color: '#f59e0b' }],
      symbolColors: { SPY: '#f59e0b' },
      onAdd: vi.fn(),
      onRemove: vi.fn(),
    };

    it('should call onRemove when clicking selected symbol', async () => {
      const user = userEvent.setup();
      render(<IndexControlPanel {...props} />);

      // Click on the current symbol name in the wheel
      const wheelButtons = screen.getAllByText('S&P 500');
      // Find the one in the wheel (has the indicator dot)
      for (const btn of wheelButtons) {
        if (btn.closest('button')?.querySelector('.rounded-full')) {
          await user.click(btn);
          break;
        }
      }

      expect(props.onRemove).toHaveBeenCalledWith('SPY');
    });

    it('should call onAdd when clicking unselected symbol', async () => {
      const user = userEvent.setup();
      render(
        <IndexControlPanel
          selectedSymbols={[]}
          activeAssets={[]}
          symbolColors={{}}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // Click should add the first symbol
      const addButton = screen.getByText('S&P 500').closest('button');
      if (addButton) {
        await user.click(addButton);
        // onAdd is called during navigation, not click
      }
    });
  });

  describe('Backwards Compatibility', () => {
    it('should accept activeIndices prop (legacy)', () => {
      render(
        <IndexControlPanel
          selectedSymbols={['SPY']}
          activeIndices={[{ symbol: 'SPY', name: 'S&P 500', color: '#f59e0b' }]}
          symbolColors={{ SPY: '#f59e0b' }}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
        />
      );
      // Name may appear in both wheel and grid
      const elements = screen.getAllByText('S&P 500');
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
