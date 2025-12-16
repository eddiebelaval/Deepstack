import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualPositionDialog } from '../ManualPositionDialog';
import { usePlacePaperTrade } from '@/hooks/usePortfolio';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/hooks/usePortfolio');
vi.mock('sonner');

describe('ManualPositionDialog', () => {
  const mockOnSuccess = vi.fn();
  const mockExecute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePlacePaperTrade).mockReturnValue({
      execute: mockExecute,
      isSubmitting: false,
      error: null,
      clearError: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders trigger button', () => {
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      expect(screen.getByRole('button', { name: /record trade/i })).toBeInTheDocument();
    });

    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Record Paper Trade')).toBeInTheDocument();
      });
    });

    it('renders form fields in dialog', async () => {
      const user = userEvent.setup();
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/action/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/order type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      });
    });

    it('has correct default values', async () => {
      const user = userEvent.setup();
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toHaveValue(1);
        expect(screen.getByLabelText(/price/i)).toHaveValue(0);
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty symbol', async () => {
      const user = userEvent.setup();
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      // Submit without filling symbol
      const submitButton = await screen.findByRole('button', { name: /^record trade$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/symbol is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid quantity', async () => {
      const user = userEvent.setup();
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      const symbolInput = await screen.findByLabelText(/symbol/i);
      await user.type(symbolInput, 'AAPL');

      const quantityInput = screen.getByLabelText(/quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');

      const submitButton = screen.getByRole('button', { name: /^record trade$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/quantity must be positive/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid price', async () => {
      const user = userEvent.setup();
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      const symbolInput = await screen.findByLabelText(/symbol/i);
      await user.type(symbolInput, 'AAPL');

      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '-10');

      const submitButton = screen.getByRole('button', { name: /^record trade$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/price must be positive/i)).toBeInTheDocument();
      });
    });
  });

  describe('Symbol Input', () => {
    it('converts symbol to uppercase', async () => {
      const user = userEvent.setup();
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      const symbolInput = await screen.findByLabelText(/symbol/i);
      await user.type(symbolInput, 'aapl');

      expect(symbolInput).toHaveValue('AAPL');
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'AAPL' });

      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      // Fill form
      const symbolInput = await screen.findByLabelText(/symbol/i);
      await user.type(symbolInput, 'AAPL');

      const quantityInput = screen.getByLabelText(/quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '10');

      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '150.50');

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Test trade');

      // Submit
      const submitButton = screen.getByRole('button', { name: /^record trade$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith({
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 10,
          price: 150.5,
          orderType: 'MKT',
          notes: 'Test trade',
        });
      });
    });

    it('shows success toast and closes dialog on success', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'AAPL' });

      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      // Fill required fields
      const symbolInput = await screen.findByLabelText(/symbol/i);
      await user.type(symbolInput, 'AAPL');

      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '150');

      // Submit
      const submitButton = screen.getByRole('button', { name: /^record trade$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Trade Recorded',
          expect.objectContaining({
            description: expect.stringContaining('BUY 1 AAPL'),
          })
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('shows error toast on failure', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue(null);

      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      // Fill required fields
      const symbolInput = await screen.findByLabelText(/symbol/i);
      await user.type(symbolInput, 'AAPL');

      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '150');

      // Submit
      const submitButton = screen.getByRole('button', { name: /^record trade$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to record trade');
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'AAPL' });

      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      // Open dialog
      await user.click(screen.getByRole('button', { name: /record trade/i }));

      // Fill required fields
      const symbolInput = await screen.findByLabelText(/symbol/i);
      await user.type(symbolInput, 'AAPL');

      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '150');

      // Submit
      const submitButton = screen.getByRole('button', { name: /^record trade$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Dialog should close, open again to verify reset
      await user.click(screen.getByRole('button', { name: /record trade/i }));

      await waitFor(() => {
        const newSymbolInput = screen.getByLabelText(/symbol/i);
        expect(newSymbolInput).toHaveValue('');
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner while submitting', async () => {
      const user = userEvent.setup();

      vi.mocked(usePlacePaperTrade).mockReturnValue({
        execute: mockExecute,
        isSubmitting: true,
        error: null,
        clearError: vi.fn(),
      });

      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /record trade/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Dialog Description', () => {
    it('shows helpful description text', async () => {
      const user = userEvent.setup();
      render(<ManualPositionDialog onSuccess={mockOnSuccess} />);

      await user.click(screen.getByRole('button', { name: /record trade/i }));

      await waitFor(() => {
        expect(screen.getByText(/record a paper trade/i)).toBeInTheDocument();
        expect(screen.getByText(/update your positions/i)).toBeInTheDocument();
      });
    });
  });
});
