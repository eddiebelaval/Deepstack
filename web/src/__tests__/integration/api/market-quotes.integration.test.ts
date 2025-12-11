/**
 * Integration Tests: /api/market/quotes
 *
 * Tests the market quotes API route with mocked Python backend responses.
 * Verifies: validation, multi-symbol support, error handling, fallback behavior.
 */
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET } from '@/app/api/market/quotes/route';
import { createRequest, parseResponse } from '../test-utils';
import { server } from '../setup';

// Import setup to initialize MSW server
import '../setup';

interface QuotesResponse {
  quotes: Record<string, {
    symbol: string;
    last: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
    bid: number;
    ask: number;
    timestamp: string;
  }>;
  mock?: boolean;
  warning?: string;
}

interface ErrorResponse {
  error: string;
}

describe('/api/market/quotes', () => {
  describe('Validation', () => {
    it('returns 400 when symbols parameter is missing', async () => {
      const request = createRequest('http://localhost:3000/api/market/quotes');
      const response = await GET(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for empty symbols parameter', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols='
      );
      const response = await GET(request);
      await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid symbol characters', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=SPY$INVALID!'
      );
      const response = await GET(request);
      await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
    });
  });

  describe('Successful Responses', () => {
    it('returns quote data for single symbol', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<QuotesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.quotes).toBeDefined();
      expect(data.quotes.SPY).toBeDefined();
      expect(data.mock).toBe(false);
    });

    it('returns quote data for multiple symbols', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=SPY,AAPL,TSLA'
      );
      const response = await GET(request);
      const data = await parseResponse<QuotesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.quotes).toBeDefined();
      expect(Object.keys(data.quotes).length).toBe(3);
      expect(data.quotes.SPY).toBeDefined();
      expect(data.quotes.AAPL).toBeDefined();
      expect(data.quotes.TSLA).toBeDefined();
    });

    it('normalizes symbols to uppercase', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=spy,aapl'
      );
      const response = await GET(request);
      const data = await parseResponse<QuotesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.quotes.SPY).toBeDefined();
      expect(data.quotes.AAPL).toBeDefined();
    });

    it('trims whitespace from symbols', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=SPY%20,%20AAPL'
      );
      const response = await GET(request);
      const data = await parseResponse<QuotesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.quotes.SPY).toBeDefined();
      expect(data.quotes.AAPL).toBeDefined();
    });

    it('returns quotes with correct OHLCV structure', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<QuotesResponse>(response);

      const quote = data.quotes.SPY;
      expect(quote).toHaveProperty('symbol');
      expect(quote).toHaveProperty('last');
      expect(quote).toHaveProperty('open');
      expect(quote).toHaveProperty('high');
      expect(quote).toHaveProperty('low');
      expect(quote).toHaveProperty('volume');
      expect(quote).toHaveProperty('bid');
      expect(quote).toHaveProperty('ask');
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns mock data when all backend requests fail', async () => {
      // Override handler to simulate backend failure
      server.use(
        http.get('http://127.0.0.1:8000/quote/:symbol', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<QuotesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.quotes).toBeDefined();
      expect(data.mock).toBe(true);
      expect(data.warning).toBeDefined();
    });

    it('returns mock data when backend returns 500', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/quote/:symbol', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=SPY,AAPL'
      );
      const response = await GET(request);
      const data = await parseResponse<QuotesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
    });
  });

  describe('Response Metadata', () => {
    it('includes mock: false when backend responds', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/quotes?symbols=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<QuotesResponse>(response);

      expect(data.mock).toBe(false);
    });
  });
});
