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
  // Earnings-specific financial metrics
  peRatio?: number;
  psRatio?: number;
  marketCap?: number; // in billions
  revenueEstimate?: number; // in billions
  epsSurprise?: number; // percentage from last quarter
  fiscalQuarter?: string; // e.g., "Q4 2024"
  // Stock price data
  currentPrice?: number;
  preMarketPrice?: number;
  afterHoursPrice?: number;
  changeWeek?: number; // percentage
  changeMonth?: number; // percentage
  changeYear?: number; // percentage
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
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch calendar events');
      }

      set({
        events: data.events || [],
        isLoading: false,
        error: data.message || null, // Show info messages like "No events found"
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load calendar',
        isLoading: false,
        events: [],
      });
    }
  },

  getFilteredEvents: () => {
    const { events, filterType } = get();
    if (filterType === 'all') return events;
    return events.filter((e) => e.type === filterType);
  },
}));
