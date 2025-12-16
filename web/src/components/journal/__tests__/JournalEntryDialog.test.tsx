import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JournalEntryDialog } from '../JournalEntryDialog';
import type { JournalEntry } from '@/lib/stores/journal-store';
import type { ThesisEntry } from '@/lib/stores/thesis-store';

// Mock the LazyRichTextEditor
vi.mock('@/components/lazy', () => ({
  LazyRichTextEditor: ({ content, onChange, placeholder }: any) => (
    <textarea
      data-testid="rich-text-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock ScreenshotUploader
vi.mock('../ScreenshotUploader', () => ({
  ScreenshotUploader: ({ value, onChange, maxFiles, disabled }: any) => (
    <div data-testid="screenshot-uploader">
      <div data-testid="screenshot-count">{value?.length || 0}</div>
      <button
        onClick={() => onChange([...value, 'http://example.com/screenshot.png'])}
        disabled={disabled}
      >
        Upload Screenshot
      </button>
    </div>
  ),
}));

describe('JournalEntryDialog', () => {
  const mockOnAddEntry = vi.fn();
  const mockOnUpdateEntry = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onAddEntry: mockOnAddEntry,
    onUpdateEntry: mockOnUpdateEntry,
    activeTheses: [] as ThesisEntry[],
  };

  const mockTheses: ThesisEntry[] = [
    {
      id: 'thesis-1',
      symbol: 'AAPL',
      title: 'Apple Growth Thesis',
      hypothesis: 'Apple will grow',
      status: 'active',
      timeframe: '6-12 months',
      keyConditions: ['Revenue growth > 10%', 'Services growth continues'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'thesis-2',
      symbol: 'MSFT',
      title: 'Microsoft Cloud Expansion',
      hypothesis: 'Microsoft cloud will dominate',
      status: 'active',
      timeframe: '1-2 years',
      keyConditions: ['Azure growth > 20%', 'Enterprise adoption'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAddEntry.mockResolvedValue({ id: 'new-entry' } as JournalEntry);
    mockOnUpdateEntry.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<JournalEntryDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows "New Journal Entry" title for new entry', () => {
      render(<JournalEntryDialog {...defaultProps} />);
      expect(screen.getByText('New Journal Entry')).toBeInTheDocument();
    });

    it('shows "Edit Journal Entry" title for editing', () => {
      render(<JournalEntryDialog {...defaultProps} editingId="entry-1" />);
      expect(screen.getByText('Edit Journal Entry')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<JournalEntryDialog {...defaultProps} />);

      expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Direction')).toBeInTheDocument();
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('Entry Price')).toBeInTheDocument();
      expect(screen.getByLabelText('Exit Price (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Emotion at Entry')).toBeInTheDocument();
      expect(screen.getByLabelText('Emotion at Exit (optional)')).toBeInTheDocument();
    });

    it('renders rich text editors for notes and lessons learned', () => {
      render(<JournalEntryDialog {...defaultProps} />);

      const richTextEditors = screen.getAllByTestId('rich-text-editor');
      expect(richTextEditors).toHaveLength(2);
    });

    it('renders screenshot uploader', () => {
      render(<JournalEntryDialog {...defaultProps} />);
      expect(screen.getByTestId('screenshot-uploader')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('updates symbol input', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      const symbolInput = screen.getByLabelText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'AAPL');

      expect(symbolInput).toHaveValue('AAPL');
    });

    it('updates date input', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      const dateInput = screen.getByLabelText('Date');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-01-15');

      expect(dateInput).toHaveValue('2024-01-15');
    });

    it('updates entry price input', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      const priceInput = screen.getByLabelText('Entry Price');
      await user.clear(priceInput);
      await user.type(priceInput, '150.50');

      expect(priceInput).toHaveValue(150.50);
    });

    it('updates exit price input', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      const exitPriceInput = screen.getByLabelText('Exit Price (optional)');
      await user.clear(exitPriceInput);
      await user.type(exitPriceInput, '155.75');

      expect(exitPriceInput).toHaveValue(155.75);
    });

    it('updates quantity input', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      const quantityInput = screen.getByLabelText('Quantity');
      await user.clear(quantityInput);
      await user.type(quantityInput, '100');

      expect(quantityInput).toHaveValue(100);
    });

    it('changes direction from long to short', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      const directionSelect = screen.getByRole('combobox', { name: /direction/i });
      await user.click(directionSelect);

      const shortOption = screen.getByRole('option', { name: /short/i });
      await user.click(shortOption);

      await waitFor(() => {
        expect(directionSelect).toHaveTextContent('Short');
      });
    });

    it('changes emotion at entry', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      const emotionSelect = screen.getAllByRole('combobox')[1]; // Second combobox
      await user.click(emotionSelect);

      const confidentOption = screen.getByRole('option', { name: /💪 Confident/i });
      await user.click(confidentOption);

      await waitFor(() => {
        expect(emotionSelect).toHaveTextContent('Confident');
      });
    });
  });

  describe('existing entry editing', () => {
    const existingEntry: Partial<JournalEntry> = {
      id: 'entry-1',
      symbol: 'TSLA',
      tradeDate: '2024-01-15T00:00:00.000Z',
      direction: 'short',
      entryPrice: 200.50,
      exitPrice: 195.25,
      quantity: 50,
      emotionAtEntry: 'confident',
      emotionAtExit: 'relief',
      notes: '<p>Test notes</p>',
      lessonsLearned: '<p>Test lessons</p>',
      screenshotUrls: ['http://example.com/screenshot1.png'],
    };

    it('populates form with existing entry data', () => {
      render(
        <JournalEntryDialog
          {...defaultProps}
          editingId="entry-1"
          existingEntry={existingEntry as JournalEntry}
        />
      );

      expect(screen.getByLabelText('Symbol')).toHaveValue('TSLA');
      expect(screen.getByLabelText('Date')).toHaveValue('2024-01-15');
      expect(screen.getByLabelText('Entry Price')).toHaveValue(200.50);
      expect(screen.getByLabelText('Exit Price (optional)')).toHaveValue(195.25);
      expect(screen.getByLabelText('Quantity')).toHaveValue(50);

      const richTextEditors = screen.getAllByTestId('rich-text-editor');
      expect(richTextEditors[0]).toHaveValue('<p>Test notes</p>');
      expect(richTextEditors[1]).toHaveValue('<p>Test lessons</p>');

      expect(screen.getByTestId('screenshot-count')).toHaveTextContent('1');
    });
  });

  describe('thesis linking', () => {
    it('shows thesis linking section when theses are available', () => {
      render(<JournalEntryDialog {...defaultProps} activeTheses={mockTheses} />);

      expect(screen.getByText('Link to Thesis (optional)')).toBeInTheDocument();
    });

    it('does not show thesis linking when no theses available', () => {
      render(<JournalEntryDialog {...defaultProps} activeTheses={[]} />);

      expect(screen.queryByText('Link to Thesis (optional)')).not.toBeInTheDocument();
    });

    it('allows selecting a thesis', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} activeTheses={mockTheses} />);

      const thesisSelect = screen.getByRole('combobox', { name: /link to thesis/i });
      await user.click(thesisSelect);

      const thesisOption = screen.getByRole('option', { name: /AAPL.*Apple Growth Thesis/i });
      await user.click(thesisOption);

      await waitFor(() => {
        expect(thesisSelect).toHaveTextContent('AAPL');
      });
    });

    it('allows unlinking a thesis', async () => {
      const user = userEvent.setup();
      const existingEntry = {
        ...defaultProps,
        editingId: 'entry-1',
        existingEntry: {
          id: 'entry-1',
          symbol: 'AAPL',
          thesisId: 'thesis-1',
        } as JournalEntry,
        activeTheses: mockTheses,
      };

      render(<JournalEntryDialog {...existingEntry} />);

      const unlinkButton = screen.getByTitle('Unlink thesis');
      await user.click(unlinkButton);

      await waitFor(() => {
        expect(screen.queryByTitle('Unlink thesis')).not.toBeInTheDocument();
      });
    });

    it('shows matching thesis count for symbol', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} activeTheses={mockTheses} />);

      const symbolInput = screen.getByLabelText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'AAPL');

      await waitFor(() => {
        expect(screen.getByText(/1 thesis found for AAPL/i)).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('submits new entry with valid data', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      // Fill in required fields
      await user.type(screen.getByLabelText('Symbol'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150.00');
      await user.type(screen.getByLabelText('Quantity'), '100');

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnAddEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'AAPL',
            entryPrice: 150,
            quantity: 100,
          })
        );
      });
    });

    it('submits update for existing entry', async () => {
      const user = userEvent.setup();
      const existingEntry: Partial<JournalEntry> = {
        id: 'entry-1',
        symbol: 'AAPL',
        entryPrice: 150,
        quantity: 100,
      };

      render(
        <JournalEntryDialog
          {...defaultProps}
          editingId="entry-1"
          existingEntry={existingEntry as JournalEntry}
        />
      );

      const symbolInput = screen.getByLabelText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'MSFT');

      const updateButton = screen.getByRole('button', { name: /Update Entry/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockOnUpdateEntry).toHaveBeenCalledWith(
          'entry-1',
          expect.objectContaining({
            symbol: 'MSFT',
          })
        );
      });
    });

    it('converts symbol to uppercase on submit', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText('Symbol'), 'aapl');
      await user.type(screen.getByLabelText('Entry Price'), '150.00');
      await user.type(screen.getByLabelText('Quantity'), '100');

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnAddEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'AAPL',
          })
        );
      });
    });

    it('closes dialog after successful submission', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText('Symbol'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150.00');
      await user.type(screen.getByLabelText('Quantity'), '100');

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText('Symbol'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150.00');

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnAddEntry).toHaveBeenCalled();
      });

      // Form should be reset for next entry
      expect(screen.getByLabelText('Symbol')).toHaveValue('');
    });

    it('disables save button when symbol is missing', () => {
      render(<JournalEntryDialog {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      expect(saveButton).toBeDisabled();
    });

    it('disables save button when entry price is missing', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText('Symbol'), 'AAPL');

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      expect(saveButton).toBeDisabled();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: any;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnAddEntry.mockReturnValue(submitPromise);

      render(<JournalEntryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText('Symbol'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150.00');
      await user.type(screen.getByLabelText('Quantity'), '100');

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
        expect(saveButton).toBeDisabled();
      });

      resolveSubmit({ id: 'new-entry' });
    });

    it('includes exit price when provided', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText('Symbol'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150.00');
      await user.type(screen.getByLabelText('Exit Price (optional)'), '155.00');
      await user.type(screen.getByLabelText('Quantity'), '100');

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnAddEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            exitPrice: 155,
          })
        );
      });
    });

    it('includes screenshot URLs in submission', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText('Symbol'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150.00');
      await user.type(screen.getByLabelText('Quantity'), '100');

      const uploadButton = screen.getByRole('button', { name: 'Upload Screenshot' });
      await user.click(uploadButton);

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnAddEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            screenshotUrls: ['http://example.com/screenshot.png'],
          })
        );
      });
    });
  });

  describe('cancel action', () => {
    it('closes dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<JournalEntryDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('disables cancel button during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: any;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnAddEntry.mockReturnValue(submitPromise);

      render(<JournalEntryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText('Symbol'), 'AAPL');
      await user.type(screen.getByLabelText('Entry Price'), '150.00');
      await user.type(screen.getByLabelText('Quantity'), '100');

      const saveButton = screen.getByRole('button', { name: /Save Entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        expect(cancelButton).toBeDisabled();
      });

      resolveSubmit({ id: 'new-entry' });
    });
  });

  describe('default values', () => {
    it('sets default date to today', () => {
      render(<JournalEntryDialog {...defaultProps} />);

      const dateInput = screen.getByLabelText('Date');
      const today = new Date().toISOString().split('T')[0];

      expect(dateInput).toHaveValue(today);
    });

    it('sets default direction to long', () => {
      render(<JournalEntryDialog {...defaultProps} />);

      const directionSelect = screen.getByRole('combobox', { name: /direction/i });
      expect(directionSelect).toHaveTextContent('Long');
    });

    it('sets default emotion at entry to neutral', () => {
      render(<JournalEntryDialog {...defaultProps} />);

      // The second combobox is emotion at entry
      const emotionSelects = screen.getAllByRole('combobox');
      const emotionAtEntry = emotionSelects[1];
      expect(emotionAtEntry).toHaveTextContent('Neutral');
    });
  });
});
