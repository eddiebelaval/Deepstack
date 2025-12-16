import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetPanel } from '../WidgetPanel';
import { useUIStore } from '@/lib/stores/ui-store';
import { useWidgetStore } from '@/lib/stores/widget-store';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/lib/stores/widget-store');

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
}));

// Mock UI components
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock('@/components/ui/DotScrollIndicator', () => ({
  DotScrollIndicator: () => <div data-testid="dot-scroll-indicator">Dots</div>,
}));

vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/widgets/SortableWidget', () => ({
  SortableWidget: ({ children, widget }: any) => (
    <div data-testid={`sortable-widget-${widget.id}`}>{children}</div>
  ),
}));

vi.mock('@/components/widgets/WidgetRenderer', () => ({
  WidgetRenderer: ({ type }: any) => <div data-testid={`widget-${type}`}>Widget: {type}</div>,
}));

vi.mock('@/components/widgets/WidgetSelector', () => ({
  WidgetSelector: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="widget-selector">Widget Selector</div> : null
  ),
}));

describe('WidgetPanel', () => {
  const mockSetRightSidebarOpen = vi.fn();
  const mockRemoveWidget = vi.fn();
  const mockToggleCollapse = vi.fn();
  const mockReorderWidgets = vi.fn();
  const mockResetToDefaults = vi.fn();

  const mockActiveWidgets = [
    { id: 'widget-1', type: 'watchlist', collapsed: false },
    { id: 'widget-2', type: 'quick-stats', collapsed: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      rightSidebarOpen: true,
      setRightSidebarOpen: mockSetRightSidebarOpen,
    });

    (useWidgetStore as any).mockReturnValue({
      activeWidgets: mockActiveWidgets,
      removeWidget: mockRemoveWidget,
      toggleCollapse: mockToggleCollapse,
      reorderWidgets: mockReorderWidgets,
      resetToDefaults: mockResetToDefaults,
    });
  });

  describe('Rendering', () => {
    it('should render when rightSidebarOpen is true', () => {
      render(<WidgetPanel />);

      expect(screen.getByText('Widgets')).toBeInTheDocument();
    });

    it('should not render when rightSidebarOpen is false', () => {
      (useUIStore as any).mockReturnValue({
        rightSidebarOpen: false,
        setRightSidebarOpen: mockSetRightSidebarOpen,
      });

      const { container } = render(<WidgetPanel />);

      expect(container.firstChild).toBeNull();
    });

    it('should render active widgets', () => {
      render(<WidgetPanel />);

      expect(screen.getByTestId('sortable-widget-widget-1')).toBeInTheDocument();
      expect(screen.getByTestId('sortable-widget-widget-2')).toBeInTheDocument();
    });

    it('should render widget renderers', () => {
      render(<WidgetPanel />);

      expect(screen.getByTestId('widget-watchlist')).toBeInTheDocument();
      expect(screen.getByTestId('widget-quick-stats')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no widgets', () => {
      (useWidgetStore as any).mockReturnValue({
        activeWidgets: [],
        removeWidget: mockRemoveWidget,
        toggleCollapse: mockToggleCollapse,
        reorderWidgets: mockReorderWidgets,
        resetToDefaults: mockResetToDefaults,
      });

      render(<WidgetPanel />);

      expect(screen.getByText('No widgets added')).toBeInTheDocument();
    });

    it('should show drop hint when few widgets', () => {
      (useWidgetStore as any).mockReturnValue({
        activeWidgets: [{ id: 'widget-1', type: 'watchlist', collapsed: false }],
        removeWidget: mockRemoveWidget,
        toggleCollapse: mockToggleCollapse,
        reorderWidgets: mockReorderWidgets,
        resetToDefaults: mockResetToDefaults,
      });

      render(<WidgetPanel />);

      expect(screen.getByText('Drag to reorder')).toBeInTheDocument();
    });
  });

  describe('Header Actions', () => {
    it('should reset to defaults when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<WidgetPanel />);

      const buttons = screen.getAllByRole('button');
      // First button is reset
      await user.click(buttons[0]);

      expect(mockResetToDefaults).toHaveBeenCalled();
    });

    it('should close panel when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<WidgetPanel />);

      const buttons = screen.getAllByRole('button');
      // Last header button is close
      await user.click(buttons[2]);

      expect(mockSetRightSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('should open widget selector when settings button is clicked', async () => {
      const user = userEvent.setup();
      render(<WidgetPanel />);

      const buttons = screen.getAllByRole('button');
      // Second button is settings/customize
      await user.click(buttons[1]);

      expect(screen.getByTestId('widget-selector')).toBeInTheDocument();
    });
  });

  describe('Add Widget Button', () => {
    it('should render add widget button', () => {
      render(<WidgetPanel />);

      expect(screen.getByText('Add Widget')).toBeInTheDocument();
    });

    it('should open widget selector when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<WidgetPanel />);

      const addButton = screen.getByText('Add Widget');
      await user.click(addButton);

      expect(screen.getByTestId('widget-selector')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should render DndContext', () => {
      render(<WidgetPanel />);

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    it('should render SortableContext', () => {
      render(<WidgetPanel />);

      expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
    });
  });

  describe('Scroll Area', () => {
    it('should render scroll area', () => {
      render(<WidgetPanel />);

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    });

    it('should render dot scroll indicator', () => {
      render(<WidgetPanel />);

      expect(screen.getByTestId('dot-scroll-indicator')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have correct width', () => {
      const { container } = render(<WidgetPanel />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('w-72');
    });

    it('should have correct positioning', () => {
      const { container } = render(<WidgetPanel />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('fixed', 'right-12', 'top-0');
    });
  });
});
