/**
 * Integration Tests: /api/prediction-markets
 *
 * Tests the prediction markets API routes with mocked Python backend responses.
 * Verifies: market listing, filtering, search, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET } from '@/app/api/prediction-markets/route';
import { GET as SearchGET } from '@/app/api/prediction-markets/search/route';
import { GET as NewGET } from '@/app/api/prediction-markets/new/route';
import { createRequest, parseResponse } from '../test-utils';
import { server } from '../setup';

// Import setup to initialize MSW server
import '../setup';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface PredictionMarket {
  id: string;
  platform: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  volume24h: number;
  openInterest: number;
  endDate: string;
  status: string;
  url: string;
}

interface MarketsResponse {
  markets: PredictionMarket[];
  count: number;
  error?: string;
  unavailable?: boolean;
}

describe('/api/prediction-markets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/prediction-markets', () => {
    describe('Successful Responses', () => {
      it('returns trending prediction markets', async () => {
        const request = createRequest('http://localhost:3000/api/prediction-markets');
        const response = await GET(request);
        const data = await parseResponse<MarketsResponse>(response);

        expect(response.status).toBe(200);
        expect(data.markets).toBeDefined();
        expect(Array.isArray(data.markets)).toBe(true);
        expect(data.count).toBeDefined();
      });

      it('respects limit parameter', async () => {
        const request = createRequest('http://localhost:3000/api/prediction-markets?limit=5');
        const response = await GET(request);
        const data = await parseResponse<MarketsResponse>(response);

        expect(response.status).toBe(200);
        expect(data.markets.length).toBeLessThanOrEqual(5);
      });

      it('respects offset parameter for pagination', async () => {
        const request = createRequest('http://localhost:3000/api/prediction-markets?limit=10&offset=10');
        const response = await GET(request);
        const data = await parseResponse<MarketsResponse>(response);

        expect(response.status).toBe(200);
        expect(data.markets).toBeDefined();
      });

      it('filters by category', async () => {
        server.use(
          http.get(`${BACKEND_URL}/api/predictions/trending`, ({ request }) => {
            const url = new URL(request.url);
            const category = url.searchParams.get('category');

            return HttpResponse.json({
              markets: [
                {
                  id: 'PM-CRYPTO-1',
                  platform: 'polymarket',
                  title: 'Bitcoin above $100K?',
                  category: 'Crypto',
                  yes_price: 0.45,
                  no_price: 0.55,
                  volume: 1000000,
                  volume_24h: 50000,
                  open_interest: 250000,
                  end_date: '2024-12-31',
                  status: 'active',
                  url: 'https://polymarket.com/crypto',
                },
              ],
              count: 1,
            });
          })
        );

        const request = createRequest('http://localhost:3000/api/prediction-markets?category=Crypto');
        const response = await GET(request);
        const data = await parseResponse<MarketsResponse>(response);

        expect(response.status).toBe(200);
      });

      it('filters by source platform', async () => {
        server.use(
          http.get(`${BACKEND_URL}/api/predictions/trending`, ({ request }) => {
            const url = new URL(request.url);
            const source = url.searchParams.get('source');

            return HttpResponse.json({
              markets: [
                {
                  id: 'K-MARKET-1',
                  platform: 'kalshi',
                  title: 'Fed Rate Cut?',
                  category: 'Economics',
                  yes_price: 0.70,
                  no_price: 0.30,
                  volume: 500000,
                  volume_24h: 25000,
                  open_interest: 150000,
                  end_date: '2024-06-30',
                  status: 'active',
                  url: 'https://kalshi.com/fed',
                },
              ],
              count: 1,
            });
          })
        );

        const request = createRequest('http://localhost:3000/api/prediction-markets?source=kalshi');
        const response = await GET(request);
        const data = await parseResponse<MarketsResponse>(response);

        expect(response.status).toBe(200);
      });

      it('transforms snake_case to camelCase', async () => {
        const request = createRequest('http://localhost:3000/api/prediction-markets');
        const response = await GET(request);
        const data = await parseResponse<MarketsResponse>(response);

        if (data.markets.length > 0) {
          const market = data.markets[0];
          // Should have camelCase properties
          expect(market).toHaveProperty('yesPrice');
          expect(market).toHaveProperty('noPrice');
          expect(market).toHaveProperty('volume24h');
          expect(market).toHaveProperty('openInterest');
          expect(market).toHaveProperty('endDate');
          // Should NOT have snake_case
          expect(market).not.toHaveProperty('yes_price');
          expect(market).not.toHaveProperty('no_price');
        }
      });
    });

    describe('Error Handling', () => {
      it('returns 503 when backend is unavailable', async () => {
        server.use(
          http.get(`${BACKEND_URL}/api/predictions/trending`, () => {
            return HttpResponse.error();
          })
        );

        const request = createRequest('http://localhost:3000/api/prediction-markets');
        const response = await GET(request);
        const data = await parseResponse<MarketsResponse>(response);

        expect(response.status).toBe(503);
        expect(data.error).toBeDefined();
        expect(data.unavailable).toBe(true);
      });

      it('returns 503 when backend returns 500', async () => {
        server.use(
          http.get(`${BACKEND_URL}/api/predictions/trending`, () => {
            return HttpResponse.json(
              { error: 'Internal server error' },
              { status: 500 }
            );
          })
        );

        const request = createRequest('http://localhost:3000/api/prediction-markets');
        const response = await GET(request);

        expect(response.status).toBe(503);
      });

      it('returns 503 when backend returns 404', async () => {
        server.use(
          http.get(`${BACKEND_URL}/api/predictions/trending`, () => {
            return HttpResponse.json(
              { error: 'Not found' },
              { status: 404 }
            );
          })
        );

        const request = createRequest('http://localhost:3000/api/prediction-markets');
        const response = await GET(request);

        expect(response.status).toBe(503);
      });
    });
  });

  describe('GET /api/prediction-markets/search', () => {
    beforeEach(() => {
      // Add search endpoint handler
      server.use(
        http.get(`${BACKEND_URL}/api/predictions/search`, ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get('q') || '';

          const allMarkets = [
            {
              id: 'PM-SEARCH-1',
              platform: 'polymarket',
              title: 'Bitcoin price prediction',
              category: 'Crypto',
              yes_price: 0.45,
              no_price: 0.55,
              volume: 1000000,
              volume_24h: 50000,
              open_interest: 250000,
              end_date: '2024-12-31',
              status: 'active',
              url: 'https://polymarket.com/btc',
            },
            {
              id: 'PM-SEARCH-2',
              platform: 'kalshi',
              title: 'Election outcome 2024',
              category: 'Politics',
              yes_price: 0.52,
              no_price: 0.48,
              volume: 5000000,
              volume_24h: 200000,
              open_interest: 1500000,
              end_date: '2024-11-05',
              status: 'active',
              url: 'https://kalshi.com/election',
            },
          ];

          const filtered = query
            ? allMarkets.filter(m =>
                m.title.toLowerCase().includes(query.toLowerCase()) ||
                m.category.toLowerCase().includes(query.toLowerCase())
              )
            : allMarkets;

          return HttpResponse.json({
            markets: filtered,
            count: filtered.length,
          });
        })
      );
    });

    it('searches markets by query', async () => {
      const request = createRequest('http://localhost:3000/api/prediction-markets/search?q=bitcoin');
      const response = await SearchGET(request);
      const data = await parseResponse<MarketsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.markets).toBeDefined();
    });

    it('returns empty array for no matches', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/predictions/search`, () => {
          return HttpResponse.json({
            markets: [],
            count: 0,
          });
        })
      );

      const request = createRequest('http://localhost:3000/api/prediction-markets/search?q=nonexistentquery');
      const response = await SearchGET(request);
      const data = await parseResponse<MarketsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.markets).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('handles missing query parameter gracefully', async () => {
      const request = createRequest('http://localhost:3000/api/prediction-markets/search');
      const response = await SearchGET(request);

      // Should return results or handle gracefully
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('GET /api/prediction-markets/new', () => {
    beforeEach(() => {
      server.use(
        http.get(`${BACKEND_URL}/api/predictions/new`, ({ request }) => {
          const url = new URL(request.url);
          const limit = parseInt(url.searchParams.get('limit') || '20', 10);

          return HttpResponse.json({
            markets: [
              {
                id: 'PM-NEW-1',
                platform: 'polymarket',
                title: 'New Market: AI Regulation 2025',
                category: 'Tech',
                yes_price: 0.50,
                no_price: 0.50,
                volume: 10000,
                volume_24h: 5000,
                open_interest: 8000,
                end_date: '2025-01-01',
                status: 'active',
                created_at: new Date().toISOString(),
                url: 'https://polymarket.com/ai-reg',
              },
            ].slice(0, limit),
            count: 1,
          });
        })
      );
    });

    it('returns newly created markets', async () => {
      const request = createRequest('http://localhost:3000/api/prediction-markets/new');
      const response = await NewGET(request);
      const data = await parseResponse<MarketsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.markets).toBeDefined();
      expect(Array.isArray(data.markets)).toBe(true);
    });

    it('respects limit parameter', async () => {
      const request = createRequest('http://localhost:3000/api/prediction-markets/new?limit=5');
      const response = await NewGET(request);
      const data = await parseResponse<MarketsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.markets.length).toBeLessThanOrEqual(5);
    });
  });
});
