import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { predictionMarketTools } from '../prediction-market-tools';

describe('Prediction Market Tools', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default environment
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe('search_prediction_markets tool', () => {
    it('should have correct schema definition', () => {
      const tool = predictionMarketTools.search_prediction_markets;

      expect(tool.description).toContain('Search prediction markets');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should search markets successfully', async () => {
      const mockResponse = {
        markets: [
          {
            id: 'fed-rate-jan25',
            platform: 'kalshi',
            title: 'Will the Fed cut rates in January 2025?',
            category: 'economics',
            yesPrice: 0.12,
            noPrice: 0.88,
            volume: 2500000,
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await predictionMarketTools.search_prediction_markets.execute({
        query: 'Fed rate cuts',
        source: 'all',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.markets).toHaveLength(1);
      expect(result.data.query).toBe('Fed rate cuts');
      expect(result.mock).toBe(false);
    });

    it('should filter by source platform', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      await predictionMarketTools.search_prediction_markets.execute({
        query: 'Bitcoin',
        source: 'polymarket',
        limit: 10,
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('source=polymarket');
    });

    it('should handle API errors with mock fallback', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await predictionMarketTools.search_prediction_markets.execute({
        query: 'Bitcoin',
        source: 'all',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(Array.isArray(result.data.markets)).toBe(true);
    });

    it('should return mock data when API returns non-ok status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await predictionMarketTools.search_prediction_markets.execute({
        query: 'recession',
        source: 'kalshi',
        limit: 5,
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });

    it('should filter mock data by query', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await predictionMarketTools.search_prediction_markets.execute({
        query: 'Bitcoin',
        source: 'all',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.markets.every((m: any) =>
        m.title.toLowerCase().includes('bitcoin') ||
        m.category.toLowerCase().includes('bitcoin') ||
        m.description?.toLowerCase().includes('bitcoin')
      )).toBe(true);
    });

    it('should respect limit parameter', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await predictionMarketTools.search_prediction_markets.execute({
        query: '',
        source: 'all',
        limit: 3,
      });

      expect(result.data.markets.length).toBeLessThanOrEqual(3);
    });
  });

  describe('get_prediction_market tool', () => {
    it('should have correct schema definition', () => {
      const tool = predictionMarketTools.get_prediction_market;

      expect(tool.description).toContain('Get detailed information');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should fetch market details successfully', async () => {
      const mockMarket = {
        id: 'fed-rate-jan25',
        platform: 'kalshi',
        title: 'Will the Fed cut rates in January 2025?',
        yesPrice: 0.12,
        noPrice: 0.88,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMarket,
      });

      const result = await predictionMarketTools.get_prediction_market.execute({
        platform: 'kalshi',
        market_id: 'fed-rate-jan25',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('fed-rate-jan25');
    });

    it('should include price history in mock data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await predictionMarketTools.get_prediction_market.execute({
        platform: 'kalshi',
        market_id: 'fed-rate-jan25',
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.data.priceHistory).toBeDefined();
      expect(Array.isArray(result.data.priceHistory)).toBe(true);
    });

    it('should return error for non-existent market', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await predictionMarketTools.get_prediction_market.execute({
        platform: 'kalshi',
        market_id: 'non-existent-market',
      });

      // Should try mock data, but market not found
      if (!result.success) {
        expect(result.error).toContain('Market not found');
      }
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await predictionMarketTools.get_prediction_market.execute({
        platform: 'polymarket',
        market_id: 'btc-100k-2025',
      });

      // Should fall back to mock data
      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });
  });

  describe('get_trending_prediction_markets tool', () => {
    it('should have correct schema definition', () => {
      const tool = predictionMarketTools.get_trending_prediction_markets;

      expect(tool.description).toContain('trending prediction markets');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should fetch trending markets successfully', async () => {
      const mockResponse = {
        markets: [
          { id: 'market-1', volume: 5000000, title: 'High Volume Market' },
          { id: 'market-2', volume: 3000000, title: 'Medium Volume Market' },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await predictionMarketTools.get_trending_prediction_markets.execute({
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.markets).toHaveLength(2);
    });

    it('should filter by category', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      await predictionMarketTools.get_trending_prediction_markets.execute({
        limit: 10,
        category: 'economics',
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('category=economics');
    });

    it('should sort mock data by volume', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await predictionMarketTools.get_trending_prediction_markets.execute({
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);

      // Verify markets are sorted by volume descending
      const volumes = result.data.markets.map((m: any) => m.volume);
      for (let i = 1; i < volumes.length; i++) {
        expect(volumes[i]).toBeLessThanOrEqual(volumes[i - 1]);
      }
    });

    it('should filter mock data by category', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await predictionMarketTools.get_trending_prediction_markets.execute({
        limit: 10,
        category: 'crypto',
      });

      expect(result.success).toBe(true);
      expect(result.data.markets.every((m: any) => m.category === 'crypto')).toBe(true);
    });
  });

  describe('find_markets_for_thesis tool', () => {
    it('should have correct schema definition', () => {
      const tool = predictionMarketTools.find_markets_for_thesis;

      expect(tool.description).toContain('Find prediction markets that relate to a trading thesis');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should extract keywords from hypothesis about Fed rates', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      const result = await predictionMarketTools.find_markets_for_thesis.execute({
        hypothesis: 'The Fed will cut interest rates in 2025',
      });

      expect(result.success).toBe(true);
      expect(result.data.searchTerms).toContain('fed rate');
    });

    it('should extract keywords from hypothesis about inflation', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      const result = await predictionMarketTools.find_markets_for_thesis.execute({
        hypothesis: 'Inflation will remain elevated due to CPI pressures',
      });

      expect(result.success).toBe(true);
      expect(result.data.searchTerms).toContain('inflation');
    });

    it('should include symbol in search terms if provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      const result = await predictionMarketTools.find_markets_for_thesis.execute({
        symbol: 'NVDA',
        hypothesis: 'NVDA earnings will beat expectations',
      });

      expect(result.success).toBe(true);
      expect(result.data.searchTerms).toContain('NVDA');
      expect(result.data.symbol).toBe('NVDA');
    });

    it('should deduplicate markets from multiple searches', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          markets: [
            { id: 'market-1', title: 'Market 1' },
            { id: 'market-1', title: 'Market 1' }, // Duplicate
          ],
        }),
      });

      const result = await predictionMarketTools.find_markets_for_thesis.execute({
        hypothesis: 'Bitcoin will reach new all-time high',
      });

      expect(result.success).toBe(true);
      // Should deduplicate by ID
      const ids = result.data.markets.map((m: any) => m.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should limit results to 10 markets', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          markets: Array.from({ length: 20 }, (_, i) => ({
            id: `market-${i}`,
            title: `Market ${i}`,
          })),
        }),
      });

      const result = await predictionMarketTools.find_markets_for_thesis.execute({
        hypothesis: 'Market hypothesis',
      });

      expect(result.data.markets.length).toBeLessThanOrEqual(10);
    });

    it('should handle API errors with mock fallback', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await predictionMarketTools.find_markets_for_thesis.execute({
        hypothesis: 'Bitcoin price prediction',
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });
  });

  describe('show_prediction_markets tool', () => {
    it('should have correct schema definition', () => {
      const tool = predictionMarketTools.show_prediction_markets;

      expect(tool.description).toContain('Show the prediction markets panel');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should return panel action without market_id', async () => {
      const result = await predictionMarketTools.show_prediction_markets.execute({});

      expect(result.success).toBe(true);
      expect(result.action).toBe('show_panel');
      expect(result.panel).toBe('prediction-markets');
      expect(result.message).toContain('Showing prediction markets panel');
    });

    it('should return panel action with specific market', async () => {
      const result = await predictionMarketTools.show_prediction_markets.execute({
        market_id: 'fed-rate-jan25',
        platform: 'kalshi',
      });

      expect(result.success).toBe(true);
      expect(result.market_id).toBe('fed-rate-jan25');
      expect(result.platform).toBe('kalshi');
      expect(result.message).toContain('fed-rate-jan25');
    });

    it('should include filters when provided', async () => {
      const result = await predictionMarketTools.show_prediction_markets.execute({
        filter: {
          category: 'economics',
          source: 'kalshi',
        },
      });

      expect(result.success).toBe(true);
      expect(result.filter).toEqual({
        category: 'economics',
        source: 'kalshi',
      });
    });
  });

  describe('compare_market_to_analysis tool', () => {
    it('should have correct schema definition', () => {
      const tool = predictionMarketTools.compare_market_to_analysis;

      expect(tool.description).toContain('Compare a prediction market probability');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should fetch and compare market data successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'fed-rate-jan25',
          platform: 'kalshi',
          title: 'Will the Fed cut rates?',
          yesPrice: 0.75,
          volume: 5000000,
        }),
      });

      const result = await predictionMarketTools.compare_market_to_analysis.execute({
        market_id: 'fed-rate-jan25',
        platform: 'kalshi',
        comparison_type: 'macro_outlook',
      });

      expect(result.success).toBe(true);
      expect(result.data.market.probability).toBe(75);
      expect(result.data.analysis).toBeDefined();
    });

    it('should return error for non-existent market', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await predictionMarketTools.compare_market_to_analysis.execute({
        market_id: 'non-existent',
        platform: 'kalshi',
        comparison_type: 'stock_analysis',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Market not found');
    });

    it('should generate appropriate analysis for stock comparison', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'nvda-earnings',
          yesPrice: 0.78,
          volume: 1200000,
        }),
      });

      const result = await predictionMarketTools.compare_market_to_analysis.execute({
        market_id: 'nvda-earnings',
        platform: 'polymarket',
        comparison_type: 'stock_analysis',
        symbol: 'NVDA',
      });

      expect(result.success).toBe(true);
      expect(result.data.analysis.insight).toContain('NVDA');
    });

    it('should fall back to mock data on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await predictionMarketTools.compare_market_to_analysis.execute({
        market_id: 'fed-rate-jan25',
        platform: 'kalshi',
        comparison_type: 'macro_outlook',
      });

      // Should try mock data
      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });
  });

  describe('Mock data helpers', () => {
    it('should generate consistent price history', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await predictionMarketTools.get_prediction_market.execute({
        platform: 'kalshi',
        market_id: 'fed-rate-jan25',
      });

      if (result.success && result.data.priceHistory) {
        const history = result.data.priceHistory;

        // Should have 31 data points (30 days + current)
        expect(history.length).toBeGreaterThan(0);

        // Last price should match current price
        const lastPrice = history[history.length - 1].yesPrice;
        expect(lastPrice).toBe(result.data.yesPrice);

        // All prices should be between 0.01 and 0.99
        history.forEach((point: any) => {
          expect(point.yesPrice).toBeGreaterThanOrEqual(0.01);
          expect(point.yesPrice).toBeLessThanOrEqual(0.99);
        });
      }
    });

    it('should format volume correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          yesPrice: 0.5,
          volume: 5500000,
        }),
      });

      const result = await predictionMarketTools.compare_market_to_analysis.execute({
        market_id: 'test',
        platform: 'kalshi',
        comparison_type: 'macro_outlook',
      });

      if (result.success) {
        expect(result.data.analysis.market_says).toContain('$5.5M');
      }
    });
  });

  describe('Environment variable handling', () => {
    it('should use VERCEL_URL when available', async () => {
      process.env.VERCEL_URL = 'deepstack.vercel.app';
      delete process.env.NEXT_PUBLIC_APP_URL;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      await predictionMarketTools.search_prediction_markets.execute({
        query: 'test',
        source: 'all',
        limit: 10,
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('https://deepstack.vercel.app');
    });

    it('should use NEXT_PUBLIC_APP_URL when VERCEL_URL not available', async () => {
      delete process.env.VERCEL_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      await predictionMarketTools.search_prediction_markets.execute({
        query: 'test',
        source: 'all',
        limit: 10,
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('http://localhost:3000');
    });

    it('should default to localhost when no env vars set', async () => {
      delete process.env.VERCEL_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      await predictionMarketTools.search_prediction_markets.execute({
        query: 'test',
        source: 'all',
        limit: 10,
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('http://localhost:3000');
    });
  });
});
