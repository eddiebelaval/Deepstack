import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the transform utility
vi.mock('@/lib/utils/prediction-market-transform', () => ({
  transformMarket: vi.fn((market) => ({
    id: market.id,
    platform: market.platform,
    title: market.title,
    category: market.category || 'Unknown',
    yesPrice: market.yes_price ?? market.yesPrice ?? 0,
    noPrice: market.no_price ?? market.noPrice ?? 0,
    volume: market.volume ?? 0,
    volume24h: market.volume_24h ?? market.volume24h,
    openInterest: market.open_interest ?? market.openInterest,
    endDate: market.end_date ?? market.endDate,
    status: market.status || 'active',
    url: market.url || '',
    description: market.description,
  })),
}));

describe('Prediction Markets API Route', () => {
  const originalFetch = global.fetch;
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('successful backend responses', () => {
    it('should transform snake_case response to camelCase', async () => {
      const mockBackendResponse = {
        markets: [
          {
            id: 'TEST-1',
            platform: 'kalshi',
            title: 'Test Market 1',
            category: 'Economics',
            yes_price: 0.75,
            no_price: 0.25,
            volume: 1000000,
            volume_24h: 50000,
            open_interest: 75000,
            end_date: '2025-12-31',
            status: 'active',
            url: 'https://example.com/market1',
            description: 'Test description 1',
          },
          {
            id: 'TEST-2',
            platform: 'polymarket',
            title: 'Test Market 2',
            category: 'Crypto',
            yes_price: 0.60,
            no_price: 0.40,
            volume: 2000000,
            volume_24h: 100000,
            open_interest: 150000,
            end_date: '2025-06-30',
            status: 'active',
            url: 'https://example.com/market2',
            description: 'Test description 2',
          },
        ],
        count: 2,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets?limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(data.markets).toHaveLength(2);
      expect(data.markets[0]).toEqual({
        id: 'TEST-1',
        platform: 'kalshi',
        title: 'Test Market 1',
        category: 'Economics',
        yesPrice: 0.75,
        noPrice: 0.25,
        volume: 1000000,
        volume24h: 50000,
        openInterest: 75000,
        endDate: '2025-12-31',
        status: 'active',
        url: 'https://example.com/market1',
        description: 'Test description 1',
      });
      expect(data.markets[1].yesPrice).toBe(0.60);
      expect(data.count).toBe(2);
    });

    it('should handle empty markets array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          markets: [],
          count: 0,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.markets).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should handle backend response without count field', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          markets: [
            {
              id: 'TEST-1',
              platform: 'kalshi',
              title: 'Test Market',
              yes_price: 0.5,
              no_price: 0.5,
            },
          ],
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.markets).toHaveLength(1);
      expect(data.count).toBeUndefined();
    });
  });

  describe('backend error handling', () => {
    it('should return 503 error when backend unavailable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBeDefined();
      expect(data.unavailable).toBe(true);
    });

    it('should return 503 error when backend returns error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBeDefined();
      expect(data.unavailable).toBe(true);
    });

    it('should return 503 error when backend returns 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.unavailable).toBe(true);
    });

    it('should return 503 error when backend JSON parsing fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.unavailable).toBe(true);
    });
  });

  describe('query parameter handling', () => {
    it('should pass through category filter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [], count: 0 }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/prediction-markets?category=Economics'
      );
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/api/predictions/trending?limit=20&category=Economics`,
        { cache: 'no-store' }
      );
    });

    it('should pass through source filter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [], count: 0 }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/prediction-markets?source=kalshi'
      );
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/api/predictions/trending?limit=20&source=kalshi`,
        { cache: 'no-store' }
      );
    });

    it('should not pass source=all to backend', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [], count: 0 }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets?source=all');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/api/predictions/trending?limit=20`,
        { cache: 'no-store' }
      );
    });

    it('should handle custom limit parameter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [], count: 0 }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets?limit=50');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/api/predictions/trending?limit=50`,
        { cache: 'no-store' }
      );
    });

    it('should default to limit=20 when not provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [], count: 0 }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/api/predictions/trending?limit=20`,
        { cache: 'no-store' }
      );
    });

    it('should combine multiple query parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [], count: 0 }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/prediction-markets?limit=30&category=Crypto&source=polymarket'
      );
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/api/predictions/trending?limit=30&category=Crypto&source=polymarket`,
        { cache: 'no-store' }
      );
    });

    it('should handle URL-encoded category names', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [], count: 0 }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/prediction-markets?category=Tech%20%26%20Science'
      );
      await GET(request);

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('category=Tech+%26+Science');
    });
  });

  describe('error response structure', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Force error'));
    });

    it('should return 503 with correct error structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('unavailable', true);
    });

    it('should include helpful error message', async () => {
      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.message).toContain('unavailable');
    });
  });

  describe('response caching', () => {
    it('should set cache control to no-store', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [], count: 0 }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(expect.any(String), {
        cache: 'no-store',
      });
    });
  });

  describe('data transformation edge cases', () => {
    it('should handle markets with partial data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          markets: [
            {
              id: 'PARTIAL-1',
              title: 'Partial Market',
              platform: 'kalshi',
            },
          ],
          count: 1,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.markets[0]).toHaveProperty('id', 'PARTIAL-1');
      expect(data.markets[0]).toHaveProperty('title', 'Partial Market');
      expect(data.markets[0]).toHaveProperty('category', 'Unknown');
      expect(data.markets[0]).toHaveProperty('yesPrice', 0);
    });

    it('should handle markets with null values', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          markets: [
            {
              id: 'NULL-TEST',
              platform: 'polymarket',
              title: 'Null Test',
              category: null,
              yes_price: null,
              no_price: null,
              volume: null,
            },
          ],
          count: 1,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.markets[0].category).toBe('Unknown');
      expect(data.markets[0].yesPrice).toBe(0);
      expect(data.markets[0].noPrice).toBe(0);
      expect(data.markets[0].volume).toBe(0);
    });

    it('should handle markets array being undefined', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          count: 0,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.markets).toEqual([]);
    });
  });

  describe('error logging', () => {
    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn().mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/prediction-markets');
      await GET(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Prediction markets fetch error:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
