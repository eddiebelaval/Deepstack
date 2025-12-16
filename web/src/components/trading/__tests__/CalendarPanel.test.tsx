import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarPanel } from '../CalendarPanel';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useTradingStore } from '@/lib/stores/trading-store';

// Mock dependencies
vi.mock('@/lib/stores/calendar-store');
vi.mock('@/lib/stores/trading-store');

// Mock TimelineCalendar component
vi.mock('../TimelineCalendar', () => ({
  TimelineCalendar: vi.fn(({ events, onSymbolClick, onFilterChange }) => (
    <div data-testid="timeline-calendar">
      <span data-testid="event-count">{events.length} events</span>
      <button onClick={() => onSymbolClick?.('AAPL')} data-testid="symbol-click">
        Click Symbol
      </button>
      <button onClick={() => onFilterChange?.('earnings')} data-testid="filter-change">
        Change Filter
      </button>
    </div>
  )),
}));

describe('CalendarPanel', () => {
  const mockFetchEvents = vi.fn();
  const mockSetFilterType = vi.fn();
  const mockSetActiveSymbol = vi.fn();

  const mockEvents = [
    {
      id: '1',
      symbol: 'AAPL',
      type: 'earnings',
      date: '2024-01-15',
      title: 'AAPL Earnings',
    },
    {
      id: '2',
      symbol: 'MSFT',
      type: 'dividend',
      date: '2024-01-20',
      title: 'MSFT Dividend',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCalendarStore).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      filterType: 'all',
      setFilterType: mockSetFilterType,
      fetchEvents: mockFetchEvents,
    } as any);

    vi.mocked(useTradingStore).mockReturnValue({
      setActiveSymbol: mockSetActiveSymbol,
    } as any);
  });

  describe('Rendering', () => {
    it('renders calendar panel with header', () => {
      render(<CalendarPanel />);

      expect(screen.getByText('Market Calendar')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<CalendarPanel />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('renders TimelineCalendar with events', () => {
      render(<CalendarPanel />);

      expect(screen.getByTestId('timeline-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('event-count')).toHaveTextContent('2 events');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading with no events', () => {
      vi.mocked(useCalendarStore).mockReturnValue({
        events: [],
        isLoading: true,
        error: null,
        filterType: 'all',
        setFilterType: mockSetFilterType,
        fetchEvents: mockFetchEvents,
      } as any);

      render(<CalendarPanel />);

      // Should show loading spinner (Loader2 component)
      expect(screen.queryByTestId('timeline-calendar')).not.toBeInTheDocument();
    });

    it('shows calendar when loading with existing events', () => {
      vi.mocked(useCalendarStore).mockReturnValue({
        events: mockEvents,
        isLoading: true,
        error: null,
        filterType: 'all',
        setFilterType: mockSetFilterType,
        fetchEvents: mockFetchEvents,
      } as any);

      render(<CalendarPanel />);

      expect(screen.getByTestId('timeline-calendar')).toBeInTheDocument();
    });

    it('disables refresh button when loading', () => {
      vi.mocked(useCalendarStore).mockReturnValue({
        events: mockEvents,
        isLoading: true,
        error: null,
        filterType: 'all',
        setFilterType: mockSetFilterType,
        fetchEvents: mockFetchEvents,
      } as any);

      render(<CalendarPanel />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('displays error message when error occurs', () => {
      vi.mocked(useCalendarStore).mockReturnValue({
        events: [],
        isLoading: false,
        error: 'Failed to fetch calendar events',
        filterType: 'all',
        setFilterType: mockSetFilterType,
        fetchEvents: mockFetchEvents,
      } as any);

      render(<CalendarPanel />);

      expect(screen.getByText('Failed to fetch calendar events')).toBeInTheDocument();
      expect(screen.queryByTestId('timeline-calendar')).not.toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('fetches events on mount when events array is empty', () => {
      vi.mocked(useCalendarStore).mockReturnValue({
        events: [],
        isLoading: false,
        error: null,
        filterType: 'all',
        setFilterType: mockSetFilterType,
        fetchEvents: mockFetchEvents,
      } as any);

      render(<CalendarPanel />);

      expect(mockFetchEvents).toHaveBeenCalledTimes(1);
    });

    it('does not fetch events on mount when events exist', () => {
      render(<CalendarPanel />);

      expect(mockFetchEvents).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('calls fetchEvents when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<CalendarPanel />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockFetchEvents).toHaveBeenCalledTimes(1);
    });

    it('calls setActiveSymbol when symbol is clicked in calendar', async () => {
      const user = userEvent.setup();
      render(<CalendarPanel />);

      const symbolButton = screen.getByTestId('symbol-click');
      await user.click(symbolButton);

      expect(mockSetActiveSymbol).toHaveBeenCalledWith('AAPL');
    });

    it('calls setFilterType when filter is changed', async () => {
      const user = userEvent.setup();
      render(<CalendarPanel />);

      const filterButton = screen.getByTestId('filter-change');
      await user.click(filterButton);

      expect(mockSetFilterType).toHaveBeenCalledWith('earnings');
    });
  });

  describe('Empty State', () => {
    it('renders empty calendar when no events and not loading', () => {
      vi.mocked(useCalendarStore).mockReturnValue({
        events: [],
        isLoading: false,
        error: null,
        filterType: 'all',
        setFilterType: mockSetFilterType,
        fetchEvents: mockFetchEvents,
      } as any);

      render(<CalendarPanel />);

      expect(screen.getByTestId('timeline-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('event-count')).toHaveTextContent('0 events');
    });
  });
});
