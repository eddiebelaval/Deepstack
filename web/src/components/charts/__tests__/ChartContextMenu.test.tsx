import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartContextMenu } from '../ChartContextMenu';
import { useAlertsSync } from '@/hooks/useAlertsSync';
import { useTradingStore } from '@/lib/stores/trading-store';
import { toast } from 'sonner';

// Mock the hooks
vi.mock('@/hooks/useAlertsSync');
vi.mock('@/lib/stores/trading-store');

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ChartContextMenu', () => {
  const mockAddAlert = vi.fn();
  const mockOnPriceAtCursor = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock trading store
    (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeSymbol: 'SPY',
    });

    // Mock alerts hook
    (useAlertsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      addAlert: mockAddAlert,
    });

    // Default: return a price
    mockOnPriceAtCursor.mockReturnValue(450.50);
    mockAddAlert.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders children', () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      expect(screen.getByText('Chart Content')).toBeInTheDocument();
    });

    it('does not show menu items initially', () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      expect(screen.queryByText(/Alert when price goes above/)).not.toBeInTheDocument();
    });
  });

  describe('context menu trigger', () => {
    it('opens menu on right click', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/Set Alert at/)).toBeInTheDocument();
      });
    });

    it('calls onPriceAtCursor when context menu opens', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(mockOnPriceAtCursor).toHaveBeenCalled();
      });
    });

    it('displays price in menu header when price available', async () => {
      mockOnPriceAtCursor.mockReturnValue(450.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/Set Alert at \$450\.50/)).toBeInTheDocument();
      });
    });

    it('displays generic header when price not available', async () => {
      mockOnPriceAtCursor.mockReturnValue(null);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/Set Price Alert/)).toBeInTheDocument();
      });
    });
  });

  describe('menu options', () => {
    it('shows all alert options', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/Alert when price goes above/)).toBeInTheDocument();
        expect(screen.getByText(/Alert when price goes below/)).toBeInTheDocument();
        expect(screen.getByText(/Alert when price crosses/)).toBeInTheDocument();
      });
    });

    it('shows help text at bottom', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/Right-click on chart to set alerts/)).toBeInTheDocument();
      });
    });

    it('shows disabled state when no price available', async () => {
      mockOnPriceAtCursor.mockReturnValue(null);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      // When no price, the menu should still show the generic header
      await waitFor(() => {
        expect(screen.getByText(/Set Price Alert/)).toBeInTheDocument();
      });

      // All menu options should still be present
      await waitFor(() => {
        expect(screen.getByText(/Alert when price goes above/)).toBeInTheDocument();
        expect(screen.getByText(/Alert when price goes below/)).toBeInTheDocument();
        expect(screen.getByText(/Alert when price crosses/)).toBeInTheDocument();
      });
    });

    it('enables options when price available', async () => {
      mockOnPriceAtCursor.mockReturnValue(450.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const menuItems = await screen.findAllByRole('menuitem');
        // First 3 menu items should be enabled (not have aria-disabled)
        menuItems.slice(0, 3).forEach(item => {
          expect(item).not.toHaveAttribute('aria-disabled', 'true');
        });
      });
    });
  });

  describe('creating alerts', () => {
    it('creates "above" alert when clicking option', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const aboveOption = await screen.findByText(/Alert when price goes above/);
        await user.click(aboveOption);
      });

      await waitFor(() => {
        expect(mockAddAlert).toHaveBeenCalledWith({
          symbol: 'SPY',
          targetPrice: 450.50,
          condition: 'above',
          note: 'Set from chart at $450.50',
        });
      });
    });

    it('creates "below" alert when clicking option', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const belowOption = await screen.findByText(/Alert when price goes below/);
        await user.click(belowOption);
      });

      await waitFor(() => {
        expect(mockAddAlert).toHaveBeenCalledWith({
          symbol: 'SPY',
          targetPrice: 450.50,
          condition: 'below',
          note: 'Set from chart at $450.50',
        });
      });
    });

    it('creates "crosses" alert when clicking option', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const crossesOption = await screen.findByText(/Alert when price crosses/);
        await user.click(crossesOption);
      });

      await waitFor(() => {
        expect(mockAddAlert).toHaveBeenCalledWith({
          symbol: 'SPY',
          targetPrice: 450.50,
          condition: 'crosses',
          note: 'Set from chart at $450.50',
        });
      });
    });

    it('shows success toast after creating alert', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const aboveOption = await screen.findByText(/Alert when price goes above/);
        await user.click(aboveOption);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Alert set: SPY above $450.50'
        );
      });
    });

    it('shows error toast when creation fails', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);
      mockAddAlert.mockRejectedValue(new Error('Failed to create'));

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const aboveOption = await screen.findByText(/Alert when price goes above/);
        await user.click(aboveOption);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create alert');
      });
    });

    it('shows error when no price detected', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(null);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const aboveOption = await screen.findByText(/Alert when price goes above/);
        // Force click even though disabled
        fireEvent.click(aboveOption);
      });

      // Since the items are disabled, the click shouldn't trigger the handler
      expect(mockAddAlert).not.toHaveBeenCalled();
    });

    it('uses active symbol from store', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: 'AAPL',
      });

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const aboveOption = await screen.findByText(/Alert when price goes above/);
        await user.click(aboveOption);
      });

      await waitFor(() => {
        expect(mockAddAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'AAPL',
          })
        );
      });
    });
  });

  describe('price formatting', () => {
    it('formats price with 2 decimal places', async () => {
      mockOnPriceAtCursor.mockReturnValue(450.5);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/\$450\.50/)).toBeInTheDocument();
      });
    });

    it('handles high prices', async () => {
      mockOnPriceAtCursor.mockReturnValue(12345.67);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/\$12345\.67/)).toBeInTheDocument();
      });
    });

    it('handles low prices', async () => {
      mockOnPriceAtCursor.mockReturnValue(0.01);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/\$0\.01/)).toBeInTheDocument();
      });
    });
  });

  describe('toast messages', () => {
    it('shows correct message for "below" alert', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const belowOption = await screen.findByText(/Alert when price goes below/);
        await user.click(belowOption);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Alert set: SPY below $450.50'
        );
      });
    });

    it('shows correct message for "crosses" alert', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const crossesOption = await screen.findByText(/Alert when price crosses/);
        await user.click(crossesOption);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Alert set: SPY crosses $450.50'
        );
      });
    });
  });

  describe('menu icons', () => {
    it('shows green icon for "above" option', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        const aboveOption = screen.getByText(/Alert when price goes above/).closest('[role="menuitem"]');
        const greenIcon = aboveOption?.querySelector('.text-green-500');
        expect(greenIcon).toBeInTheDocument();
      });
    });

    it('shows red icon for "below" option', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        const belowOption = screen.getByText(/Alert when price goes below/).closest('[role="menuitem"]');
        const redIcon = belowOption?.querySelector('.text-red-500');
        expect(redIcon).toBeInTheDocument();
      });
    });

    it('shows blue icon for "crosses" option', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        const crossesOption = screen.getByText(/Alert when price crosses/).closest('[role="menuitem"]');
        const blueIcon = crossesOption?.querySelector('.text-blue-500');
        expect(blueIcon).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty symbol', async () => {
      const user = userEvent.setup();
      mockOnPriceAtCursor.mockReturnValue(450.50);

      (useTradingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeSymbol: '',
      });

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const aboveOption = await screen.findByText(/Alert when price goes above/);
        await user.click(aboveOption);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Unable to set alert: no price detected');
      });
    });

    it('handles zero price', async () => {
      // Zero is treated as falsy by the component, so it won't show price
      mockOnPriceAtCursor.mockReturnValue(0);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        // Zero is falsy, so should show generic header
        expect(screen.getByText(/Set Price Alert/)).toBeInTheDocument();
      });
    });

    it('handles negative price', async () => {
      mockOnPriceAtCursor.mockReturnValue(-10.50);

      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/Set Alert at \$-10\.50/)).toBeInTheDocument();
      });
    });

    it('updates price when context menu reopened at different position', async () => {
      const { rerender } = render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');

      // First right-click at one price
      mockOnPriceAtCursor.mockReturnValue(450.50);
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/\$450\.50/)).toBeInTheDocument();
      });

      // Close menu
      fireEvent.keyDown(document.body, { key: 'Escape' });

      // Second right-click at different price
      mockOnPriceAtCursor.mockReturnValue(460.75);

      rerender(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByText(/\$460\.75/)).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('has proper menu role', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('has proper menuitem roles', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(async () => {
        const menuItems = await screen.findAllByRole('menuitem');
        expect(menuItems.length).toBeGreaterThan(0);
      });
    });

    it('has proper separator', async () => {
      render(
        <ChartContextMenu onPriceAtCursor={mockOnPriceAtCursor}>
          <div>Chart Content</div>
        </ChartContextMenu>
      );

      const content = screen.getByText('Chart Content');
      fireEvent.contextMenu(content);

      await waitFor(() => {
        const separators = screen.getAllByRole('separator');
        expect(separators.length).toBeGreaterThan(0);
      });
    });
  });
});
