/**
 * Integration Tests: Economic Data (via /api/calendar)
 *
 * Tests economic calendar events functionality within the calendar API route.
 * Verifies: economic event filtering, importance levels, time information,
 * and backend/mock data handling for economic indicators.
 *
 * Note: Economic data is served via the /api/calendar endpoint as event type 'economic'
 */
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET } from '@/app/api/calendar/route';
import { createRequest, parseResponse } from '../test-utils';
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
  actual?: string;
  forecast?: string;
  previous?: string;
}

interface CalendarData {
  events: CalendarEvent[];
  mock?: boolean;
  warning?: string;
}

describe('Economic Data (via /api/calendar)', () => {
  describe('Economic Events Structure', () => {
    it('returns economic events within calendar data', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);

      const economicEvents = data.events.filter(e => e.type === 'economic');
      expect(economicEvents.length).toBeGreaterThan(0);
    });

    it('economic events have required fields', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('type');
        expect(event.type).toBe('economic');
        expect(event).toHaveProperty('title');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('importance');
        expect(['high', 'medium', 'low']).toContain(event.importance);
      });
    });

    it('economic events include time information', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        expect(event.time).toBeDefined();
        // Time should be in ET format
        if (event.time) {
          expect(event.time).toMatch(/ET|AM|PM/);
        }
      });
    });

    it('economic events do not have symbol field', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        // Economic events are market-wide, not symbol-specific
        expect(event.symbol).toBeUndefined();
      });
    });
  });

  describe('Economic Event Types', () => {
    it('includes major economic indicators', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');
      const titles = economicEvents.map(e => e.title);

      // Should include common economic events
      const hasCommonIndicators = titles.some(title => {
        const lowerTitle = title.toLowerCase();
        return (
          lowerTitle.includes('fomc') ||
          lowerTitle.includes('cpi') ||
          lowerTitle.includes('jobless') ||
          lowerTitle.includes('nfp') ||
          lowerTitle.includes('gdp') ||
          lowerTitle.includes('employment')
        );
      });

      expect(hasCommonIndicators).toBe(true);
    });

    it('categorizes events by importance correctly', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      // FOMC and CPI should be high importance
      const highImportanceEvents = economicEvents.filter(
        e => e.importance === 'high'
      );

      expect(highImportanceEvents.length).toBeGreaterThan(0);

      // Check that major events are marked as high importance
      const hasHighImportanceMarkers = highImportanceEvents.some(event => {
        const lowerTitle = event.title.toLowerCase();
        return lowerTitle.includes('fomc') || lowerTitle.includes('cpi');
      });

      expect(hasHighImportanceMarkers).toBe(true);
    });
  });

  describe('Date Filtering for Economic Events', () => {
    it('filters economic events by start date', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const start = startDate.toISOString().split('T')[0];

      const request = createRequest(
        `http://localhost:3000/api/calendar?start=${start}`
      );
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        expect(event.date >= start).toBe(true);
      });
    });

    it('filters economic events by end date', async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 5);
      const end = endDate.toISOString().split('T')[0];

      const request = createRequest(
        `http://localhost:3000/api/calendar?end=${end}`
      );
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        expect(event.date <= end).toBe(true);
      });
    });

    it('filters economic events by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const start = startDate.toISOString().split('T')[0];

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const end = endDate.toISOString().split('T')[0];

      const request = createRequest(
        `http://localhost:3000/api/calendar?start=${start}&end=${end}`
      );
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        expect(event.date >= start).toBe(true);
        expect(event.date <= end).toBe(true);
      });
    });
  });

  describe('Backend Integration for Economic Data', () => {
    it('merges backend and mock economic data', async () => {
      // Backend provides market calendar, frontend adds economic/earnings
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'backend-1',
                type: 'market',
                title: 'Market Closed - Holiday',
                date: new Date().toISOString().split('T')[0],
                importance: 'high',
              },
            ],
          });
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);

      // Should have both backend market events and mock economic events
      const types = new Set(data.events.map(e => e.type));
      expect(types.has('economic')).toBe(true);
    });

    it('returns mock economic data when backend is unavailable', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);

      const economicEvents = data.events.filter(e => e.type === 'economic');
      expect(economicEvents.length).toBeGreaterThan(0);
    });

    it('filters mock economic data by date when backend is down', async () => {
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

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        expect(event.date >= start).toBe(true);
      });
    });
  });

  describe('Economic Data Quality', () => {
    it('economic events have meaningful titles', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        expect(event.title).toBeDefined();
        expect(event.title.length).toBeGreaterThan(5);
        // Titles should be capitalized and professional
        expect(event.title[0]).toMatch(/[A-Z]/);
      });
    });

    it('economic events are properly dated', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      economicEvents.forEach(event => {
        // Date should be in ISO format YYYY-MM-DD
        expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Date should be valid
        const date = new Date(event.date);
        expect(date.toString()).not.toBe('Invalid Date');
      });
    });

    it('events are sorted chronologically', async () => {
      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      if (economicEvents.length > 1) {
        for (let i = 0; i < economicEvents.length - 1; i++) {
          const currentDate = economicEvents[i].date;
          const nextDate = economicEvents[i + 1].date;
          expect(currentDate <= nextDate).toBe(true);
        }
      }
    });
  });

  describe('Mock Data Coverage', () => {
    it('mock data includes diverse economic indicators', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(data.mock).toBe(true);

      const economicEvents = data.events.filter(e => e.type === 'economic');

      // Should have at least 3 different economic events
      expect(economicEvents.length).toBeGreaterThanOrEqual(3);

      // Events should have different titles
      const uniqueTitles = new Set(economicEvents.map(e => e.title));
      expect(uniqueTitles.size).toBeGreaterThanOrEqual(3);
    });

    it('mock data includes high-impact events', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');
      const highImpactEvents = economicEvents.filter(
        e => e.importance === 'high'
      );

      // Should have at least one high-impact event
      expect(highImpactEvents.length).toBeGreaterThan(0);
    });

    it('mock data includes various importance levels', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      const economicEvents = data.events.filter(e => e.type === 'economic');
      const importanceLevels = new Set(economicEvents.map(e => e.importance));

      // Should have mix of high, medium, low importance events
      expect(importanceLevels.size).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty date range with no economic events', async () => {
      // Set a date range far in the past
      const start = '2020-01-01';
      const end = '2020-01-02';

      const request = createRequest(
        `http://localhost:3000/api/calendar?start=${start}&end=${end}`
      );
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      expect(response.status).toBe(200);

      const economicEvents = data.events.filter(e => e.type === 'economic');
      // Should have no events in this old date range
      expect(economicEvents.length).toBe(0);
    });

    it('handles backend timeout gracefully', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/calendar', async () => {
          // Simulate timeout by delaying response
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/calendar');
      const response = await GET(request);
      const data = await parseResponse<CalendarData>(response);

      // Should fall back to mock data
      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);

      const economicEvents = data.events.filter(e => e.type === 'economic');
      expect(economicEvents.length).toBeGreaterThan(0);
    });
  });
});
