import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThesisDialog } from '../ThesisDialog';
import { type ThesisEntry } from '@/lib/stores/thesis-store';

// Mock Supabase conversations
vi.mock('@/lib/supabase/conversations', () => ({
  fetchRecentConversations: vi.fn(() => Promise.resolve([
    { id: 'conv-1', title: 'Test Conversation 1', created_at: '2024-01-01T00:00:00Z', provider: 'openai' },
    { id: 'conv-2', title: 'Test Conversation 2', created_at: '2024-01-02T00:00:00Z', provider: 'anthropic' },
  ])),
}));

const mockExistingThesis: ThesisEntry = {
  id: 'thesis-1',
  title: 'AAPL Bullish',
  symbol: 'AAPL',
  hypothesis: 'AAPL will break out on earnings',
  timeframe: '1-3 Months',
  status: 'drafting',
  entryTarget: 180,
  exitTarget: 220,
  stopLoss: 170,
  keyConditions: ['Earnings beat', 'Volume spike'],
  conversationId: 'conv-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('ThesisDialog', () => {
  const mockOnAddThesis = vi.fn();
  const mockOnUpdateThesis = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onAddThesis: mockOnAddThesis,
    onUpdateThesis: mockOnUpdateThesis,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAddThesis.mockResolvedValue(mockExistingThesis);
    mockOnUpdateThesis.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders dialog title for new thesis', () => {
      render(<ThesisDialog {...defaultProps} />);
      expect(screen.getByText('New Thesis')).toBeInTheDocument();
    });

    it('renders dialog title for editing thesis', () => {
      render(<ThesisDialog {...defaultProps} editingId="thesis-1" existingThesis={mockExistingThesis} />);
      expect(screen.getByText('Edit Thesis')).toBeInTheDocument();
    });

    it('renders all input fields', () => {
      render(<ThesisDialog {...defaultProps} />);
      expect(screen.getByLabelText(/Symbol/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Timeframe/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hypothesis/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Entry Target/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Exit Target/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Stop Loss/)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<ThesisDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('New Thesis')).not.toBeInTheDocument();
    });
  });

  describe('form population for editing', () => {
    it('populates all fields with existing thesis data', () => {
      render(<ThesisDialog {...defaultProps} editingId="thesis-1" existingThesis={mockExistingThesis} />);

      expect(screen.getByDisplayValue('AAPL Bullish')).toBeInTheDocument();
      expect(screen.getByDisplayValue('AAPL')).toBeInTheDocument();
      expect(screen.getByDisplayValue('AAPL will break out on earnings')).toBeInTheDocument();
      expect(screen.getByDisplayValue('180')).toBeInTheDocument();
      expect(screen.getByDisplayValue('220')).toBeInTheDocument();
      expect(screen.getByDisplayValue('170')).toBeInTheDocument();
    });

    it('populates key conditions', () => {
      render(<ThesisDialog {...defaultProps} editingId="thesis-1" existingThesis={mockExistingThesis} />);
      expect(screen.getByText('Earnings beat')).toBeInTheDocument();
      expect(screen.getByText('Volume spike')).toBeInTheDocument();
    });
  });

  describe('symbol input', () => {
    it('allows entering symbol', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const symbolInput = screen.getByLabelText(/Symbol/);
      await user.type(symbolInput, 'TSLA');

      expect(symbolInput).toHaveValue('TSLA');
    });

    it('is required field', () => {
      render(<ThesisDialog {...defaultProps} />);
      const createButton = screen.getByText('Create Thesis');
      expect(createButton).toBeDisabled();
    });
  });

  describe('hypothesis input', () => {
    it('allows entering hypothesis', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const hypothesisInput = screen.getByLabelText(/Hypothesis/);
      await user.type(hypothesisInput, 'Stock will go up');

      expect(hypothesisInput).toHaveValue('Stock will go up');
    });

    it('is required field', () => {
      render(<ThesisDialog {...defaultProps} />);
      const createButton = screen.getByText('Create Thesis');
      expect(createButton).toBeDisabled();
    });

    it('supports multi-line text', () => {
      render(<ThesisDialog {...defaultProps} />);
      const hypothesisInput = screen.getByLabelText(/Hypothesis/) as HTMLTextAreaElement;
      expect(hypothesisInput.rows).toBeGreaterThan(1);
    });
  });

  describe('price targets', () => {
    it('allows entering entry target', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const entryInput = screen.getByLabelText(/Entry Target/);
      await user.type(entryInput, '150.50');

      expect(entryInput).toHaveValue(150.50);
    });

    it('allows entering exit target', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const exitInput = screen.getByLabelText(/Exit Target/);
      await user.type(exitInput, '200.75');

      expect(exitInput).toHaveValue(200.75);
    });

    it('allows entering stop loss', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const stopInput = screen.getByLabelText(/Stop Loss/);
      await user.type(stopInput, '140.25');

      expect(stopInput).toHaveValue(140.25);
    });

    it('accepts decimal values', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const entryInput = screen.getByLabelText(/Entry Target/);
      await user.type(entryInput, '150.01');

      expect(entryInput).toHaveValue(150.01);
    });
  });

  describe('timeframe selection', () => {
    it('renders timeframe dropdown', () => {
      render(<ThesisDialog {...defaultProps} />);
      expect(screen.getByLabelText(/Timeframe/)).toBeInTheDocument();
    });

    it('allows selecting timeframe', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const timeframeSelect = screen.getByLabelText(/Timeframe/);
      await user.click(timeframeSelect);

      // Timeframe options should appear
      await waitFor(() => {
        expect(screen.getByText('1 Week')).toBeInTheDocument();
      });
    });
  });

  describe('key conditions', () => {
    it('allows adding key conditions', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const conditionInput = screen.getByPlaceholderText(/Volume above 20M/);
      await user.type(conditionInput, 'RSI below 70');
      await user.click(screen.getByRole('button', { name: /plus/i }));

      await waitFor(() => {
        expect(screen.getByText('RSI below 70')).toBeInTheDocument();
      });
    });

    it('allows adding condition by pressing Enter', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const conditionInput = screen.getByPlaceholderText(/Volume above 20M/);
      await user.type(conditionInput, 'Price above SMA{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Price above SMA')).toBeInTheDocument();
      });
    });

    it('clears input after adding condition', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const conditionInput = screen.getByPlaceholderText(/Volume above 20M/) as HTMLInputElement;
      await user.type(conditionInput, 'Test condition');
      await user.click(screen.getByRole('button', { name: /plus/i }));

      await waitFor(() => {
        expect(conditionInput.value).toBe('');
      });
    });

    it('allows removing key conditions', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} editingId="thesis-1" existingThesis={mockExistingThesis} />);

      const removeButton = screen.getAllByRole('button')[0];
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('Earnings beat')).not.toBeInTheDocument();
      });
    });

    it('does not add empty conditions', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /plus/i });
      await user.click(addButton);

      expect(screen.queryByText('')).not.toBeInTheDocument();
    });

    it('trims whitespace from conditions', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const conditionInput = screen.getByPlaceholderText(/Volume above 20M/);
      await user.type(conditionInput, '  Trimmed condition  ');
      await user.click(screen.getByRole('button', { name: /plus/i }));

      await waitFor(() => {
        expect(screen.getByText('Trimmed condition')).toBeInTheDocument();
      });
    });
  });

  describe('conversation linking', () => {
    it('loads recent conversations', async () => {
      render(<ThesisDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Link AI Conversation/)).toBeInTheDocument();
      });
    });

    it('shows No conversation linked option', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      const conversationSelect = screen.getByLabelText(/Link AI Conversation/);
      await user.click(conversationSelect);

      await waitFor(() => {
        expect(screen.getByText(/No conversation linked/)).toBeInTheDocument();
      });
    });
  });

  describe('form submission - create', () => {
    it('calls onAddThesis with form data', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'TSLA');
      await user.type(screen.getByLabelText(/Hypothesis/), 'TSLA will moon');

      await user.click(screen.getByText('Create Thesis'));

      await waitFor(() => {
        expect(mockOnAddThesis).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'TSLA',
            hypothesis: 'TSLA will moon',
            status: 'drafting',
          })
        );
      });
    });

    it('converts symbol to uppercase', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'aapl');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test');
      await user.click(screen.getByText('Create Thesis'));

      await waitFor(() => {
        expect(mockOnAddThesis).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: 'AAPL' })
        );
      });
    });

    it('generates default title if none provided', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test');
      await user.click(screen.getByText('Create Thesis'));

      await waitFor(() => {
        expect(mockOnAddThesis).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'SPY Thesis' })
        );
      });
    });

    it('closes dialog after successful creation', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test');
      await user.click(screen.getByText('Create Thesis'));

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('includes price targets in submission', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test');
      await user.type(screen.getByLabelText(/Entry Target/), '450');
      await user.type(screen.getByLabelText(/Exit Target/), '500');
      await user.type(screen.getByLabelText(/Stop Loss/), '425');

      await user.click(screen.getByText('Create Thesis'));

      await waitFor(() => {
        expect(mockOnAddThesis).toHaveBeenCalledWith(
          expect.objectContaining({
            entryTarget: 450,
            exitTarget: 500,
            stopLoss: 425,
          })
        );
      });
    });

    it('shows loading state while saving', async () => {
      const user = userEvent.setup();
      mockOnAddThesis.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test');
      await user.click(screen.getByText('Create Thesis'));

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('form submission - update', () => {
    it('calls onUpdateThesis with updated data', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} editingId="thesis-1" existingThesis={mockExistingThesis} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      await user.click(screen.getByText('Update Thesis'));

      await waitFor(() => {
        expect(mockOnUpdateThesis).toHaveBeenCalledWith(
          'thesis-1',
          expect.objectContaining({ title: 'Updated Title' })
        );
      });
    });

    it('shows Update button when editing', () => {
      render(<ThesisDialog {...defaultProps} editingId="thesis-1" existingThesis={mockExistingThesis} />);
      expect(screen.getByText('Update Thesis')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('disables submit button when symbol is missing', () => {
      render(<ThesisDialog {...defaultProps} />);
      const submitButton = screen.getByText('Create Thesis');
      expect(submitButton).toBeDisabled();
    });

    it('disables submit button when hypothesis is missing', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');

      const submitButton = screen.getByText('Create Thesis');
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when required fields are filled', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test hypothesis');

      const submitButton = screen.getByText('Create Thesis');
      expect(submitButton).not.toBeDisabled();
    });

    it('disables buttons while saving', async () => {
      const user = userEvent.setup();
      mockOnAddThesis.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test');
      await user.click(screen.getByText('Create Thesis'));

      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('cancel functionality', () => {
    it('closes dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.click(screen.getByText('Cancel'));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not call onAddThesis when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test');
      await user.click(screen.getByText('Cancel'));

      expect(mockOnAddThesis).not.toHaveBeenCalled();
    });
  });

  describe('form reset', () => {
    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ThesisDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/Symbol/), 'SPY');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Test');
      await user.click(screen.getByText('Create Thesis'));

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });

      // Reopen dialog
      rerender(<ThesisDialog {...defaultProps} open={true} />);

      // Form should be empty
      expect(screen.getByLabelText(/Symbol/)).toHaveValue('');
    });
  });
});
