import { create } from 'zustand';

export type CalendarEventType = 'earnings' | 'economic' | 'dividend' | 'ipo';

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  symbol?: string;
  title: string;
  date: string;
  time?: string;
  importance?: 'low' | 'medium' | 'high';
  estimate?: string;
  actual?: string;
  prior?: string;
};

interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  filterType: CalendarEventType | 'all';
  dateRange: { start: string; end: string };
  setFilterType: (type: CalendarEventType | 'all') => void;
  setDateRange: (start: string, end: string) => void;
  fetchEvents: () => Promise<void>;
  getFilteredEvents: () => CalendarEvent[];
}

const getDateRange = () => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return {
    start: today.toISOString().split('T')[0],
    end: nextWeek.toISOString().split('T')[0],
  };
};

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  filterType: 'all',
  dateRange: getDateRange(),

  setFilterType: (type) => set({ filterType: type }),

  setDateRange: (start, end) => set({ dateRange: { start, end } }),

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { dateRange } = get();
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      });

      const response = await fetch(`/api/calendar?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch calendar events');

      const data = await response.json();
      set({ events: data.events || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load calendar',
        isLoading: false,
      });
    }
  },

  getFilteredEvents: () => {
    const { events, filterType } = get();
    if (filterType === 'all') return events;
    return events.filter((e) => e.type === filterType);
  },
}));
