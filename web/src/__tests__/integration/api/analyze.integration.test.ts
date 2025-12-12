/**
 * Integration Tests: /api/analyze
 *
 * Tests the stock analysis API route with mocked Python backend responses.
 * Verifies: validation, analysis generation, technical calculations, fallback behavior, rate limiting.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/analyze/route';
import { createRequest, parseResponse } from '../test-utils';
import { server } from '../setup';

// Import setup to initialize MSW server
import '../setup';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface StockAnalysis {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  technicals: {
    trend: string;
    support: number;
    resistance: number;
    rsi: number;
    macd_signal: string;
  };
  sentiment?: {
    overall: string;
    score: number;
  };
  mock?: boolean;
}

interface ValidationErrorResponse {
  error: string;
  details: Record<string, unknown>;
}

interface ErrorResponse {
  error: string;
  message?: string;
}

// Mock backend responses
// Note: Backend returns snake_case (change_percent) but we need camelCase (changePercent)
const mockQuoteResponse = {
  price: 596.51,
  open: 595.0,
  high: 598.5,
  low: 593.2,
  close: 596.51,
  volume: 45000000,
  change: 1.51,
  change_percent: 0.25,
  changePercent: 0.25, // Also include camelCase for route compatibility
  last: 596.51,
  bid: 596.50,
  ask: 596.52,
  timestamp: '2024-01-17T16:00:00Z',
};

const mockBarsResponse = {
  bars: [
    { t: '2024-01-01T00:00:00Z', o: 580.0, h: 585.0, l: 578.0, c: 583.0, v: 5000000 },
    { t: '2024-01-02T00:00:00Z', o: 583.0, h: 588.0, l: 581.0, c: 586.0, v: 4800000 },
    { t: '2024-01-03T00:00:00Z', o: 586.0, h: 590.0, l: 584.0, c: 589.0, v: 5200000 },
    { t: '2024-01-04T00:00:00Z', o: 589.0, h: 592.0, l: 587.0, c: 591.0, v: 5100000 },
    { t: '2024-01-05T00:00:00Z', o: 591.0, h: 596.0, l: 590.0, c: 595.0, v: 5300000 },
    { t: '2024-01-08T00:00:00Z', o: 595.0, h: 598.5, l: 593.2, c: 596.51, v: 4900000 },
  ],
};

describe('/api/analyze', () => {
  // Reset rate limit between tests
  beforeEach(() => {
    // Rate limit is per-IP and endpoint, so using fresh requests should work
  });

  describe('Validation', () => {
    beforeEach(() => {
      // Setup default backend handlers for validation tests that pass
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, ({ request }) => {
          const url = new URL(request.url);
          const symbols = url.searchParams.get('symbols');

          if (!symbols) {
            return HttpResponse.json({ error: 'Symbols required' }, { status: 400 });
          }

          const symbolsArray = symbols.split(',');
          const response: Record<string, any> = {};

          symbolsArray.forEach((symbol) => {
            response[symbol.toUpperCase()] = mockQuoteResponse;
          });

          return HttpResponse.json(response);
        }),
        http.get(`${BACKEND_URL}/api/market/bars`, () => {
          return HttpResponse.json(mockBarsResponse);
        })
      );
    });

    it('returns 400 when symbol is missing', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: {},
      });
      const response = await POST(request);
      const data = await parseResponse<ValidationErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('returns 400 for empty symbol', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: '' },
      });
      const response = await POST(request);
      const data = await parseResponse<ValidationErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for symbol longer than 10 characters', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'TOOLONGSYMBOL' },
      });
      const response = await POST(request);
      const data = await parseResponse<ValidationErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid symbol characters', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY$INVALID!' },
      });
      const response = await POST(request);
      const data = await parseResponse<ValidationErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('accepts symbols with dots', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'BRK.B' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(response.status).toBe(200);
      expect(data.symbol).toBe('BRK.B');
    });

    it('accepts symbols with hyphens', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'BF-B' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(response.status).toBe(200);
      expect(data.symbol).toBe('BF-B');
    });

    it('normalizes symbol to uppercase', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'spy' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(response.status).toBe(200);
      expect(data.symbol).toBe('SPY');
    });
  });

  describe('Successful Analysis', () => {
    beforeEach(() => {
      // Setup default backend handlers
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, ({ request }) => {
          const url = new URL(request.url);
          const symbols = url.searchParams.get('symbols');

          if (!symbols) {
            return HttpResponse.json({ error: 'Symbols required' }, { status: 400 });
          }

          const symbolsArray = symbols.split(',');
          const response: Record<string, any> = {};

          symbolsArray.forEach((symbol) => {
            response[symbol.toUpperCase()] = mockQuoteResponse;
          });

          return HttpResponse.json(response);
        }),
        http.get(`${BACKEND_URL}/api/market/bars`, () => {
          return HttpResponse.json(mockBarsResponse);
        })
      );
    });

    it('returns complete stock analysis for valid symbol', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('symbol');
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('change');
      expect(data).toHaveProperty('changePercent');
      expect(data).toHaveProperty('volume');
      expect(data).toHaveProperty('technicals');
      expect(data).toHaveProperty('sentiment');

      // Verify symbol is correct
      expect(data.symbol).toBe('SPY');

      // Verify no mock flag (real data)
      expect(data.mock).toBeUndefined();
    });

    it('returns correct price data from quote', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(data.price).toBe(mockQuoteResponse.last);
      expect(data.change).toBe(mockQuoteResponse.change);
      expect(data.changePercent).toBe(mockQuoteResponse.change_percent);
      expect(data.volume).toBe(mockQuoteResponse.volume);
    });

    it('includes technical analysis structure', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(data.technicals).toBeDefined();
      expect(data.technicals).toHaveProperty('trend');
      expect(data.technicals).toHaveProperty('support');
      expect(data.technicals).toHaveProperty('resistance');
      expect(data.technicals).toHaveProperty('rsi');
      expect(data.technicals).toHaveProperty('macd_signal');
    });

    it('includes sentiment data', async () => {
      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(data.sentiment).toBeDefined();
      expect(data.sentiment).toHaveProperty('overall');
      expect(data.sentiment).toHaveProperty('score');
    });
  });

  describe('Technical Calculations', () => {
    beforeEach(() => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, ({ request }) => {
          const url = new URL(request.url);
          const symbols = url.searchParams.get('symbols');

          const symbolsArray = symbols?.split(',') || [];
          const response: Record<string, any> = {};

          symbolsArray.forEach((symbol) => {
            response[symbol.toUpperCase()] = mockQuoteResponse;
          });

          return HttpResponse.json(response);
        })
      );
    });

    it('calculates technicals from bars data when available', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/bars`, () => {
          return HttpResponse.json(mockBarsResponse);
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(data.technicals.trend).toBeDefined();
      expect(data.technicals.support).toBeGreaterThan(0);
      expect(data.technicals.resistance).toBeGreaterThan(0);

      // Support should be minimum of bars closes
      const closes = mockBarsResponse.bars.map(b => b.c);
      const minClose = Math.min(...closes);
      const maxClose = Math.max(...closes);

      expect(data.technicals.support).toBe(minClose);
      expect(data.technicals.resistance).toBe(maxClose);
    });

    it('determines bullish trend when price above first bar', async () => {
      const bullishBars = {
        bars: [
          { t: '2024-01-01T00:00:00Z', o: 550.0, h: 555.0, l: 548.0, c: 553.0, v: 5000000 },
          { t: '2024-01-02T00:00:00Z', o: 553.0, h: 558.0, l: 551.0, c: 556.0, v: 4800000 },
          { t: '2024-01-03T00:00:00Z', o: 556.0, h: 560.0, l: 554.0, c: 559.0, v: 5200000 },
          { t: '2024-01-04T00:00:00Z', o: 559.0, h: 565.0, l: 557.0, c: 562.0, v: 5100000 },
          { t: '2024-01-05T00:00:00Z', o: 562.0, h: 568.0, l: 560.0, c: 565.0, v: 5300000 },
        ],
      };

      server.use(
        http.get(`${BACKEND_URL}/api/market/bars`, () => {
          return HttpResponse.json(bullishBars);
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      // Current price (596.51) is greater than first bar close (553.0)
      expect(data.technicals.trend).toBe('bullish');
    });

    it('determines bearish trend when price below first bar', async () => {
      const bearishBars = {
        bars: [
          { t: '2024-01-01T00:00:00Z', o: 650.0, h: 655.0, l: 648.0, c: 653.0, v: 5000000 },
          { t: '2024-01-02T00:00:00Z', o: 653.0, h: 658.0, l: 651.0, c: 656.0, v: 4800000 },
          { t: '2024-01-03T00:00:00Z', o: 656.0, h: 660.0, l: 654.0, c: 659.0, v: 5200000 },
          { t: '2024-01-04T00:00:00Z', o: 659.0, h: 665.0, l: 657.0, c: 662.0, v: 5100000 },
          { t: '2024-01-05T00:00:00Z', o: 662.0, h: 668.0, l: 660.0, c: 665.0, v: 5300000 },
        ],
      };

      server.use(
        http.get(`${BACKEND_URL}/api/market/bars`, () => {
          return HttpResponse.json(bearishBars);
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      // Current price (596.51) is less than first bar close (653.0)
      expect(data.technicals.trend).toBe('bearish');
    });

    it('uses default technicals when bars unavailable', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/bars`, () => {
          return HttpResponse.json({ bars: [] });
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(data.technicals.trend).toBe('neutral');
      expect(data.technicals.rsi).toBe(50);
      expect(data.technicals.macd_signal).toBe('neutral');

      // Support/resistance should be percentage of current price
      expect(data.technicals.support).toBeCloseTo(mockQuoteResponse.last * 0.95, 1);
      expect(data.technicals.resistance).toBeCloseTo(mockQuoteResponse.last * 1.05, 1);
    });

    it('uses default technicals when bars fetch fails', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/bars`, () => {
          // Return 500 error instead of network error
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(data.technicals.trend).toBe('neutral');
      expect(data.technicals.rsi).toBe(50);
      expect(data.technicals.macd_signal).toBe('neutral');

      // When bars fetch fails, default support/resistance are 0.9 and 1.1 of price
      expect(data.technicals.support).toBeCloseTo(mockQuoteResponse.last * 0.9, 1);
      expect(data.technicals.resistance).toBeCloseTo(mockQuoteResponse.last * 1.1, 1);
      expect(data.technicals.support).toBeLessThan(data.price);
      expect(data.technicals.resistance).toBeGreaterThan(data.price);
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns mock data when quote endpoint is unavailable', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'SPY' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
      expect(data.symbol).toBe('SPY');
      expect(data.price).toBeGreaterThan(0);
      expect(data.technicals).toBeDefined();
      expect(data.sentiment).toBeDefined();
    });

    it('returns mock data when quote returns 500', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'AAPL' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
      expect(data.symbol).toBe('AAPL');
    });

    it('returns mock data when symbol not found in quote response', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.json({}); // Empty response
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'UNKN' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
      expect(data.symbol).toBe('UNKN');
    });

    it('generates realistic mock data', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'TEST' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      // Verify mock data has realistic ranges
      expect(data.price).toBeGreaterThan(100);
      expect(data.price).toBeLessThan(500);

      expect(data.volume).toBeGreaterThan(500000);
      expect(data.volume).toBeLessThan(10500000);

      expect(data.technicals.support).toBeLessThan(data.price);
      expect(data.technicals.resistance).toBeGreaterThan(data.price);

      expect(data.technicals.rsi).toBeGreaterThanOrEqual(40);
      expect(data.technicals.rsi).toBeLessThanOrEqual(60);

      expect(['bullish', 'bearish']).toContain(data.technicals.trend);
      expect(['positive', 'negative']).toContain(data.sentiment?.overall);
    });

    it('generates consistent mock trend and sentiment', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: { symbol: 'TEST' },
      });
      const response = await POST(request);
      const data = await parseResponse<StockAnalysis>(response);

      // If change is positive, trend should be bullish and sentiment positive
      if (data.change > 0) {
        expect(data.technicals.trend).toBe('bullish');
        expect(data.sentiment?.overall).toBe('positive');
      } else {
        expect(data.technicals.trend).toBe('bearish');
        expect(data.sentiment?.overall).toBe('negative');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('allows requests within rate limit (60 per minute)', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        createRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: { symbol: 'SPY' },
          headers: { 'x-forwarded-for': `192.168.1.${i}` }, // Different IPs
        })
      );

      for (const request of requests) {
        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it('returns 429 when rate limit exceeded', async () => {
      const clientIp = '192.168.1.100';

      // Make 61 requests from same IP (limit is 60)
      for (let i = 0; i < 61; i++) {
        const request = createRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: { symbol: 'SPY' },
          headers: { 'x-forwarded-for': clientIp },
        });

        const response = await POST(request);

        if (i < 60) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429);
          const data = await parseResponse<ErrorResponse>(response);
          expect(data.error).toBe('Too many requests');
          expect(response.headers.get('Retry-After')).toBeDefined();
          expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('returns 500 for malformed JSON body', async () => {
      const url = new URL('http://localhost:3000/api/analyze');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process analysis request');
    });

    it('handles missing request body gracefully', async () => {
      const url = new URL('http://localhost:3000/api/analyze');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      // Should either return 500 or 400 validation error
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Integration with Multiple Symbols', () => {
    beforeEach(() => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, ({ request }) => {
          const url = new URL(request.url);
          const symbols = url.searchParams.get('symbols');

          const symbolsArray = symbols?.split(',') || [];
          const response: Record<string, any> = {};

          symbolsArray.forEach((symbol) => {
            response[symbol.toUpperCase()] = mockQuoteResponse;
          });

          return HttpResponse.json(response);
        }),
        http.get(`${BACKEND_URL}/api/market/bars`, () => {
          return HttpResponse.json(mockBarsResponse);
        })
      );
    });

    it('analyzes different symbols independently', async () => {
      const symbols = ['SPY', 'AAPL', 'TSLA'];
      const analyses: StockAnalysis[] = [];

      for (const symbol of symbols) {
        const request = createRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: { symbol },
        });
        const response = await POST(request);
        const data = await parseResponse<StockAnalysis>(response);

        analyses.push(data);
      }

      // Verify each analysis has correct symbol
      expect(analyses[0].symbol).toBe('SPY');
      expect(analyses[1].symbol).toBe('AAPL');
      expect(analyses[2].symbol).toBe('TSLA');

      // All should have complete data
      analyses.forEach((analysis) => {
        expect(analysis).toHaveProperty('price');
        expect(analysis).toHaveProperty('technicals');
        expect(analysis).toHaveProperty('sentiment');
      });
    });
  });
});
