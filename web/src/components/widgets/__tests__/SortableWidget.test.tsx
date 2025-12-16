import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortableWidget } from '../SortableWidget';
import * as widgetStore from '@/lib/stores/widget-store';

// Mock dnd-kit
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: { 'aria-describedby': 'test-id' },
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: { toString: () => null },
  },
}));

// Mock getWidgetDefinition
vi.spyOn(widgetStore, 'getWidgetDefinition').mockReturnValue({
  type: 'watchlist',
  title: 'Watchlist',
  description: 'Track your favorite symbols',
  icon: () => <span data-testid="widget-icon">Icon</span>,
  category: 'market',
});

// Mock tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <span>{children}</span>,
}));

describe('SortableWidget', () => {
  const mockWidget = {
    id: 'widget-1',
    type: 'watchlist' as const,
    isCollapsed: false,
    order: 0,
  };

  const mockOnRemove = vi.fn();
  const mockOnToggleCollapse = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render widget title', () => {
      render(
        <SortableWidget
          widget={mockWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div>Widget Content</div>
        </SortableWidget>
      );

      expect(screen.getByText('Watchlist')).toBeInTheDocument();
    });

    it('should render widget icon', () => {
      render(
        <SortableWidget
          widget={mockWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div>Widget Content</div>
        </SortableWidget>
      );

      expect(screen.getByTestId('widget-icon')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <SortableWidget
          widget={mockWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div data-testid="widget-content">Widget Content</div>
        </SortableWidget>
      );

      expect(screen.getByTestId('widget-content')).toBeInTheDocument();
    });

    it('should render drag handle', () => {
      const { container } = render(
        <SortableWidget
          widget={mockWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div>Widget Content</div>
        </SortableWidget>
      );

      const dragHandle = container.querySelector('.cursor-grab');
      expect(dragHandle).toBeInTheDocument();
    });
  });

  describe('Collapse/Expand', () => {
    it('should call onToggleCollapse when collapse button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SortableWidget
          widget={mockWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div>Widget Content</div>
        </SortableWidget>
      );

      const buttons = screen.getAllByRole('button');
      // First button is drag handle, second is collapse
      await user.click(buttons[1]);

      expect(mockOnToggleCollapse).toHaveBeenCalled();
    });

    it('should hide content when collapsed', () => {
      const collapsedWidget = { ...mockWidget, isCollapsed: true };

      render(
        <SortableWidget
          widget={collapsedWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div data-testid="widget-content">Widget Content</div>
        </SortableWidget>
      );

      expect(screen.queryByTestId('widget-content')).not.toBeInTheDocument();
    });
  });

  describe('Remove', () => {
    it('should call onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SortableWidget
          widget={mockWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div>Widget Content</div>
        </SortableWidget>
      );

      const buttons = screen.getAllByRole('button');
      // Third button is remove
      await user.click(buttons[2]);

      expect(mockOnRemove).toHaveBeenCalled();
    });
  });

  describe('Tooltips', () => {
    it('should show Expand tooltip when collapsed', () => {
      const collapsedWidget = { ...mockWidget, isCollapsed: true };

      render(
        <SortableWidget
          widget={collapsedWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div>Widget Content</div>
        </SortableWidget>
      );

      expect(screen.getByText('Expand')).toBeInTheDocument();
    });

    it('should show Collapse tooltip when expanded', () => {
      render(
        <SortableWidget
          widget={mockWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div>Widget Content</div>
        </SortableWidget>
      );

      expect(screen.getByText('Collapse')).toBeInTheDocument();
    });

    it('should show Remove Widget tooltip', () => {
      render(
        <SortableWidget
          widget={mockWidget}
          onRemove={mockOnRemove}
          onToggleCollapse={mockOnToggleCollapse}
        >
          <div>Widget Content</div>
        </SortableWidget>
      );

      expect(screen.getByText('Remove Widget')).toBeInTheDocument();
    });
  });
});
