import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetSelector } from '../WidgetSelector';
import { useWidgetStore } from '@/lib/stores/widget-store';

// Mock widget store - only mock what we need
vi.mock('@/lib/stores/widget-store', () => ({
  useWidgetStore: vi.fn(),
  WIDGET_CATEGORIES: [
    { key: 'market', label: 'Market' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'research', label: 'Research' },
    { key: 'tools', label: 'Tools' },
  ],
  getWidgetsByCategory: vi.fn(() => []),
  WIDGET_REGISTRY: {},
}));

describe('WidgetSelector', () => {
  const mockAddWidget = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useWidgetStore as any).mockReturnValue({
      activeWidgets: [],
      addWidget: mockAddWidget,
    });
  });

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(<WidgetSelector open={true} onOpenChange={mockOnOpenChange} />);

      // Dialog should be visible with title
      expect(screen.getByText('Add Widget')).toBeInTheDocument();
    });

    it('should not render dialog content when closed', () => {
      render(<WidgetSelector open={false} onOpenChange={mockOnOpenChange} />);

      // Dialog title should not be visible when closed
      expect(screen.queryByText('Search widgets...')).not.toBeInTheDocument();
    });

    it('should render search input when open', () => {
      render(<WidgetSelector open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByPlaceholderText('Search widgets...')).toBeInTheDocument();
    });
  });

  describe('Category Tabs', () => {
    it('should render category tabs', () => {
      render(<WidgetSelector open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Market')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should allow typing in search input', async () => {
      const user = userEvent.setup();
      render(<WidgetSelector open={true} onOpenChange={mockOnOpenChange} />);

      const searchInput = screen.getByPlaceholderText('Search widgets...');
      await user.type(searchInput, 'watchlist');

      expect(searchInput).toHaveValue('watchlist');
    });
  });

  describe('Dialog Behavior', () => {
    it('should pass open prop to dialog', () => {
      const { rerender } = render(
        <WidgetSelector open={true} onOpenChange={mockOnOpenChange} />
      );

      expect(screen.getByText('Add Widget')).toBeInTheDocument();

      rerender(<WidgetSelector open={false} onOpenChange={mockOnOpenChange} />);

      // When closed, the dialog content should not be visible
      expect(screen.queryByPlaceholderText('Search widgets...')).not.toBeInTheDocument();
    });
  });
});
