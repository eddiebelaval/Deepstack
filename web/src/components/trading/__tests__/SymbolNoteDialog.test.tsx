import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SymbolNoteDialog } from '../SymbolNoteDialog';
import { useWatchlistSync } from '@/hooks/useWatchlistSync';

// Mock dependencies
vi.mock('@/hooks/useWatchlistSync');

describe('SymbolNoteDialog', () => {
  const mockUpdateSymbolNotes = vi.fn();
  const mockGetActiveWatchlist = vi.fn();
  const mockOnOpenChange = vi.fn();

  const mockWatchlist = {
    id: 'watchlist-1',
    name: 'My Watchlist',
    items: [
      { symbol: 'AAPL', notes: 'Existing note for AAPL', addedAt: '2024-01-01' },
      { symbol: 'MSFT', notes: '', addedAt: '2024-01-02' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetActiveWatchlist.mockReturnValue(mockWatchlist);
    mockUpdateSymbolNotes.mockResolvedValue(undefined);

    vi.mocked(useWatchlistSync).mockReturnValue({
      updateSymbolNotes: mockUpdateSymbolNotes,
      getActiveWatchlist: mockGetActiveWatchlist,
    } as any);
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(
        <SymbolNoteDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays symbol in title', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      expect(screen.getByText('Add Note for AAPL')).toBeInTheDocument();
    });

    it('displays description text', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      expect(screen.getByText(/add notes, trading ideas/i)).toBeInTheDocument();
    });

    it('renders textarea for notes', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders Cancel and Save buttons', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save note/i })).toBeInTheDocument();
    });
  });

  describe('Loading Existing Notes', () => {
    it('loads existing note when dialog opens', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      expect(textarea).toHaveValue('Existing note for AAPL');
    });

    it('shows empty textarea for symbol without notes', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="MSFT"
          watchlistId="watchlist-1"
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      expect(textarea).toHaveValue('');
    });

    it('handles symbol not in watchlist', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="TSLA"
          watchlistId="watchlist-1"
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      expect(textarea).toHaveValue('');
    });
  });

  describe('Editing Notes', () => {
    it('allows typing in textarea', async () => {
      const user = userEvent.setup();
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="MSFT"
          watchlistId="watchlist-1"
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      await user.type(textarea, 'New trading idea');

      expect(textarea).toHaveValue('New trading idea');
    });

    it('allows clearing existing notes', async () => {
      const user = userEvent.setup();
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      await user.clear(textarea);

      expect(textarea).toHaveValue('');
    });
  });

  describe('Saving Notes', () => {
    it('calls updateSymbolNotes on save', async () => {
      const user = userEvent.setup();
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="MSFT"
          watchlistId="watchlist-1"
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      await user.type(textarea, 'New note');

      await user.click(screen.getByRole('button', { name: /save note/i }));

      await waitFor(() => {
        expect(mockUpdateSymbolNotes).toHaveBeenCalledWith(
          'watchlist-1',
          'MSFT',
          'New note'
        );
      });
    });

    it('trims whitespace from notes', async () => {
      const user = userEvent.setup();
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="MSFT"
          watchlistId="watchlist-1"
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      await user.type(textarea, '  Note with spaces  ');

      await user.click(screen.getByRole('button', { name: /save note/i }));

      await waitFor(() => {
        expect(mockUpdateSymbolNotes).toHaveBeenCalledWith(
          'watchlist-1',
          'MSFT',
          'Note with spaces'
        );
      });
    });

    it('closes dialog after saving', async () => {
      const user = userEvent.setup();
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="MSFT"
          watchlistId="watchlist-1"
        />
      );

      await user.click(screen.getByRole('button', { name: /save note/i }));

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Canceling', () => {
    it('closes dialog on cancel', async () => {
      const user = userEvent.setup();
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId="watchlist-1"
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not save on cancel', async () => {
      const user = userEvent.setup();
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="MSFT"
          watchlistId="watchlist-1"
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      await user.type(textarea, 'Unsaved note');
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockUpdateSymbolNotes).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles null symbol', () => {
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol={null}
          watchlistId="watchlist-1"
        />
      );

      expect(screen.getByText('Add Note for')).toBeInTheDocument();
    });

    it('handles null watchlistId', async () => {
      const user = userEvent.setup();
      render(
        <SymbolNoteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          symbol="AAPL"
          watchlistId={null}
        />
      );

      await user.click(screen.getByRole('button', { name: /save note/i }));

      expect(mockUpdateSymbolNotes).not.toHaveBeenCalled();
    });
  });
});
