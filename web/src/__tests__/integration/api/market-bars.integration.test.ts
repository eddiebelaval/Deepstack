/**
 * Integration Tests: /api/market/bars
 *
 * Tests the market bars API route with mocked Python backend responses.
 * Verifies: validation, successful responses, error handling, fallback behavior.
 */
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET } from '@/app/api/market/bars/route';
import { createRequest, parseResponse, type ApiResponse } from '../test-utils';
import { server } from '../setup';

// Import setup to initialize MSW server
import '../setup';

interface BarsData {
  bars: Array<{
    t: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
  }>;
}

describe('/api/market/bars', () => {
  describe('Validation', () => {
    it('returns 400 when symbol is missing', async () => {
      const request = createRequest('http://localhost:3000/api/market/bars');
      const response = await GET(request);
      const data = await parseResponse<ApiResponse>(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_PARAMETERS');
    });

    it('returns 400 for invalid symbol format', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=INVALID$SYMBOL!'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse>(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 400 for invalid timeframe', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY&timeframe=invalid'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse>(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 400 for limit out of range', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY&limit=9999'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse>(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Successful Responses', () => {
    it('returns bars data for valid symbol', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse<BarsData>>(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.bars).toBeDefined();
      expect(data.data?.bars.length).toBeGreaterThan(0);
    });

    it('normalizes symbol to uppercase', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=spy'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse<BarsData>>(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('accepts valid timeframe parameter', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY&timeframe=1h'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse<BarsData>>(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('accepts valid limit parameter', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY&limit=50'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse<BarsData>>(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns bars with correct OHLCV structure', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse<BarsData>>(response);

      const bar = data.data?.bars[0];
      expect(bar).toHaveProperty('t'); // timestamp
      expect(bar).toHaveProperty('o'); // open
      expect(bar).toHaveProperty('h'); // high
      expect(bar).toHaveProperty('l'); // low
      expect(bar).toHaveProperty('c'); // close
      expect(bar).toHaveProperty('v'); // volume
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns mock data when backend is unavailable', async () => {
      // Override handler to simulate backend failure
      server.use(
        http.get('http://127.0.0.1:8000/api/market/bars', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse<BarsData>>(response);

      // Should still return 200 with mock data
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.bars).toBeDefined();
      expect(data.meta?.isMock).toBe(true);
      expect(data.meta?.warning).toBeDefined();
    });

    it('returns mock data when backend returns error status', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/bars', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse<BarsData>>(response);

      expect(response.status).toBe(200);
      expect(data.meta?.isMock).toBe(true);
    });
  });

  describe('Response Metadata', () => {
    it('includes isMock: false when backend responds', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/bars?symbol=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<ApiResponse<BarsData>>(response);

      expect(data.meta?.isMock).toBe(false);
    });
  });
});
