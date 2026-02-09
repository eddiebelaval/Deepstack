import { tool } from 'ai';
import { z } from 'zod';
import type { PredictionMarket } from '@/lib/types/prediction-markets';
import { getBaseUrl } from './utils';

// Mock prediction market data for development/fallback
const MOCK_MARKETS: PredictionMarket[] = [
  {
    id: 'fed-rate-jan25',
    platform: 'kalshi',
    title: 'Will the Fed cut rates in January 2025?',
    category: 'economics',
    yesPrice: 0.12,
    noPrice: 0.88,
    volume: 2500000,
    volume24h: 125000,
    endDate: '2025-01-29',
    status: 'active',
    url: 'https://kalshi.com/markets/fed-rate-jan25',
    description: 'Resolves YES if the Federal Reserve announces a rate cut at the January 2025 FOMC meeting.',
  },
  {
    id: 'btc-100k-2025',
    platform: 'polymarket',
    title: 'Will Bitcoin reach $100,000 by end of 2025?',
    category: 'crypto',
    yesPrice: 0.72,
    noPrice: 0.28,
    volume: 8500000,
    volume24h: 450000,
    endDate: '2025-12-31',
    status: 'active',
    url: 'https://polymarket.com/event/btc-100k-2025',
    description: 'Resolves YES if Bitcoin price reaches or exceeds $100,000 USD at any point before December 31, 2025.',
  },
  {
    id: 'recession-2025',
    platform: 'kalshi',
    title: 'Will there be a US recession in 2025?',
    category: 'economics',
    yesPrice: 0.25,
    noPrice: 0.75,
    volume: 3200000,
    volume24h: 180000,
    endDate: '2025-12-31',
    status: 'active',
    url: 'https://kalshi.com/markets/recession-2025',
    description: 'Resolves YES if NBER officially declares a recession starting in 2025.',
  },
  {
    id: 'sp500-6000',
    platform: 'kalshi',
    title: 'Will S&P 500 close above 6000 in Q1 2025?',
    category: 'economics',
    yesPrice: 0.58,
    noPrice: 0.42,
    volume: 1800000,
    volume24h: 95000,
    endDate: '2025-03-31',
    status: 'active',
    url: 'https://kalshi.com/markets/sp500-6000-q1',
    description: 'Resolves YES if S&P 500 closes at or above 6000 on any trading day in Q1 2025.',
  },
  {
    id: 'nvda-earnings-beat',
    platform: 'polymarket',
    title: 'Will NVDA beat Q4 2024 earnings estimates?',
    category: 'stocks',
    yesPrice: 0.78,
    noPrice: 0.22,
    volume: 1200000,
    volume24h: 320000,
    endDate: '2025-02-26',
    status: 'active',
    url: 'https://polymarket.com/event/nvda-q4-earnings',
    description: 'Resolves YES if NVIDIA reports Q4 2024 EPS above consensus estimate.',
  },
  {
    id: 'eth-merge-staking',
    platform: 'polymarket',
    title: 'Will ETH staking yield exceed 5% in 2025?',
    category: 'crypto',
    yesPrice: 0.42,
    noPrice: 0.58,
    volume: 950000,
    volume24h: 48000,
    endDate: '2025-12-31',
    status: 'active',
    url: 'https://polymarket.com/event/eth-staking-yield',
    description: 'Resolves YES if ETH staking APY exceeds 5% for at least 30 consecutive days.',
  },
  {
    id: 'trump-tariffs-china',
    platform: 'kalshi',
    title: 'Will Trump impose 60%+ tariffs on China in 2025?',
    category: 'politics',
    yesPrice: 0.65,
    noPrice: 0.35,
    volume: 4100000,
    volume24h: 280000,
    endDate: '2025-12-31',
    status: 'active',
    url: 'https://kalshi.com/markets/trump-tariffs-china',
    description: 'Resolves YES if tariffs of 60% or higher are imposed on Chinese imports.',
  },
  {
    id: 'tsla-1000',
    platform: 'polymarket',
    title: 'Will TSLA reach $1000 per share in 2025?',
    category: 'stocks',
    yesPrice: 0.18,
    noPrice: 0.82,
    volume: 2100000,
    volume24h: 175000,
    endDate: '2025-12-31',
    status: 'active',
    url: 'https://polymarket.com/event/tsla-1000',
    description: 'Resolves YES if Tesla stock price reaches $1000 at any point in 2025.',
  },
];

// Helper to filter mock markets
function filterMockMarkets(
  query?: string,
  source?: string,
  category?: string,
  limit = 10
): PredictionMarket[] {
  let filtered = [...MOCK_MARKETS];

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
    );
  }

  if (source && source !== 'all') {
    filtered = filtered.filter((m) => m.platform === source);
  }

  if (category) {
    filtered = filtered.filter((m) => m.category === category.toLowerCase());
  }

  return filtered.slice(0, limit);
}

export const predictionMarketTools = {
  search_prediction_markets: tool({
    description:
      'Search prediction markets on Kalshi and Polymarket by topic, keyword, or question. Use this to find markets about specific events like Fed rate decisions, elections, crypto prices, earnings, etc.',
    inputSchema: z.object({
      query: z
        .string()
        .describe('Search query (e.g., "Fed rate cuts", "Trump election", "Bitcoin price", "NVDA earnings")'),
      source: z
        .enum(['all', 'kalshi', 'polymarket'])
        .optional()
        .default('all')
        .describe('Filter by platform'),
      limit: z.number().optional().default(10).describe('Maximum results to return'),
    }),
    execute: async ({ query, source, limit }) => {
      const baseUrl = getBaseUrl();
      try {
        const params = new URLSearchParams({ q: query, limit: String(limit || 10) });
        if (source && source !== 'all') params.append('source', source);

        const response = await fetch(`${baseUrl}/api/prediction-markets/search?${params}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          // Fall back to mock data
          const mockResults = filterMockMarkets(query, source, undefined, limit);
          return {
            success: true,
            data: {
              markets: mockResults,
              query,
              source,
              count: mockResults.length,
            },
            mock: true,
          };
        }

        const data = await response.json();
        return {
          success: true,
          data: {
            markets: data.markets,
            query,
            source,
            count: data.markets?.length || 0,
          },
          mock: data.mock || false,
        };
      } catch {
        // Return mock data on error
        const mockResults = filterMockMarkets(query, source, undefined, limit);
        return {
          success: true,
          data: {
            markets: mockResults,
            query,
            source,
            count: mockResults.length,
          },
          mock: true,
        };
      }
    },
  }),

  get_prediction_market: tool({
    description:
      'Get detailed information about a specific prediction market including current probability, volume, and price history',
    inputSchema: z.object({
      platform: z.enum(['kalshi', 'polymarket']).describe('The platform the market is on'),
      market_id: z
        .string()
        .describe('The market ID or ticker (e.g., "FED-25JAN-T0.625" for Kalshi)'),
    }),
    execute: async ({ platform, market_id }) => {
      const baseUrl = getBaseUrl();
      try {
        const response = await fetch(
          `${baseUrl}/api/prediction-markets/${platform}/${encodeURIComponent(market_id)}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          // Try to find in mock data
          const mockMarket = MOCK_MARKETS.find(
            (m) => m.id === market_id && m.platform === platform
          );
          if (mockMarket) {
            return {
              success: true,
              data: {
                ...mockMarket,
                priceHistory: generateMockPriceHistory(mockMarket.yesPrice),
              },
              mock: true,
            };
          }
          return {
            success: false,
            error: `Market not found: ${platform}/${market_id}`,
            platform,
            market_id,
          };
        }

        const data = await response.json();
        return { success: true, data, mock: data.mock || false };
      } catch (error) {
        // Try mock data
        const mockMarket = MOCK_MARKETS.find(
          (m) => m.id === market_id && m.platform === platform
        );
        if (mockMarket) {
          return {
            success: true,
            data: {
              ...mockMarket,
              priceHistory: generateMockPriceHistory(mockMarket.yesPrice),
            },
            mock: true,
          };
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch market',
          platform,
          market_id,
        };
      }
    },
  }),

  get_trending_prediction_markets: tool({
    description:
      'Get the most popular/trending prediction markets by trading volume. Good for seeing what events people are betting on.',
    inputSchema: z.object({
      limit: z.number().optional().default(10).describe('Number of markets to return'),
      category: z
        .string()
        .optional()
        .describe('Filter by category (economics, politics, crypto, stocks, sports)'),
    }),
    execute: async ({ limit, category }) => {
      const baseUrl = getBaseUrl();
      try {
        const params = new URLSearchParams({ limit: String(limit || 10) });
        if (category) params.append('category', category);

        const response = await fetch(`${baseUrl}/api/prediction-markets?${params}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          // Return mock data sorted by volume
          const mockResults = filterMockMarkets(undefined, undefined, category, limit);
          mockResults.sort((a, b) => b.volume - a.volume);
          return {
            success: true,
            data: {
              markets: mockResults,
              count: mockResults.length,
              category: category || 'all',
            },
            mock: true,
          };
        }

        const data = await response.json();
        return {
          success: true,
          data: {
            markets: data.markets,
            count: data.markets?.length || 0,
            category: category || 'all',
          },
          mock: data.mock || false,
        };
      } catch {
        // Return mock data
        const mockResults = filterMockMarkets(undefined, undefined, category, limit);
        mockResults.sort((a, b) => b.volume - a.volume);
        return {
          success: true,
          data: {
            markets: mockResults,
            count: mockResults.length,
            category: category || 'all',
          },
          mock: true,
        };
      }
    },
  }),

  find_markets_for_thesis: tool({
    description:
      'Find prediction markets that relate to a trading thesis. Useful for validating thesis hypotheses against market consensus.',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Stock symbol the thesis is about (e.g., NVDA, TSLA)'),
      hypothesis: z.string().describe('The thesis hypothesis to find related markets for'),
      thesis_id: z.string().optional().describe('ID of an existing thesis to link markets to'),
    }),
    execute: async ({ symbol, hypothesis, thesis_id }) => {
      // Build search queries based on the hypothesis
      const searchTerms: string[] = [];

      // Add symbol if provided
      if (symbol) searchTerms.push(symbol.toUpperCase());

      // Extract key terms from hypothesis
      const keywords = hypothesis.toLowerCase();
      if (keywords.includes('fed') || keywords.includes('rate') || keywords.includes('interest'))
        searchTerms.push('fed rate');
      if (keywords.includes('inflation') || keywords.includes('cpi'))
        searchTerms.push('inflation');
      if (keywords.includes('recession') || keywords.includes('gdp'))
        searchTerms.push('recession');
      if (keywords.includes('election') || keywords.includes('trump') || keywords.includes('biden'))
        searchTerms.push('election');
      if (keywords.includes('bitcoin') || keywords.includes('btc') || keywords.includes('crypto'))
        searchTerms.push('bitcoin');
      if (keywords.includes('ethereum') || keywords.includes('eth'))
        searchTerms.push('ethereum');
      if (keywords.includes('ai') || keywords.includes('artificial intelligence'))
        searchTerms.push('AI');
      if (keywords.includes('tariff') || keywords.includes('trade war'))
        searchTerms.push('tariffs');
      if (keywords.includes('earnings') || keywords.includes('revenue'))
        searchTerms.push('earnings');

      // If no specific terms, use first few words of hypothesis
      if (searchTerms.length === 0) {
        searchTerms.push(hypothesis.split(' ').slice(0, 3).join(' '));
      }

      const baseUrl = getBaseUrl();
      const allMarkets: PredictionMarket[] = [];

      // Search for each term (limit to 3 searches to avoid too many requests)
      for (const term of searchTerms.slice(0, 3)) {
        try {
          const response = await fetch(
            `${baseUrl}/api/prediction-markets/search?q=${encodeURIComponent(term)}&limit=5`,
            { cache: 'no-store' }
          );
          if (response.ok) {
            const data = await response.json();
            allMarkets.push(...(data.markets || []));
          } else {
            // Use mock data for this term
            const mockResults = filterMockMarkets(term, undefined, undefined, 5);
            allMarkets.push(...mockResults);
          }
        } catch {
          // Use mock data for this term
          const mockResults = filterMockMarkets(term, undefined, undefined, 5);
          allMarkets.push(...mockResults);
        }
      }

      // Deduplicate by id
      const uniqueMarkets = Array.from(new Map(allMarkets.map((m) => [m.id, m])).values());

      return {
        success: true,
        data: {
          markets: uniqueMarkets.slice(0, 10),
          hypothesis,
          symbol,
          thesis_id,
          searchTerms,
          marketCount: uniqueMarkets.length,
        },
        mock: allMarkets.length === 0 || allMarkets.every((m) => MOCK_MARKETS.some((mm) => mm.id === m.id)),
      };
    },
  }),

  show_prediction_markets: tool({
    description:
      'Show the prediction markets panel or navigate to the prediction markets page in the UI',
    inputSchema: z.object({
      market_id: z.string().optional().describe('Specific market to highlight/select'),
      platform: z.enum(['kalshi', 'polymarket']).optional().describe('Platform of the market'),
      filter: z
        .object({
          category: z.string().optional(),
          source: z.enum(['all', 'kalshi', 'polymarket']).optional(),
        })
        .optional()
        .describe('Filters to apply when showing the panel'),
    }),
    execute: async ({ market_id, platform, filter }) => ({
      success: true,
      action: 'show_panel',
      panel: 'prediction-markets',
      market_id,
      platform,
      filter,
      message: market_id
        ? `Showing prediction market: ${market_id}`
        : 'Showing prediction markets panel',
    }),
  }),

  compare_market_to_analysis: tool({
    description:
      'Compare a prediction market probability to AI analysis or stock fundamentals. Useful for finding mispricings.',
    inputSchema: z.object({
      market_id: z.string().describe('The prediction market ID'),
      platform: z.enum(['kalshi', 'polymarket']).describe('The platform'),
      comparison_type: z
        .enum(['stock_analysis', 'macro_outlook', 'sector_trend'])
        .describe('What to compare against'),
      symbol: z.string().optional().describe('Stock symbol for stock_analysis comparison'),
    }),
    execute: async ({ market_id, platform, comparison_type, symbol }) => {
      const baseUrl = getBaseUrl();

      // Get market data
      let marketData: PredictionMarket | null = null;
      try {
        const response = await fetch(
          `${baseUrl}/api/prediction-markets/${platform}/${encodeURIComponent(market_id)}`,
          { cache: 'no-store' }
        );
        if (response.ok) {
          marketData = await response.json();
        }
      } catch {
        // Try mock
        marketData =
          MOCK_MARKETS.find((m) => m.id === market_id && m.platform === platform) || null;
      }

      if (!marketData) {
        // Try mock as fallback
        marketData =
          MOCK_MARKETS.find((m) => m.id === market_id && m.platform === platform) || null;
      }

      if (!marketData) {
        return {
          success: false,
          error: `Market not found: ${platform}/${market_id}`,
        };
      }

      // Generate comparison analysis
      const marketProbability = marketData.yesPrice * 100;

      return {
        success: true,
        data: {
          market: {
            id: marketData.id,
            title: marketData.title,
            platform: marketData.platform,
            probability: marketProbability,
            volume: marketData.volume,
          },
          comparison_type,
          symbol,
          analysis: {
            market_says: `${marketProbability.toFixed(0)}% probability based on ${formatVolume(marketData.volume)} in trading volume`,
            insight:
              comparison_type === 'stock_analysis'
                ? `Compare this ${marketProbability.toFixed(0)}% market probability against your fundamental analysis of ${symbol || 'the stock'}.`
                : comparison_type === 'macro_outlook'
                  ? `The market is pricing ${marketProbability > 50 ? 'likely' : 'unlikely'} odds for this macro event.`
                  : `Sector trends should be considered alongside this ${marketProbability.toFixed(0)}% market expectation.`,
            note: 'Use this as one data point in your analysis. Markets can be wrong, especially in low-volume markets.',
          },
        },
        mock: true,
      };
    },
  }),
};

// Helper function to generate mock price history
function generateMockPriceHistory(currentPrice: number): Array<{ timestamp: string; yesPrice: number }> {
  const history: Array<{ timestamp: string; yesPrice: number }> = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let price = currentPrice * (0.8 + Math.random() * 0.4); // Start from a different price

  for (let i = 30; i >= 0; i--) {
    // Gradually move toward current price with some noise
    const targetDiff = currentPrice - price;
    const noise = (Math.random() - 0.5) * 0.05;
    price = Math.max(0.01, Math.min(0.99, price + targetDiff * 0.1 + noise));

    history.push({
      timestamp: new Date(now - i * dayMs).toISOString(),
      yesPrice: Math.round(price * 100) / 100,
    });
  }

  // Ensure last point matches current price
  history[history.length - 1].yesPrice = currentPrice;

  return history;
}

// Helper to format volume for display
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(0)}K`;
  }
  return `$${volume}`;
}
