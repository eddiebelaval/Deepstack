import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WatchlistManagementDialog } from '../WatchlistManagementDialog';
import { useWatchlistSync } from '@/hooks/useWatchlistSync';

// Mock dependencies
vi.mock('@/hooks/useWatchlistSync');

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(({ open, children }) => (open ? <div role="dialog" data-testid="dialog">{children}</div> : null)),
  DialogContent: vi.fn(({ children }) => <div>{children}</div>),
  DialogHeader: vi.fn(({ children }) => <div>{children}</div>),
  DialogTitle: vi.fn(({ children }) => <div>{children}</div>),
  DialogDescription: vi.fn(({ children }) => <div>{children}</div>),
  DialogFooter: vi.fn(({ children }) => <div>{children}</div>),
}));

// Mock AlertDialog to avoid rendering issues
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: vi.fn(({ open, children }) => (open ? <div data-testid="alert-dialog">{children}</div> : null)),
  AlertDialogContent: vi.fn(({ children }) => <div>{children}</div>),
  AlertDialogHeader: vi.fn(({ children }) => <div>{children}</div>),
  AlertDialogTitle: vi.fn(({ children }) => <div>{children}</div>),
  AlertDialogDescription: vi.fn(({ children }) => <div>{children}</div>),
  AlertDialogFooter: vi.fn(({ children }) => <div>{children}</div>),
  AlertDialogCancel: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
  AlertDialogAction: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
}));

// Mock ScrollArea
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn(({ children }) => <div data-testid="scroll-area">{children}</div>),
}));

describe('WatchlistManagementDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockCreateWatchlist = vi.fn();
  const mockDeleteWatchlist = vi.fn();
  const mockRenameWatchlist = vi.fn();
  const mockSetActiveWatchlist = vi.fn();
  const mockImportSymbols = vi.fn();

  const mockWatchlists = [
    {
      id: 'watchlist-1',
      name: 'My Watchlist',
      items: [
        { symbol: 'AAPL', addedAt: '2024-01-01', notes: 'Test note' },
        { symbol: 'MSFT', addedAt: '2024-01-02', notes: '' },
      ],
    },
    {
      id: 'watchlist-2',
      name: 'Tech Stocks',
      items: [{ symbol: 'NVDA', addedAt: '2024-01-03' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateWatchlist.mockResolvedValue(undefined);
    mockDeleteWatchlist.mockResolvedValue(undefined);
    mockRenameWatchlist.mockResolvedValue(undefined);
    mockImportSymbols.mockResolvedValue(undefined);

    vi.mocked(useWatchlistSync).mockReturnValue({
      watchlists: mockWatchlists,
      activeWatchlistId: 'watchlist-1',
      createWatchlist: mockCreateWatchlist,
      deleteWatchlist: mockDeleteWatchlist,
      renameWatchlist: mockRenameWatchlist,
      setActiveWatchlist: mockSetActiveWatchlist,
      importSymbols: mockImportSymbols,
    } as any);
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<WatchlistManagementDialog open={false} onOpenChange={mockOnOpenChange} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays title', () => {
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Manage Watchlists')).toBeInTheDocument();
    });

    it('displays description', () => {
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Create, edit, and organize your watchlists')).toBeInTheDocument();
    });

    it('renders all watchlists', () => {
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('My Watchlist')).toBeInTheDocument();
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument();
    });

    it('shows symbol count for each watchlist', () => {
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('2 symbols')).toBeInTheDocument();
      expect(screen.getByText('1 symbol')).toBeInTheDocument();
    });

    it('highlights active watchlist', () => {
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Active watchlist has star icon
      expect(document.querySelector('.fill-primary')).toBeInTheDocument();
    });

    it('renders Create New Watchlist button', () => {
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Create New Watchlist')).toBeInTheDocument();
    });

    it('renders Done button', () => {
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });
  });

  describe('Creating Watchlist', () => {
    it('shows input when Create New Watchlist is clicked', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('Create New Watchlist'));

      expect(screen.getByPlaceholderText('Watchlist name...')).toBeInTheDocument();
    });

    it('creates watchlist on confirm', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('Create New Watchlist'));
      await user.type(screen.getByPlaceholderText('Watchlist name...'), 'New List');

      // Click check button
      const checkButton = document.querySelector('.lucide-check')?.closest('button');
      if (checkButton) {
        await user.click(checkButton);
      }

      await waitFor(() => {
        expect(mockCreateWatchlist).toHaveBeenCalledWith('New List');
      });
    });

    it('creates watchlist on Enter key', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('Create New Watchlist'));
      await user.type(screen.getByPlaceholderText('Watchlist name...'), 'New List{enter}');

      await waitFor(() => {
        expect(mockCreateWatchlist).toHaveBeenCalledWith('New List');
      });
    });

    it('cancels creation on X button', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('Create New Watchlist'));

      const xButton = document.querySelector('.lucide-x')?.closest('button');
      if (xButton) {
        await user.click(xButton);
      }

      expect(screen.queryByPlaceholderText('Watchlist name...')).not.toBeInTheDocument();
    });

    it('cancels creation on Escape key', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('Create New Watchlist'));
      await user.type(screen.getByPlaceholderText('Watchlist name...'), '{escape}');

      expect(screen.queryByPlaceholderText('Watchlist name...')).not.toBeInTheDocument();
    });

    it('does not create with empty name', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('Create New Watchlist'));

      const checkButton = document.querySelector('.lucide-check')?.closest('button');
      if (checkButton) {
        await user.click(checkButton);
      }

      expect(mockCreateWatchlist).not.toHaveBeenCalled();
    });
  });

  describe('Renaming Watchlist', () => {
    it('shows input when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const editButtons = document.querySelectorAll('.lucide-edit-2');
      if (editButtons[0]) {
        await user.click(editButtons[0].closest('button')!);
      }

      expect(screen.getByDisplayValue('My Watchlist')).toBeInTheDocument();
    });

    it('renames watchlist on confirm', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const editButtons = document.querySelectorAll('.lucide-edit-2');
      if (editButtons[0]) {
        await user.click(editButtons[0].closest('button')!);
      }

      const input = screen.getByDisplayValue('My Watchlist');
      await user.clear(input);
      await user.type(input, 'Renamed List{enter}');

      await waitFor(() => {
        expect(mockRenameWatchlist).toHaveBeenCalledWith('watchlist-1', 'Renamed List');
      });
    });

    it('cancels rename on Escape', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const editButtons = document.querySelectorAll('.lucide-edit-2');
      if (editButtons[0]) {
        await user.click(editButtons[0].closest('button')!);
      }

      const input = screen.getByDisplayValue('My Watchlist');
      await user.type(input, '{escape}');

      expect(mockRenameWatchlist).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue('My Watchlist')).not.toBeInTheDocument();
    });
  });

  describe('Deleting Watchlist', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      // Second delete button (first watchlist can't be deleted if it's the only one)
      if (deleteButtons[1]) {
        await user.click(deleteButtons[1].closest('button')!);
      }

      expect(screen.getByText('Delete Watchlist?')).toBeInTheDocument();
    });

    it('shows watchlist name in confirmation', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      if (deleteButtons[1]) {
        await user.click(deleteButtons[1].closest('button')!);
      }

      expect(screen.getByText(/Tech Stocks/)).toBeInTheDocument();
    });

    it('deletes watchlist on confirm', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      if (deleteButtons[1]) {
        await user.click(deleteButtons[1].closest('button')!);
      }

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(mockDeleteWatchlist).toHaveBeenCalledWith('watchlist-2');
      });
    });

    it('cancels delete on cancel', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      if (deleteButtons[1]) {
        await user.click(deleteButtons[1].closest('button')!);
      }

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockDeleteWatchlist).not.toHaveBeenCalled();
    });

    it('disables delete for last watchlist', () => {
      vi.mocked(useWatchlistSync).mockReturnValue({
        watchlists: [mockWatchlists[0]],
        activeWatchlistId: 'watchlist-1',
        createWatchlist: mockCreateWatchlist,
        deleteWatchlist: mockDeleteWatchlist,
        renameWatchlist: mockRenameWatchlist,
        setActiveWatchlist: mockSetActiveWatchlist,
        importSymbols: mockImportSymbols,
      } as any);

      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const deleteButton = document.querySelector('.lucide-trash-2')?.closest('button');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Setting Active Watchlist', () => {
    it('calls setActiveWatchlist when clicking watchlist', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('Tech Stocks'));

      expect(mockSetActiveWatchlist).toHaveBeenCalledWith('watchlist-2');
    });
  });

  describe('Export', () => {
    it('exports watchlist to CSV on export click', async () => {
      const user = userEvent.setup();
      const createObjectURLMock = vi.fn().mockReturnValue('blob:url');
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      const exportButtons = document.querySelectorAll('.lucide-download');
      if (exportButtons[0]) {
        await user.click(exportButtons[0].closest('button')!);
      }

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalled();
    });
  });

  describe('Done Button', () => {
    it('closes dialog on Done click', async () => {
      const user = userEvent.setup();
      render(<WatchlistManagementDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByRole('button', { name: /done/i }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
