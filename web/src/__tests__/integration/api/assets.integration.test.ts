/**
 * Integration Tests: /api/market/assets
 *
 * Tests the assets search API route with mocked Python backend responses.
 * Verifies: validation, successful responses, error handling, fallback behavior,
 * search filtering, asset class filtering, limit parameter.
 */
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET } from '@/app/api/market/assets/route';
import { createRequest, parseResponse } from '../test-utils';
import { server } from '../setup';

// Import setup to initialize MSW server
import '../setup';

interface Asset {
  symbol: string;
  name: string;
  class: string;
  exchange: string;
}

interface AssetsData {
  assets: Asset[];
  fallback?: boolean;
  warning?: string;
}

describe('/api/market/assets', () => {
  describe('Successful Responses', () => {
    it('returns assets for empty search', async () => {
      const request = createRequest('http://localhost:3000/api/market/assets');
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.assets).toBeDefined();
      expect(Array.isArray(data.assets)).toBe(true);
    });

    it('returns assets with correct structure', async () => {
      const request = createRequest('http://localhost:3000/api/market/assets');
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      if (data.assets.length > 0) {
        const asset = data.assets[0];
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('name');
        expect(asset).toHaveProperty('exchange');
      }
    });

    it('filters assets by search query', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?search=SPY'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.assets).toBeDefined();

      // All returned assets should match the search term
      data.assets.forEach(asset => {
        const matchesSymbol = asset.symbol.toUpperCase().includes('SPY');
        const matchesName = asset.name.toLowerCase().includes('spy');
        expect(matchesSymbol || matchesName).toBe(true);
      });
    });

    it('search is case-insensitive', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?search=spy'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.assets.length).toBeGreaterThan(0);
    });

    it('filters assets by name', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?search=Apple'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);

      // Should find assets with "Apple" in the name
      if (data.assets.length > 0) {
        const hasApple = data.assets.some(asset =>
          asset.name.toLowerCase().includes('apple')
        );
        expect(hasApple).toBe(true);
      }
    });
  });

  describe('Asset Class Filtering', () => {
    it('filters assets by us_equity class', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?class=us_equity'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);

      // All returned assets should be us_equity
      data.assets.forEach(asset => {
        if (asset.class) {
          expect(asset.class).toBe('us_equity');
        }
      });
    });

    it('filters assets by crypto class', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?class=crypto'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);

      // All returned assets should be crypto
      data.assets.forEach(asset => {
        if (asset.class) {
          expect(asset.class).toBe('crypto');
        }
      });
    });

    it('combines search and class filtering', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?search=BTC&class=crypto'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);

      // All returned assets should match both search and class
      data.assets.forEach(asset => {
        const matchesSearch =
          asset.symbol.toUpperCase().includes('BTC') ||
          asset.name.toLowerCase().includes('btc') ||
          asset.name.toLowerCase().includes('bitcoin');

        expect(matchesSearch).toBe(true);
        if (asset.class) {
          expect(asset.class).toBe('crypto');
        }
      });
    });
  });

  describe('Limit Parameter', () => {
    it('respects limit parameter', async () => {
      const limit = 5;
      const request = createRequest(
        `http://localhost:3000/api/market/assets?limit=${limit}`
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.assets.length).toBeLessThanOrEqual(limit);
    });

    it('uses default limit when not specified', async () => {
      const request = createRequest('http://localhost:3000/api/market/assets');
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      // Default limit is 20
      expect(data.assets.length).toBeLessThanOrEqual(20);
    });

    it('handles small limits correctly', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?limit=1'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.assets.length).toBeLessThanOrEqual(1);
    });

    it('handles large limits correctly', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?limit=100'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.assets.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns fallback data when backend is unavailable', async () => {
      // Override handler to simulate backend failure
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/market/assets');
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      // Should still return 200 with fallback data
      expect(response.status).toBe(200);
      expect(data.assets).toBeDefined();
      expect(data.fallback).toBe(true);
      expect(data.warning).toBeDefined();
      expect(data.warning).toContain('backend unavailable');
    });

    it('returns fallback data when backend returns error status', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const request = createRequest('http://localhost:3000/api/market/assets');
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.fallback).toBe(true);
      expect(data.assets.length).toBeGreaterThan(0);
    });

    it('filters fallback data by search query', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/market/assets?search=AAPL'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.fallback).toBe(true);

      // Fallback data should still be filtered
      const hasApple = data.assets.some(asset =>
        asset.symbol.includes('AAPL') ||
        asset.name.toLowerCase().includes('apple')
      );
      expect(hasApple).toBe(true);
    });

    it('filters fallback data by asset class', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/market/assets?class=crypto'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.fallback).toBe(true);

      // All fallback assets should be crypto
      data.assets.forEach(asset => {
        expect(asset.class).toBe('crypto');
      });
    });

    it('respects limit with fallback data', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.error();
        })
      );

      const limit = 3;
      const request = createRequest(
        `http://localhost:3000/api/market/assets?limit=${limit}`
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.fallback).toBe(true);
      expect(data.assets.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Response Metadata', () => {
    it('does not include fallback flag when backend responds successfully', async () => {
      const request = createRequest('http://localhost:3000/api/market/assets');
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      // When backend is available, fallback should be undefined or false
      expect(data.fallback).not.toBe(true);
    });
  });

  describe('Popular Symbols', () => {
    it('fallback includes popular ETFs', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/market/assets');
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);

      // Should include common ETFs
      const symbols = data.assets.map(a => a.symbol);
      const hasPopularETF = symbols.some(s =>
        ['SPY', 'QQQ', 'DIA', 'IWM'].includes(s)
      );
      expect(hasPopularETF).toBe(true);
    });

    it('fallback includes popular tech stocks', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/market/assets');
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);

      // Should include major tech companies
      const symbols = data.assets.map(a => a.symbol);
      const hasTechStock = symbols.some(s =>
        ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA'].includes(s)
      );
      expect(hasTechStock).toBe(true);
    });

    it('fallback includes popular cryptocurrencies', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/market/assets?class=crypto'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);

      // Should include major cryptocurrencies
      const symbols = data.assets.map(a => a.symbol);
      const hasCrypto = symbols.some(s =>
        ['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD'].includes(s)
      );
      expect(hasCrypto).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('returns empty array for search with no matches', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/market/assets', () => {
          return HttpResponse.json({ assets: [] });
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/market/assets?search=NONEXISTENT123'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.assets).toEqual([]);
    });

    it('handles special characters in search', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?search=BTC/USD'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      expect(data.assets).toBeDefined();
    });

    it('handles invalid limit gracefully', async () => {
      const request = createRequest(
        'http://localhost:3000/api/market/assets?limit=invalid'
      );
      const response = await GET(request);
      const data = await parseResponse<AssetsData>(response);

      expect(response.status).toBe(200);
      // Should use NaN which becomes default limit
      expect(data.assets).toBeDefined();
    });
  });
});
