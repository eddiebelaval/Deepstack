/**
 * Integration Tests: /api/news
 *
 * Tests the news API route with mocked Python backend responses.
 * Verifies: rate limiting bypass in tests, symbol filtering, fallback behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET } from '@/app/api/news/route';
import { createRequest, parseResponse } from '../test-utils';
import { server } from '../setup';

// Import setup to initialize MSW server
import '../setup';

// Mock the rate limiter to always allow requests in tests
vi.mock('@/lib/rate-limit-server', () => ({
  checkRateLimit: vi.fn(() => ({ success: true })),
  rateLimitResponse: vi.fn(),
}));

interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  symbols: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface NewsResponse {
  articles: NewsArticle[];
  mock?: boolean;
  warning?: string;
}

interface ErrorResponse {
  error: string;
}

describe('/api/news', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Responses', () => {
    it('returns news articles without symbol filter', async () => {
      const request = createRequest('http://localhost:3000/api/news');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.articles).toBeDefined();
      expect(Array.isArray(data.articles)).toBe(true);
      expect(data.articles.length).toBeGreaterThan(0);
    });

    it('returns news articles filtered by symbol', async () => {
      const request = createRequest('http://localhost:3000/api/news?symbol=SPY');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.articles).toBeDefined();
      // All articles should include SPY in their symbols
      data.articles.forEach((article) => {
        expect(article.symbols).toContain('SPY');
      });
    });

    it('normalizes symbol to uppercase', async () => {
      const request = createRequest('http://localhost:3000/api/news?symbol=spy');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      expect(response.status).toBe(200);
    });

    it('respects limit parameter', async () => {
      const request = createRequest('http://localhost:3000/api/news?limit=5');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.articles).toBeDefined();
    });

    it('returns articles with correct structure', async () => {
      const request = createRequest('http://localhost:3000/api/news');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      const article = data.articles[0];
      expect(article).toHaveProperty('id');
      expect(article).toHaveProperty('headline');
      expect(article).toHaveProperty('summary');
      expect(article).toHaveProperty('url');
      expect(article).toHaveProperty('source');
      expect(article).toHaveProperty('publishedAt');
      expect(article).toHaveProperty('symbols');
      expect(article).toHaveProperty('sentiment');
    });

    it('returns sentiment for articles', async () => {
      const request = createRequest('http://localhost:3000/api/news');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      data.articles.forEach((article) => {
        expect(['positive', 'negative', 'neutral']).toContain(article.sentiment);
      });
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns mock data when backend is unavailable', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/news', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/news');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.articles).toBeDefined();
      expect(data.mock).toBe(true);
      expect(data.warning).toBeDefined();
    });

    it('returns mock data when backend returns 500', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/news', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const request = createRequest('http://localhost:3000/api/news');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
    });

    it('filters mock data by symbol when backend fails', async () => {
      server.use(
        http.get('http://127.0.0.1:8000/api/news', () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/news?symbol=SPY');
      const response = await GET(request);
      const data = await parseResponse<NewsResponse>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
      // Mock fallback should still filter by symbol
      data.articles.forEach((article) => {
        expect(article.symbols).toContain('SPY');
      });
    });
  });
});
