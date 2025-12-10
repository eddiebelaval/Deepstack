/**
 * Integration Tests: /api/calendar
 *
 * Tests the calendar API route with mocked Python backend responses.
 * Verifies: validation, successful responses, error handling, fallback behavior,
 * date filtering, event type filtering (earnings, economic, etc.).
 */
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET } from '@/app/api/calendar/route';
import { createRequest, parseResponse, type ApiResponse } from '../test-utils';
import { server } from '../setup';

// Import setup to initialize MSW server
import '../setup';

interface CalendarEvent {
  id: string;
  type: 'earnings' | 'economic' | 'dividend' | 'ipo' | 'market';
  symbol?: string;
  title: string;
  date: string;
  time?: string;
  importance: 'high' | 'medium' | 'low';
  estimate?: string;
  prior?: string;
}

interface CalendarData {
  events: CalendarEvent[];
  mock?: boolean;
  warning?: string;
}

describe('/api/calendar', () => {
  describe('Successful Responses', () => {
    it('returns calendar events for default request', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
      expect(data.events.length).toBeGreaterThan(0);
    });

    it('returns events with correct structure', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const event = data.events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('date');
      expect(event).toHaveProperty('importance');
      expect(['high', 'medium', 'low']).toContain(event.importance);
    });

    it('includes earnings events with financial metrics', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const earningsEvent = data.events.find(e => e.type === 'earnings');
      expect(earningsEvent).toBeDefined();
      expect(earningsEvent?.symbol).toBeDefined();
    });

    it('includes economic events', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvent = data.events.find(e => e.type === 'economic');
      expect(economicEvent).toBeDefined();
      expect(economicEvent?.title).toBeDefined();
    });

    it('returns events sorted by date', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const dates = data.events.map(e => e.date);
      const sortedDates = [...dates].sort();
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('Date Filtering', () => {
    it('filters events by start date', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 2);
      const start = startDate.toISOString().split('T')[0];

      const request = createRequest(
        `http://localhost:3000/api/calendar?start=${start}`
      );
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);
      expect(data.events).toBeDefined();

      // All events should be on or after start date
      data.events.forEach(event => {
        expect(event.date >= start).toBe(true);
      });
    });

    it('filters events by end date', async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3);
      const end = endDate.toISOString().split('T')[0];

      const request = createRequest(
        `http://localhost:3000/api/calendar?end=${end}`
      );
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);
      expect(data.events).toBeDefined();

      // All events should be on or before end date
      data.events.forEach(event => {
        expect(event.date <= end).toBe(true);
      });
    });

    it('filters events by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const start = startDate.toISOString().split('T')[0];

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 5);
      const end = endDate.toISOString().split('T')[0];

      const request = createRequest(
        `http://localhost:3000/api/calendar?start=${start}&end=${end}`
      );
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);

      // All events should be within date range
      data.events.forEach(event => {
        expect(event.date >= start).toBe(true);
        expect(event.date <= end).toBe(true);
      });
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns mock data when backend is unavailable', async () => {
      // Override handler to simulate backend failure
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      // Should still return 200 with mock data
      expect(response.status).toBe(200);
      expect(data.events).toBeDefined();
      expect(data.mock).toBe(true);
      expect(data.warning).toBeDefined();
      expect(data.warning).toContain('backend unavailable');
    });

    it('returns mock data when backend returns error status', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
      expect(data.events.length).toBeGreaterThan(0);
    });

    it('filters mock data by date when backend is unavailable', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          return HttpResponse.error();
        })
      );

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 2);
      const start = startDate.toISOString().split('T')[0];

      const request = createRequest(
        `http://localhost:3000/api/calendar?start=${start}`
      );
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);

      // Mock data should still be filtered
      data.events.forEach(event => {
        expect(event.date >= start).toBe(true);
      });
    });
  });

  describe('Response Metadata', () => {
    it('does not include mock flag when backend responds successfully', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      // When backend is available, mock should be undefined or false
      expect(data.mock).not.toBe(true);
    });
  });

  describe('Event Types', () => {
    it('includes multiple event types in response', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const types = new Set(data.events.map(e => e.type));

      // Should have at least earnings and economic events
      expect(types.has('earnings')).toBe(true);
      expect(types.has('economic')).toBe(true);
    });

    it('earnings events include symbol and time', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const earningsEvents = data.events.filter(e => e.type === 'earnings');

      earningsEvents.forEach(event => {
        expect(event.symbol).toBeDefined();
        expect(event.time).toBeDefined();
        expect(['BMO', 'AMC'].includes(event.time as string) || event.time?.includes('ET')).toBe(true);
      });
    });

    it('economic events include time', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        expect(event.time).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles general errors gracefully', async () => {
      // Force an error by providing invalid URL structure
      // This tests the catch block in the route
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          throw new Error('Unexpected error');
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);

      // Should return mock data instead of failing
      expect(response.status).toBe(200);
      const data = await parseResponse<CalendarData>(response);
      expect(data.events).toBeDefined();
    });
  });
});
