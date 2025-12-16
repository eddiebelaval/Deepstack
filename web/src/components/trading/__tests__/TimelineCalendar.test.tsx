import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineCalendar } from '../TimelineCalendar';
import type { CalendarEvent } from '@/lib/stores/calendar-store';

// Mock EventBetCard
vi.mock('../EventBetCard', () => ({
  EventBetCard: vi.fn(({ event, onSymbolClick }) => (
    <div
      data-testid={`event-card-${event.id}`}
      onClick={() => event.symbol && onSymbolClick?.(event.symbol)}
    >
      {event.title}
    </div>
  )),
}));

// Mock ScrollArea
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn(({ children }) => <div data-testid="scroll-area">{children}</div>),
}));

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  disconnect: vi.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

describe('TimelineCalendar', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnSymbolClick = vi.fn();
  const mockOnMonthChange = vi.fn();

  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      symbol: 'AAPL',
      type: 'earnings',
      date: '2024-01-15',
      title: 'AAPL Q4 Earnings',
    },
    {
      id: '2',
      symbol: 'MSFT',
      type: 'earnings',
      date: '2024-01-15',
      title: 'MSFT Q4 Earnings',
    },
    {
      id: '3',
      type: 'economic',
      date: '2024-01-17',
      title: 'Fed Rate Decision',
    },
    {
      id: '4',
      symbol: 'JNJ',
      type: 'dividend',
      date: '2024-01-20',
      title: 'JNJ Ex-Dividend',
    },
    {
      id: '5',
      symbol: 'NEWCO',
      type: 'ipo',
      date: '2024-01-25',
      title: 'NEWCO IPO',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders month navigation', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
          currentMonth={new Date(2024, 0, 1)}
          onMonthChange={mockOnMonthChange}
        />
      );

      expect(screen.getByText('January 2024')).toBeInTheDocument();
    });

    it('renders filter tabs', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /earn/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /econ/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /div/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ipo/i })).toBeInTheDocument();
    });

    it('renders all event cards', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      expect(screen.getByTestId('event-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('event-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('event-card-3')).toBeInTheDocument();
      expect(screen.getByTestId('event-card-4')).toBeInTheDocument();
      expect(screen.getByTestId('event-card-5')).toBeInTheDocument();
    });

    it('groups events by date', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      // Both AAPL and MSFT are on Jan 15, so they should appear together
      expect(screen.getByText('AAPL Q4 Earnings')).toBeInTheDocument();
      expect(screen.getByText('MSFT Q4 Earnings')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no events', () => {
      render(
        <TimelineCalendar
          events={[]}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      expect(screen.getByText('No events found')).toBeInTheDocument();
      expect(screen.getByText(/check back later/i)).toBeInTheDocument();
    });

    it('shows empty message when filter excludes all events', () => {
      render(
        <TimelineCalendar
          events={mockEvents.filter((e) => e.type === 'earnings')}
          filterType="dividend"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      expect(screen.getByText('No events found')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('calls onFilterChange when tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      await user.click(screen.getByRole('tab', { name: /earn/i }));

      expect(mockOnFilterChange).toHaveBeenCalledWith('earnings');
    });

    it('filters events by type', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="earnings"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      expect(screen.getByTestId('event-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('event-card-2')).toBeInTheDocument();
      expect(screen.queryByTestId('event-card-3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('event-card-4')).not.toBeInTheDocument();
    });

    it('shows only economic events when filtered', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="economic"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      expect(screen.getByTestId('event-card-3')).toBeInTheDocument();
      expect(screen.queryByTestId('event-card-1')).not.toBeInTheDocument();
    });
  });

  describe('Month Navigation', () => {
    it('calls onMonthChange when previous month is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
          currentMonth={new Date(2024, 0, 1)}
          onMonthChange={mockOnMonthChange}
        />
      );

      const prevButton = screen.getAllByRole('button')[0];
      await user.click(prevButton);

      expect(mockOnMonthChange).toHaveBeenCalled();
      const calledDate = mockOnMonthChange.mock.calls[0][0];
      expect(calledDate.getMonth()).toBe(11); // December
      expect(calledDate.getFullYear()).toBe(2023);
    });

    it('calls onMonthChange when next month is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
          currentMonth={new Date(2024, 0, 1)}
          onMonthChange={mockOnMonthChange}
        />
      );

      const nextButton = screen.getAllByRole('button')[1];
      await user.click(nextButton);

      expect(mockOnMonthChange).toHaveBeenCalled();
      const calledDate = mockOnMonthChange.mock.calls[0][0];
      expect(calledDate.getMonth()).toBe(1); // February
      expect(calledDate.getFullYear()).toBe(2024);
    });

    it('disables navigation buttons when no handler provided', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
          currentMonth={new Date(2024, 0, 1)}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeDisabled();
      expect(buttons[1]).toBeDisabled();
    });
  });

  describe('Symbol Click', () => {
    it('calls onSymbolClick when event card is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      await user.click(screen.getByTestId('event-card-1'));

      expect(mockOnSymbolClick).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when isLoadingMore is true', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
          isLoadingMore={true}
        />
      );

      expect(screen.getByText('Loading more events...')).toBeInTheDocument();
    });

    it('shows scroll hint when not loading', () => {
      render(
        <TimelineCalendar
          events={mockEvents}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
          isLoadingMore={false}
        />
      );

      expect(screen.getByText('Scroll for next month')).toBeInTheDocument();
    });
  });

  describe('Date Labels', () => {
    it('formats dates correctly', () => {
      // Create events with specific dates
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const eventsWithToday: CalendarEvent[] = [
        {
          id: '1',
          type: 'earnings',
          date: today.toISOString().split('T')[0],
          title: 'Today Event',
        },
      ];

      render(
        <TimelineCalendar
          events={eventsWithToday}
          filterType="all"
          onFilterChange={mockOnFilterChange}
          onSymbolClick={mockOnSymbolClick}
        />
      );

      expect(screen.getByText(/today/i)).toBeInTheDocument();
    });
  });
});
