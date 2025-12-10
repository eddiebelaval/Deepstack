import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCalendarStore } from '../calendar-store';
import { act } from '@testing-library/react';
import type { CalendarEvent } from '../calendar-store';

// Mock fetch
global.fetch = vi.fn();

describe('useCalendarStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useCalendarStore.setState({
        events: [],
        isLoading: false,
        error: null,
        filterType: 'all',
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      });
    });

    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has empty events array', () => {
      const state = useCalendarStore.getState();
      expect(state.events).toEqual([]);
    });

    it('is not loading initially', () => {
      const state = useCalendarStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('has no error initially', () => {
      const state = useCalendarStore.getState();
      expect(state.error).toBeNull();
    });

    it('defaults to all filter type', () => {
      const state = useCalendarStore.getState();
      expect(state.filterType).toBe('all');
    });

    it('has default date range of 7 days', () => {
      const state = useCalendarStore.getState();
      expect(state.dateRange).toBeDefined();
      expect(state.dateRange.start).toBeDefined();
      expect(state.dateRange.end).toBeDefined();
    });
  });

  describe('setFilterType', () => {
    it('sets filter to earnings', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('earnings');
      });

      expect(useCalendarStore.getState().filterType).toBe('earnings');
    });

    it('sets filter to economic', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('economic');
      });

      expect(useCalendarStore.getState().filterType).toBe('economic');
    });

    it('sets filter to dividend', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('dividend');
      });

      expect(useCalendarStore.getState().filterType).toBe('dividend');
    });

    it('sets filter to ipo', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('ipo');
      });

      expect(useCalendarStore.getState().filterType).toBe('ipo');
    });

    it('sets filter back to all', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('earnings');
        useCalendarStore.getState().setFilterType('all');
      });

      expect(useCalendarStore.getState().filterType).toBe('all');
    });
  });

  describe('setDateRange', () => {
    it('updates date range', () => {
      act(() => {
        useCalendarStore.getState().setDateRange('2024-01-01', '2024-01-31');
      });

      const dateRange = useCalendarStore.getState().dateRange;
      expect(dateRange.start).toBe('2024-01-01');
      expect(dateRange.end).toBe('2024-01-31');
    });

    it('accepts different date formats', () => {
      act(() => {
        useCalendarStore.getState().setDateRange('2024-12-01', '2024-12-25');
      });

      const dateRange = useCalendarStore.getState().dateRange;
      expect(dateRange.start).toBe('2024-12-01');
      expect(dateRange.end).toBe('2024-12-25');
    });
  });

  describe('fetchEvents', () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        type: 'earnings',
        symbol: 'AAPL',
        title: 'Apple Q4 Earnings',
        date: '2024-01-15',
        time: '16:00',
        importance: 'high',
        peRatio: 28.5,
        marketCap: 3000,
      },
      {
        id: '2',
        type: 'economic',
        title: 'Fed Interest Rate Decision',
        date: '2024-01-20',
        importance: 'high',
      },
    ];

    it('fetches events successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents }),
      });

      await act(async () => {
        await useCalendarStore.getState().fetchEvents();
      });

      const state = useCalendarStore.getState();
      expect(state.events).toEqual(mockEvents);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets loading state while fetching', async () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ events: mockEvents }),
              });
            }, 100);
          })
      );

      const fetchPromise = useCalendarStore.getState().fetchEvents();

      // Check loading state immediately
      expect(useCalendarStore.getState().isLoading).toBe(true);

      await act(async () => {
        await fetchPromise;
      });

      expect(useCalendarStore.getState().isLoading).toBe(false);
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await act(async () => {
        await useCalendarStore.getState().fetchEvents();
      });

      const state = useCalendarStore.getState();
      expect(state.error).toBe('Failed to fetch calendar events');
      expect(state.isLoading).toBe(false);
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useCalendarStore.getState().fetchEvents();
      });

      const state = useCalendarStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('includes date range in request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: [] }),
      });

      act(() => {
        useCalendarStore.getState().setDateRange('2024-01-01', '2024-01-31');
      });

      await act(async () => {
        await useCalendarStore.getState().fetchEvents();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2024-01-01')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2024-01-31')
      );
    });

    it('clears error on successful fetch', async () => {
      act(() => {
        useCalendarStore.setState({ error: 'Previous error' });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents }),
      });

      await act(async () => {
        await useCalendarStore.getState().fetchEvents();
      });

      expect(useCalendarStore.getState().error).toBeNull();
    });

    it('handles empty events array', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: [] }),
      });

      await act(async () => {
        await useCalendarStore.getState().fetchEvents();
      });

      expect(useCalendarStore.getState().events).toEqual([]);
      expect(useCalendarStore.getState().isLoading).toBe(false);
    });

    it('handles missing events in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await act(async () => {
        await useCalendarStore.getState().fetchEvents();
      });

      expect(useCalendarStore.getState().events).toEqual([]);
    });
  });

  describe('getFilteredEvents', () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        type: 'earnings',
        symbol: 'AAPL',
        title: 'Apple Earnings',
        date: '2024-01-15',
        importance: 'high',
      },
      {
        id: '2',
        type: 'economic',
        title: 'Fed Meeting',
        date: '2024-01-20',
        importance: 'high',
      },
      {
        id: '3',
        type: 'dividend',
        symbol: 'MSFT',
        title: 'Microsoft Dividend',
        date: '2024-01-18',
      },
      {
        id: '4',
        type: 'ipo',
        symbol: 'NEWCO',
        title: 'NewCo IPO',
        date: '2024-01-22',
      },
      {
        id: '5',
        type: 'earnings',
        symbol: 'GOOGL',
        title: 'Google Earnings',
        date: '2024-01-25',
        importance: 'high',
      },
    ];

    beforeEach(() => {
      act(() => {
        useCalendarStore.setState({ events: mockEvents });
      });
    });

    it('returns all events when filter is all', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('all');
      });

      const filtered = useCalendarStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(5);
    });

    it('filters earnings events', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('earnings');
      });

      const filtered = useCalendarStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.type === 'earnings')).toBe(true);
      expect(filtered.map((e) => e.symbol)).toEqual(['AAPL', 'GOOGL']);
    });

    it('filters economic events', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('economic');
      });

      const filtered = useCalendarStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('economic');
      expect(filtered[0].title).toBe('Fed Meeting');
    });

    it('filters dividend events', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('dividend');
      });

      const filtered = useCalendarStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('dividend');
      expect(filtered[0].symbol).toBe('MSFT');
    });

    it('filters ipo events', () => {
      act(() => {
        useCalendarStore.getState().setFilterType('ipo');
      });

      const filtered = useCalendarStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('ipo');
      expect(filtered[0].symbol).toBe('NEWCO');
    });

    it('returns empty array when no events match filter', () => {
      act(() => {
        useCalendarStore.setState({ events: [] });
        useCalendarStore.getState().setFilterType('earnings');
      });

      const filtered = useCalendarStore.getState().getFilteredEvents();
      expect(filtered).toEqual([]);
    });
  });
});
