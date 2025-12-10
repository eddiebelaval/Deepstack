/**
 * Integration Tests: /api/screener
 *
 * Tests the stock screener API route with mocked Python backend responses.
 * Verifies: filtering, sorting, backend fallback behavior, rate limiting awareness.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET } from '@/app/api/screener/route';
import { createRequest, parseResponse } from '../test-utils';
import { server } from '../setup';

// Import setup to initialize MSW server
import '../setup';

interface ScreenerStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  sector: string;
}

interface ScreenerResponse {
  results: ScreenerStock[];
  mock?: boolean;
  warning?: string;
}

interface ErrorResponse {
  error: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

describe('/api/screener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Responses', () => {
    it('returns stock results with real quote data from backend', async () => {
      // Backend returns quote data
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.json({
            quotes: {
              AAPL: { last: 240.0, change: 2.5, changePercent: 1.05, volume: 60000000 },
              MSFT: { last: 435.0, change: 3.5, changePercent: 0.81, volume: 25000000 },
              SPY: { last: 597.0, change: 1.5, changePercent: 0.25, volume: 55000000 },
            },
          });
        })
      );

      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results[0]).toHaveProperty('symbol');
      expect(data.results[0]).toHaveProperty('name');
      expect(data.results[0]).toHaveProperty('price');
      expect(data.results[0]).toHaveProperty('volume');
      expect(data.results[0]).toHaveProperty('marketCap');
      expect(data.results[0]).toHaveProperty('sector');
      expect(data.mock).toBeUndefined();
    });

    it('falls back to mock data when backend is unavailable', async () => {
      // Simulate backend failure
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.mock).toBe(true);
      expect(data.warning).toBeDefined();
    });

    it('falls back to mock data when backend returns error status', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
        })
      );

      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      // Use mock data for filtering tests
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.error();
        })
      );
    });

    it('filters stocks by minimum price', async () => {
      const request = createRequest('http://localhost:3000/api/screener?priceMin=400');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.every((stock) => stock.price >= 400)).toBe(true);
    });

    it('filters stocks by maximum price', async () => {
      const request = createRequest('http://localhost:3000/api/screener?priceMax=300');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.every((stock) => stock.price <= 300)).toBe(true);
    });

    it('filters stocks by price range', async () => {
      const request = createRequest('http://localhost:3000/api/screener?priceMin=200&priceMax=400');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.every((stock) => stock.price >= 200 && stock.price <= 400)).toBe(true);
    });

    it('filters stocks by minimum volume', async () => {
      const request = createRequest('http://localhost:3000/api/screener?volumeMin=30000000');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.every((stock) => stock.volume >= 30000000)).toBe(true);
    });

    it('filters stocks by minimum market cap', async () => {
      const request = createRequest('http://localhost:3000/api/screener?marketCapMin=1000000000000');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.every((stock) => stock.marketCap >= 1e12)).toBe(true);
    });

    it('filters stocks by maximum market cap', async () => {
      const request = createRequest('http://localhost:3000/api/screener?marketCapMax=1000000000000');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.every((stock) => stock.marketCap <= 1e12)).toBe(true);
    });

    it('filters stocks by market cap range', async () => {
      const request = createRequest(
        'http://localhost:3000/api/screener?marketCapMin=500000000000&marketCapMax=2000000000000'
      );
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(
        data.results.every((stock) => stock.marketCap >= 5e11 && stock.marketCap <= 2e12)
      ).toBe(true);
    });

    it('filters stocks by sector', async () => {
      const request = createRequest('http://localhost:3000/api/screener?sector=Technology');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.every((stock) => stock.sector === 'Technology')).toBe(true);
    });

    it('combines multiple filters', async () => {
      const request = createRequest(
        'http://localhost:3000/api/screener?priceMin=200&priceMax=400&volumeMin=20000000&sector=Technology'
      );
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(
        data.results.every(
          (stock) =>
            stock.price >= 200 &&
            stock.price <= 400 &&
            stock.volume >= 20000000 &&
            stock.sector === 'Technology'
        )
      ).toBe(true);
    });

    it('returns empty array when no stocks match filters', async () => {
      const request = createRequest(
        'http://localhost:3000/api/screener?priceMin=10000' // Unrealistic filter
      );
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      // Use mock data for sorting tests
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.error();
        })
      );
    });

    it('sorts by volume descending by default', async () => {
      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      const volumes = data.results.map((s) => s.volume);
      const sortedVolumes = [...volumes].sort((a, b) => b - a);
      expect(volumes).toEqual(sortedVolumes);
    });

    it('sorts by price descending', async () => {
      const request = createRequest('http://localhost:3000/api/screener?sortBy=price&sortOrder=desc');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      const prices = data.results.map((s) => s.price);
      const sortedPrices = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sortedPrices);
    });

    it('sorts by price ascending', async () => {
      const request = createRequest('http://localhost:3000/api/screener?sortBy=price&sortOrder=asc');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      const prices = data.results.map((s) => s.price);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });

    it('sorts by change percent descending', async () => {
      const request = createRequest('http://localhost:3000/api/screener?sortBy=change&sortOrder=desc');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      const changes = data.results.map((s) => s.changePercent);
      const sortedChanges = [...changes].sort((a, b) => b - a);
      expect(changes).toEqual(sortedChanges);
    });

    it('sorts by market cap descending', async () => {
      const request = createRequest(
        'http://localhost:3000/api/screener?sortBy=marketCap&sortOrder=desc'
      );
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      const marketCaps = data.results.map((s) => s.marketCap);
      const sortedMarketCaps = [...marketCaps].sort((a, b) => b - a);
      expect(marketCaps).toEqual(sortedMarketCaps);
    });

    it('sorts by volume ascending', async () => {
      const request = createRequest(
        'http://localhost:3000/api/screener?sortBy=volume&sortOrder=asc'
      );
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      const volumes = data.results.map((s) => s.volume);
      const sortedVolumes = [...volumes].sort((a, b) => a - b);
      expect(volumes).toEqual(sortedVolumes);
    });
  });

  describe('Combined Filtering and Sorting', () => {
    beforeEach(() => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.error();
        })
      );
    });

    it('filters and sorts correctly', async () => {
      const request = createRequest(
        'http://localhost:3000/api/screener?priceMin=200&sortBy=price&sortOrder=asc'
      );
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      // All results should match filter
      expect(data.results.every((stock) => stock.price >= 200)).toBe(true);
      // Results should be sorted by price ascending
      const prices = data.results.map((s) => s.price);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });

    it('filters by sector and sorts by volume', async () => {
      const request = createRequest(
        'http://localhost:3000/api/screener?sector=Technology&sortBy=volume&sortOrder=desc'
      );
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.every((stock) => stock.sector === 'Technology')).toBe(true);
      const volumes = data.results.map((s) => s.volume);
      const sortedVolumes = [...volumes].sort((a, b) => b - a);
      expect(volumes).toEqual(sortedVolumes);
    });
  });

  describe('Backend Integration', () => {
    it('merges real quote data with mock stock metadata', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.json({
            quotes: {
              AAPL: { last: 999.99, change: 50.0, changePercent: 5.0, volume: 100000000 },
            },
          });
        })
      );

      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      const aapl = data.results.find((s) => s.symbol === 'AAPL');

      if (aapl) {
        // Should use real quote price from backend
        expect(aapl.price).toBe(999.99);
        // Should preserve metadata from mock
        expect(aapl.name).toBeDefined();
        expect(aapl.sector).toBeDefined();
      }
    });

    it('preserves mock prices when backend returns no data for symbol', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          return HttpResponse.json({
            quotes: {
              // No data for AAPL, should fall back to mock price
            },
          });
        })
      );

      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      const aapl = data.results.find((s) => s.symbol === 'AAPL');

      if (aapl) {
        // Should use mock price since backend had no quote
        expect(aapl.price).toBeGreaterThan(0);
      }
    });
  });

  describe('Response Structure', () => {
    it('includes all required stock fields', async () => {
      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results.length).toBeGreaterThan(0);

      const stock = data.results[0];
      expect(stock).toHaveProperty('symbol');
      expect(stock).toHaveProperty('name');
      expect(stock).toHaveProperty('price');
      expect(stock).toHaveProperty('change');
      expect(stock).toHaveProperty('changePercent');
      expect(stock).toHaveProperty('volume');
      expect(stock).toHaveProperty('marketCap');
      expect(stock).toHaveProperty('sector');

      expect(typeof stock.symbol).toBe('string');
      expect(typeof stock.name).toBe('string');
      expect(typeof stock.price).toBe('number');
      expect(typeof stock.volume).toBe('number');
      expect(typeof stock.marketCap).toBe('number');
      expect(typeof stock.sector).toBe('string');
    });

    it('includes optional PE ratio when available', async () => {
      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      // Some stocks should have PE ratio
      const stocksWithPE = data.results.filter((s) => s.peRatio !== undefined);
      expect(stocksWithPE.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles internal errors gracefully', async () => {
      // Force an error by mocking the backend to throw
      server.use(
        http.get(`${BACKEND_URL}/api/market/quotes`, () => {
          throw new Error('Simulated error');
        })
      );

      const request = createRequest('http://localhost:3000/api/screener');
      const response = await GET(request);

      // Should still return 200 with mock data as fallback
      expect(response.status).toBe(200);
      const data = await parseResponse<ScreenerResponse>(response);
      expect(data.results).toBeDefined();
      expect(data.mock).toBe(true);
    });
  });
});
