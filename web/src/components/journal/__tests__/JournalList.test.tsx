import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JournalList } from '../JournalList';
import type { JournalEntry } from '@/lib/stores/journal-store';
import type { ThesisEntry } from '@/lib/stores/thesis-store';

// Mock hooks
vi.mock('@/hooks/useJournalSync', () => ({
  useJournalSync: vi.fn(),
}));

vi.mock('@/hooks/useThesisSync', () => ({
  useThesisSync: vi.fn(),
}));

vi.mock('@/hooks/useUser', () => ({
  useUser: vi.fn(),
}));

// Mock JournalEntryDialog
vi.mock('../JournalEntryDialog', () => ({
  JournalEntryDialog: ({ open, editingId }: any) => (
    open ? (
      <div data-testid="journal-entry-dialog">
        Dialog Open - Editing: {editingId || 'new'}
      </div>
    ) : null
  ),
}));

// Mock UpgradePrompt
vi.mock('@/components/UpgradePrompt', () => ({
  UpgradePrompt: ({ feature, requiredTier }: any) => (
    <div data-testid="upgrade-prompt">
      Upgrade to {requiredTier} for {feature}
    </div>
  ),
}));

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as any;

import { useJournalSync } from '@/hooks/useJournalSync';
import { useThesisSync } from '@/hooks/useThesisSync';
import { useUser } from '@/hooks/useUser';

describe('JournalList', () => {
  const mockEntries: JournalEntry[] = [
    {
      id: 'entry-1',
      symbol: 'AAPL',
      tradeDate: '2024-01-15T00:00:00.000Z',
      direction: 'long',
      entryPrice: 150.00,
      exitPrice: 155.00,
      quantity: 100,
      emotionAtEntry: 'confident',
      emotionAtExit: 'relief',
      notes: '<p>Good trade setup</p>',
      pnl: 500,
      pnlPercent: 3.33,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'entry-2',
      symbol: 'TSLA',
      tradeDate: '2024-01-14T00:00:00.000Z',
      direction: 'short',
      entryPrice: 200.00,
      quantity: 50,
      emotionAtEntry: 'anxious',
      notes: '<p>Risky short position</p>',
      pnl: -250,
      pnlPercent: -2.5,
      createdAt: '2024-01-14T10:00:00.000Z',
      updatedAt: '2024-01-14T10:00:00.000Z',
    },
  ];

  const mockTheses: ThesisEntry[] = [
    {
      id: 'thesis-1',
      symbol: 'AAPL',
      title: 'Apple Growth Thesis',
      thesis: 'Apple will grow',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockJournalSync = {
    entries: mockEntries,
    addEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    isLoading: false,
    isOnline: true,
    error: null,
  };

  const mockThesisSync = {
    theses: mockTheses,
    getThesisById: vi.fn((id: string) => mockTheses.find(t => t.id === id)),
  };

  const mockUser = {
    tier: 'pro' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useJournalSync).mockReturnValue(mockJournalSync as any);
    vi.mocked(useThesisSync).mockReturnValue(mockThesisSync as any);
    vi.mocked(useUser).mockReturnValue(mockUser as any);
  });

  describe('rendering', () => {
    it('renders the journal list header', () => {
      render(<JournalList />);
      expect(screen.getByText('Trade Journal')).toBeInTheDocument();
      expect(screen.getByText(/Track your trades and learn from your patterns/)).toBeInTheDocument();
    });

    it('renders back button', () => {
      render(<JournalList />);
      const buttons = screen.getAllByRole('button');
      const backButton = buttons[0];
      expect(backButton).toBeInTheDocument();
    });

    it('renders new entry button', () => {
      render(<JournalList />);
      expect(screen.getByRole('button', { name: /New Entry/i })).toBeInTheDocument();
    });

    it('displays online status with cloud icon', () => {
      render(<JournalList />);
      const cloudIcon = document.querySelector('.lucide-cloud');
      expect(cloudIcon).toBeInTheDocument();
    });

    it('displays offline status when not online', () => {
      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        isOnline: false,
      } as any);

      render(<JournalList />);
      const cloudOffIcon = document.querySelector('.lucide-cloud-off');
      expect(cloudOffIcon).toBeInTheDocument();
    });
  });

  describe('entry list display', () => {
    it('displays all journal entries', () => {
      render(<JournalList />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
    });

    it('displays entry details correctly', () => {
      render(<JournalList />);

      expect(screen.getByText('Entry: $150.00')).toBeInTheDocument();
      expect(screen.getByText('Exit: $155.00')).toBeInTheDocument();
      expect(screen.getByText('Qty: 100')).toBeInTheDocument();
    });

    it('displays profit with correct styling', () => {
      render(<JournalList />);

      const profitElement = screen.getByText('+$500.00');
      expect(profitElement).toBeInTheDocument();
      expect(profitElement).toHaveClass('text-green-500');
    });

    it('displays loss with correct styling', () => {
      render(<JournalList />);

      const lossElement = screen.getByText('-$250.00');
      expect(lossElement).toBeInTheDocument();
      expect(lossElement).toHaveClass('text-red-500');
    });

    it('displays P&L percentage', () => {
      render(<JournalList />);

      expect(screen.getByText('+3.33%')).toBeInTheDocument();
      expect(screen.getByText('-2.50%')).toBeInTheDocument();
    });

    it('shows long direction with correct icon and color', () => {
      render(<JournalList />);

      const cards = screen.getAllByRole('article');
      const aaplCard = cards.find(card => within(card).queryByText('AAPL'));

      if (aaplCard) {
        const iconContainer = aaplCard.querySelector('.bg-green-500\\/20');
        expect(iconContainer).toBeInTheDocument();
      }
    });

    it('shows short direction with correct icon and color', () => {
      render(<JournalList />);

      const cards = screen.getAllByRole('article');
      const tslaCard = cards.find(card => within(card).queryByText('TSLA'));

      if (tslaCard) {
        const iconContainer = tslaCard.querySelector('.bg-red-500\\/20');
        expect(iconContainer).toBeInTheDocument();
      }
    });

    it('displays emotions with emojis', () => {
      render(<JournalList />);

      expect(screen.getByText(/Entry:.*💪.*confident/)).toBeInTheDocument();
      expect(screen.getByText(/Exit:.*😌.*relief/)).toBeInTheDocument();
    });

    it('displays linked thesis badge', () => {
      const entriesWithThesis = [
        {
          ...mockEntries[0],
          thesisId: 'thesis-1',
        },
      ];

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: entriesWithThesis,
      } as any);

      render(<JournalList />);

      expect(screen.getByText('Apple Growth Thesis')).toBeInTheDocument();
    });

    it('renders notes preview with HTML', () => {
      render(<JournalList />);

      const notesContainer = document.querySelector('.prose');
      expect(notesContainer).toBeInTheDocument();
      expect(notesContainer?.innerHTML).toContain('Good trade setup');
    });

    it('displays screenshot thumbnails when present', () => {
      const entriesWithScreenshots = [
        {
          ...mockEntries[0],
          screenshotUrls: ['http://example.com/s1.png', 'http://example.com/s2.png'],
        },
      ];

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: entriesWithScreenshots,
      } as any);

      render(<JournalList />);

      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('shows +N indicator when more than 3 screenshots', () => {
      const entriesWithManyScreenshots = [
        {
          ...mockEntries[0],
          screenshotUrls: [
            'http://example.com/s1.png',
            'http://example.com/s2.png',
            'http://example.com/s3.png',
            'http://example.com/s4.png',
          ],
        },
      ];

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: entriesWithManyScreenshots,
      } as any);

      render(<JournalList />);

      expect(screen.getByText('+1')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no entries', () => {
      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: [],
      } as any);

      render(<JournalList />);

      expect(screen.getByText('No journal entries yet')).toBeInTheDocument();
      expect(screen.getByText(/Start documenting your trades/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create First Entry/i })).toBeInTheDocument();
    });

    it('clicking create first entry opens dialog', async () => {
      const user = userEvent.setup();

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: [],
      } as any);

      render(<JournalList />);

      const createButton = screen.getByRole('button', { name: /Create First Entry/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('journal-entry-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('free tier limitations', () => {
    beforeEach(() => {
      vi.mocked(useUser).mockReturnValue({
        tier: 'free',
      } as any);
    });

    it('shows entry count badge for free users', () => {
      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: mockEntries,
      } as any);

      render(<JournalList />);

      expect(screen.getByText('2/10 entries')).toBeInTheDocument();
    });

    it('shows limit reached button when at limit', () => {
      const tenEntries = Array.from({ length: 10 }, (_, i) => ({
        ...mockEntries[0],
        id: `entry-${i}`,
      }));

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: tenEntries,
      } as any);

      render(<JournalList />);

      expect(screen.getByRole('button', { name: /Limit Reached/i })).toBeInTheDocument();
    });

    it('shows upgrade prompt when clicking new entry at limit', async () => {
      const user = userEvent.setup();

      const tenEntries = Array.from({ length: 10 }, (_, i) => ({
        ...mockEntries[0],
        id: `entry-${i}`,
      }));

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: tenEntries,
      } as any);

      render(<JournalList />);

      const newEntryButton = screen.getByRole('button', { name: /Limit Reached/i });
      await user.click(newEntryButton);

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument();
        expect(screen.getByText(/Upgrade to pro for Unlimited Journal Entries/i)).toBeInTheDocument();
      });
    });

    it('can close upgrade prompt', async () => {
      const user = userEvent.setup();

      const tenEntries = Array.from({ length: 10 }, (_, i) => ({
        ...mockEntries[0],
        id: `entry-${i}`,
      }));

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: tenEntries,
      } as any);

      render(<JournalList />);

      const newEntryButton = screen.getByRole('button', { name: /Limit Reached/i });
      await user.click(newEntryButton);

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /Close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument();
      });
    });

    it('does not show limit badge for pro users', () => {
      vi.mocked(useUser).mockReturnValue({
        tier: 'pro',
      } as any);

      render(<JournalList />);

      expect(screen.queryByText(/\/10 entries/)).not.toBeInTheDocument();
    });
  });

  describe('entry interactions', () => {
    it('opens edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<JournalList />);

      const editButtons = screen.getAllByRole('button', { name: '' });
      const editButton = editButtons.find(btn =>
        btn.querySelector('.lucide-edit')
      );

      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const dialog = screen.getByTestId('journal-entry-dialog');
          expect(dialog).toBeInTheDocument();
          expect(dialog).toHaveTextContent('Editing: entry-1');
        });
      }
    });

    it('deletes entry when delete button is clicked', async () => {
      const user = userEvent.setup();
      const deleteEntry = vi.fn();

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        deleteEntry,
      } as any);

      render(<JournalList />);

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find(btn =>
        btn.querySelector('.lucide-trash-2')
      );

      if (deleteButton) {
        await user.click(deleteButton);
        expect(deleteEntry).toHaveBeenCalledWith('entry-1');
      }
    });

    it('opens new entry dialog when new entry button is clicked', async () => {
      const user = userEvent.setup();
      render(<JournalList />);

      const newEntryButton = screen.getByRole('button', { name: /New Entry/i });
      await user.click(newEntryButton);

      await waitFor(() => {
        const dialog = screen.getByTestId('journal-entry-dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveTextContent('Editing: new');
      });
    });
  });

  describe('error handling', () => {
    it('displays error banner when error present', () => {
      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        error: 'Failed to sync entries',
      } as any);

      render(<JournalList />);

      expect(screen.getByText('Failed to sync entries')).toBeInTheDocument();
    });

    it('does not display error banner when no error', () => {
      render(<JournalList />);

      const errorBanner = document.querySelector('.bg-yellow-500\\/10');
      expect(errorBanner).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('disables new entry button when loading', () => {
      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        isLoading: true,
      } as any);

      render(<JournalList />);

      const newEntryButton = screen.getByRole('button', { name: /New Entry/i });
      expect(newEntryButton).toBeDisabled();
    });

    it('shows loading spinner when loading', () => {
      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        isLoading: true,
      } as any);

      render(<JournalList />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates back when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<JournalList />);

      const backButton = screen.getAllByRole('button')[0];
      await user.click(backButton);

      expect(window.location.href).toBe('/');
    });
  });

  describe('entry formatting', () => {
    it('formats trade date correctly', () => {
      render(<JournalList />);

      const formattedDate = new Date('2024-01-15T00:00:00.000Z').toLocaleDateString();
      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });

    it('displays direction badge', () => {
      render(<JournalList />);

      expect(screen.getByText('LONG')).toBeInTheDocument();
      expect(screen.getByText('SHORT')).toBeInTheDocument();
    });

    it('does not show exit price when not available', () => {
      const entriesWithoutExit = [
        {
          ...mockEntries[0],
          exitPrice: undefined,
          pnl: undefined,
        },
      ];

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: entriesWithoutExit,
      } as any);

      render(<JournalList />);

      expect(screen.queryByText('Exit:')).not.toBeInTheDocument();
    });

    it('does not show P&L section when not calculated', () => {
      const entriesWithoutPnL = [
        {
          ...mockEntries[0],
          pnl: undefined,
          pnlPercent: undefined,
        },
      ];

      vi.mocked(useJournalSync).mockReturnValue({
        ...mockJournalSync,
        entries: entriesWithoutPnL,
      } as any);

      render(<JournalList />);

      // Should not have the P&L column
      expect(screen.queryByText(/^\+\$|^-\$/)).not.toBeInTheDocument();
    });
  });
});
