import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PositionEntryForm, Position } from '../PositionEntryForm';

describe('PositionEntryForm', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSave = vi.fn();

  const mockPosition: Position = {
    id: '1',
    symbol: 'AAPL',
    side: 'Long',
    shares: 100,
    avgCost: 150.50,
    openDate: '2024-01-15',
    notes: 'Bull flag breakout',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Add Mode Rendering', () => {
    it('renders dialog when open', () => {
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <PositionEntryForm
          open={false}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows "Add Position" title in add mode', () => {
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Add Position')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/side/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shares/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/average cost/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/open date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('shows Cancel and Add buttons', () => {
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add position/i })).toBeInTheDocument();
    });
  });

  describe('Edit Mode Rendering', () => {
    it('shows "Edit Position" title in edit mode', () => {
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          editPosition={mockPosition}
        />
      );

      expect(screen.getByText('Edit Position')).toBeInTheDocument();
    });

    it('pre-fills form with position data', () => {
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          editPosition={mockPosition}
        />
      );

      expect(screen.getByLabelText(/symbol/i)).toHaveValue('AAPL');
      expect(screen.getByLabelText(/shares/i)).toHaveValue(100);
      expect(screen.getByLabelText(/average cost/i)).toHaveValue(150.5);
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Bull flag breakout');
    });

    it('shows "Update Position" button in edit mode', () => {
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          editPosition={mockPosition}
        />
      );

      expect(screen.getByRole('button', { name: /update position/i })).toBeInTheDocument();
    });
  });

  describe('Symbol Input', () => {
    it('converts symbol to uppercase', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      const symbolInput = screen.getByLabelText(/symbol/i);
      await user.type(symbolInput, 'aapl');

      expect(symbolInput).toHaveValue('AAPL');
    });
  });

  describe('Side Selection', () => {
    it('defaults to Long', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      // Check that Long is selected by default
      const sideSelect = screen.getByLabelText(/side/i);
      expect(sideSelect).toHaveTextContent('Long');
    });

    it('allows changing to Short', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByLabelText(/side/i));
      await user.click(screen.getByText('Short'));

      expect(screen.getByLabelText(/side/i)).toHaveTextContent('Short');
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty symbol', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      // Fill other required fields but not symbol
      await user.type(screen.getByLabelText(/shares/i), '100');
      await user.type(screen.getByLabelText(/average cost/i), '150');

      await user.click(screen.getByRole('button', { name: /add position/i }));

      expect(screen.getByText('Symbol is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows error for invalid shares', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.type(screen.getByLabelText(/symbol/i), 'AAPL');
      await user.clear(screen.getByLabelText(/shares/i));
      await user.type(screen.getByLabelText(/shares/i), '0');
      await user.type(screen.getByLabelText(/average cost/i), '150');

      await user.click(screen.getByRole('button', { name: /add position/i }));

      expect(screen.getByText('Shares must be greater than 0')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows error for invalid average cost', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.type(screen.getByLabelText(/symbol/i), 'AAPL');
      await user.type(screen.getByLabelText(/shares/i), '100');
      await user.clear(screen.getByLabelText(/average cost/i));
      await user.type(screen.getByLabelText(/average cost/i), '-10');

      await user.click(screen.getByRole('button', { name: /add position/i }));

      expect(screen.getByText('Average cost must be greater than 0')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      // Submit with empty symbol to trigger error
      await user.click(screen.getByRole('button', { name: /add position/i }));
      expect(screen.getByText('Symbol is required')).toBeInTheDocument();

      // Start typing to clear error
      await user.type(screen.getByLabelText(/symbol/i), 'A');
      expect(screen.queryByText('Symbol is required')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSave with correct data', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.type(screen.getByLabelText(/symbol/i), 'tsla');
      await user.type(screen.getByLabelText(/shares/i), '50');
      await user.type(screen.getByLabelText(/average cost/i), '250.50');
      await user.type(screen.getByLabelText(/notes/i), 'Test position');

      await user.click(screen.getByRole('button', { name: /add position/i }));

      expect(mockOnSave).toHaveBeenCalledWith({
        symbol: 'TSLA',
        side: 'Long',
        shares: 50,
        avgCost: 250.5,
        openDate: expect.any(String),
        notes: 'Test position',
      });
    });

    it('trims whitespace from symbol and notes', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.type(screen.getByLabelText(/symbol/i), '  msft  ');
      await user.type(screen.getByLabelText(/shares/i), '100');
      await user.type(screen.getByLabelText(/average cost/i), '300');
      await user.type(screen.getByLabelText(/notes/i), '  Trimmed note  ');

      await user.click(screen.getByRole('button', { name: /add position/i }));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'MSFT',
          notes: 'Trimmed note',
        })
      );
    });

    it('omits notes when empty', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.type(screen.getByLabelText(/symbol/i), 'NVDA');
      await user.type(screen.getByLabelText(/shares/i), '25');
      await user.type(screen.getByLabelText(/average cost/i), '500');

      await user.click(screen.getByRole('button', { name: /add position/i }));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: undefined,
        })
      );
    });
  });

  describe('Cancel Button', () => {
    it('closes dialog on cancel', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not save on cancel', async () => {
      const user = userEvent.setup();
      render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.type(screen.getByLabelText(/symbol/i), 'AAPL');
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('resets form when dialog closes', async () => {
      const { rerender } = render(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      // Close dialog
      rerender(
        <PositionEntryForm
          open={false}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      // Re-open dialog
      rerender(
        <PositionEntryForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/symbol/i)).toHaveValue('');
      });
    });
  });
});
