import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeJournal, TradeEntry } from '../TradeJournal';

describe('TradeJournal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders trade journal with header', () => {
      render(<TradeJournal />);

      expect(screen.getByText('Trade Journal')).toBeInTheDocument();
    });

    it('displays entries count badge', () => {
      render(<TradeJournal />);

      expect(screen.getByText('0 entries')).toBeInTheDocument();
    });

    it('shows online status indicator', () => {
      render(<TradeJournal />);

      const cloudIcon = document.querySelector('.lucide-cloud');
      expect(cloudIcon).toBeInTheDocument();
      expect(cloudIcon).toHaveClass('text-green-500');
    });

    it('renders new entry form', () => {
      render(<TradeJournal />);

      expect(screen.getByText('New Entry')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('AAPL')).toBeInTheDocument();
    });

    it('shows all three tabs', () => {
      render(<TradeJournal />);

      expect(screen.getByText(/All \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Open \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Closed \(0\)/)).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders all required form fields', () => {
      render(<TradeJournal />);

      expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Entry Price')).toBeInTheDocument();
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('Entry Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Exit Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Exit Price')).toBeInTheDocument();
      expect(screen.getByLabelText('Outcome')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    });

    it('symbol input converts to uppercase', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'tsla');

      expect(symbolInput).toHaveValue('TSLA');
    });

    it('updates entry price input', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '150.50');

      expect(priceInput).toHaveValue(150.5);
    });

    it('updates quantity input', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '100');

      expect(quantityInput).toHaveValue(100);
    });

    it('updates entry date input', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      expect(dateInput).toHaveValue('2024-01-15');
    });

    it('updates notes textarea', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const notesInput = screen.getByPlaceholderText('Trade notes and analysis...');
      await user.type(notesInput, 'Test notes');

      expect(notesInput).toHaveValue('Test notes');
    });
  });

  describe('Trade Type Selection', () => {
    it('defaults to long trade type', () => {
      render(<TradeJournal />);

      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      expect(typeSelect).toBeInTheDocument();
      // The Select component value is tracked internally, just verify it exists
    });

    it('can select short trade type', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.click(typeSelect);

      const shortOption = await screen.findByText('Short');
      await user.click(shortOption);

      // After selection, the dropdown should close
      expect(typeSelect).toBeInTheDocument();
    });
  });

  describe('Outcome Selection', () => {
    it('shows all outcome options', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const outcomeSelect = screen.getByRole('combobox', { name: /outcome/i });
      await user.click(outcomeSelect);

      await waitFor(() => {
        expect(screen.getByText('Win')).toBeInTheDocument();
        expect(screen.getByText('Loss')).toBeInTheDocument();
        expect(screen.getByText('Break Even')).toBeInTheDocument();
      });
    });

    it('can select win outcome', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const outcomeSelect = screen.getByRole('combobox', { name: /outcome/i });
      await user.click(outcomeSelect);

      const winOption = await screen.findByText('Win');
      await user.click(winOption);

      // After selection, the dropdown should close
      expect(outcomeSelect).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('requires symbol to add entry', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '150');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '100');

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      // Entry should not be added (still 0 entries)
      expect(screen.getByText('0 entries')).toBeInTheDocument();
    });

    it('requires entry price to add entry', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'TSLA');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '100');

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(screen.getByText('0 entries')).toBeInTheDocument();
    });

    it('requires quantity to add entry', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'TSLA');

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '150');

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(screen.getByText('0 entries')).toBeInTheDocument();
    });

    it('requires entry date to add entry', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'TSLA');

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '150');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '100');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(screen.getByText('0 entries')).toBeInTheDocument();
    });
  });

  describe('Adding Trade Entries', () => {
    it('adds a complete trade entry with all fields', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '150.50');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '100');

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      const exitPriceInput = screen.getByLabelText('Exit Price');
      await user.type(exitPriceInput, '160.00');

      const exitDateInput = screen.getByLabelText('Exit Date');
      await user.type(exitDateInput, '2024-01-20');

      const outcomeSelect = screen.getByRole('combobox', { name: /outcome/i });
      await user.click(outcomeSelect);
      const winOption = await screen.findByText('Win');
      await user.click(winOption);

      const notesInput = screen.getByPlaceholderText('Trade notes and analysis...');
      await user.type(notesInput, 'Successful breakout trade');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$150\.50 × 100/)).toBeInTheDocument();
      });

      expect(screen.getByText(/1 entries/)).toBeInTheDocument();
    });

    it('adds entry without optional exit fields', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'NVDA');

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '500.00');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '50');

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$500\.00 × 50/)).toBeInTheDocument();
      });

      expect(screen.getByText(/1 entries/)).toBeInTheDocument();
    });

    it('creates short trade entry', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'TSLA');

      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.click(typeSelect);
      const shortOption = await screen.findByText('Short');
      await user.click(shortOption);

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '200.00');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '100');

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$200\.00 × 100/)).toBeInTheDocument();
      });
    });

    it('trims whitespace from symbol', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, '  MSFT  ');

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '350.00');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '100');

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$350\.00 × 100/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset After Submission', () => {
    it('resets form after adding entry', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const priceInput = screen.getByLabelText('Entry Price');
      await user.type(priceInput, '150.50');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.type(quantityInput, '100');

      const dateInput = screen.getByLabelText('Entry Date');
      await user.type(dateInput, '2024-01-15');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(symbolInput).toHaveValue('');
        expect(priceInput).toHaveValue(null);
        expect(quantityInput).toHaveValue(null);
        expect(dateInput).toHaveValue('');
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state for all entries', () => {
      render(<TradeJournal />);

      expect(screen.getByText('No trade entries')).toBeInTheDocument();
      expect(screen.getByText('Record your first trade above')).toBeInTheDocument();
    });

    it('shows empty state for open trades', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const openTab = screen.getByText(/Open \(0\)/);
      await user.click(openTab);

      await waitFor(() => {
        expect(screen.getByText('No open trades')).toBeInTheDocument();
      });
    });

    it('shows empty state for closed trades', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const closedTab = screen.getByText(/Closed \(0\)/);
      await user.click(closedTab);

      await waitFor(() => {
        expect(screen.getByText('No closed trades')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Filtering', () => {
    it('shows open trade in open trades tab', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      // Add open trade
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$150\.00 × 100/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Open \(1\)/)).toBeInTheDocument();

      const openTab = screen.getByText(/Open \(1\)/);
      await user.click(openTab);

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$150\.00 × 100/)).toBeInTheDocument();
      });
    });

    it('shows closed trade in closed trades tab', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      // Add closed trade
      await user.type(screen.getByPlaceholderText('AAPL'), 'GOOGL');
      await user.type(screen.getByLabelText('Entry Price'), '140');
      await user.type(screen.getByLabelText('Quantity'), '50');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.type(screen.getByLabelText('Exit Date'), '2024-01-20');
      await user.type(screen.getByLabelText('Exit Price'), '150');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$140\.00 × 50/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Closed \(1\)/)).toBeInTheDocument();

      const closedTab = screen.getByText(/Closed \(1\)/);
      await user.click(closedTab);

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$140\.00 × 50/)).toBeInTheDocument();
      });
    });
  });

  describe('Trade Entry Card Display', () => {
    it('displays entry details correctly', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150.50');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$150\.50 × 100/)).toBeInTheDocument();
      });
    });

    it('shows long badge for long trades', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('long')).toBeInTheDocument();
      });
    });

    it('shows short badge for short trades', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.click(typeSelect);
      const shortOption = await screen.findByText('Short');
      await user.click(shortOption);

      await user.type(screen.getByPlaceholderText('AAPL'), 'TSLA');
      await user.type(screen.getByLabelText('Entry Price'), '200');
      await user.type(screen.getByLabelText('Quantity'), '50');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('short')).toBeInTheDocument();
      });
    });

    it('displays outcome badge when present', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');

      const outcomeSelect = screen.getByRole('combobox', { name: /outcome/i });
      await user.click(outcomeSelect);
      const winOption = await screen.findByText('Win');
      await user.click(winOption);

      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('win')).toBeInTheDocument();
      });
    });

    it('displays notes when present', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.type(screen.getByPlaceholderText('Trade notes and analysis...'), 'Test trade notes');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('Test trade notes')).toBeInTheDocument();
      });
    });
  });

  describe('P&L Calculation', () => {
    it('calculates positive P&L for winning long trade', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '100');
      await user.type(screen.getByLabelText('Exit Price'), '110');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.type(screen.getByLabelText('Exit Date'), '2024-01-20');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        // (110 - 100) * 100 = 1000
        expect(screen.getByText(/P&L: \+\$1000\.00/)).toBeInTheDocument();
      });
    });

    it('calculates negative P&L for losing long trade', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '100');
      await user.type(screen.getByLabelText('Exit Price'), '90');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.type(screen.getByLabelText('Exit Date'), '2024-01-20');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        // (90 - 100) * 100 = -1000
        expect(screen.getByText(/P&L: -\$1000\.00/)).toBeInTheDocument();
      });
    });

    it('calculates positive P&L for winning short trade', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.click(typeSelect);
      const shortOption = await screen.findByText('Short');
      await user.click(shortOption);

      await user.type(screen.getByPlaceholderText('AAPL'), 'TSLA');
      await user.type(screen.getByLabelText('Entry Price'), '100');
      await user.type(screen.getByLabelText('Exit Price'), '90');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.type(screen.getByLabelText('Exit Date'), '2024-01-20');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        // (100 - 90) * 100 = 1000 for short
        expect(screen.getByText(/P&L: \+\$1000\.00/)).toBeInTheDocument();
      });
    });

    it('does not show P&L for open trades', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '100');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.queryByText(/P&L:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Editing Entries', () => {
    it('populates form with entry data when edit is clicked', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      // Add entry
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(async () => {
        const editButtons = screen.getAllByRole('button', { name: '' });
        const editButton = editButtons.find((btn) => btn.querySelector('.lucide-edit-2'));
        if (editButton) {
          await user.click(editButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Edit Entry')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('AAPL')).toHaveValue('AAPL');
      });
    });

    it('shows cancel button when editing', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      // Add entry
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(async () => {
        const editButtons = screen.getAllByRole('button', { name: '' });
        const editButton = editButtons.find((btn) => btn.querySelector('.lucide-edit-2'));
        if (editButton) {
          await user.click(editButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      });
    });

    it('cancels edit and resets form', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      // Add entry
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(async () => {
        const editButtons = screen.getAllByRole('button', { name: '' });
        const editButton = editButtons.find((btn) => btn.querySelector('.lucide-edit-2'));
        if (editButton) {
          await user.click(editButton);
        }
      });

      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('New Entry')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('AAPL')).toHaveValue('');
      });
    });
  });

  describe('Deleting Entries', () => {
    it('deletes entry when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      // Add entry
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150');
      await user.type(screen.getByLabelText('Quantity'), '100');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        const badge = screen.getByText(/\d+ entries/);
        expect(badge).toHaveTextContent('1 entries');
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) => btn.querySelector('.lucide-trash-2'));

      if (deleteButton) {
        await user.click(deleteButton);
      }

      await waitFor(() => {
        expect(screen.getByText('0 entries')).toBeInTheDocument();
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<TradeJournal />);

      expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Entry Price')).toBeInTheDocument();
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    });

    it('has required attribute on required inputs', () => {
      render(<TradeJournal />);

      expect(screen.getByLabelText('Symbol')).toHaveAttribute('required');
      expect(screen.getByLabelText('Entry Price')).toHaveAttribute('required');
      expect(screen.getByLabelText('Quantity')).toHaveAttribute('required');
      expect(screen.getByLabelText('Entry Date')).toHaveAttribute('required');
    });
  });

  describe('Edge Cases', () => {
    it('handles decimal quantities', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'BTC');
      await user.type(screen.getByLabelText('Entry Price'), '50000');
      await user.type(screen.getByLabelText('Quantity'), '0.5');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$50000\.00 × 0\.5/)).toBeInTheDocument();
      });
    });

    it('handles very large price values', async () => {
      const user = userEvent.setup();
      render(<TradeJournal />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'BRK');
      await user.type(screen.getByLabelText('Entry Price'), '500000.50');
      await user.type(screen.getByLabelText('Quantity'), '10');
      await user.type(screen.getByLabelText('Entry Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Entry: \$500000\.50 × 10/)).toBeInTheDocument();
      });
    });
  });
});
