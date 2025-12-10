/**
 * MSW Request Handlers
 *
 * These handlers intercept network requests during tests and return mock responses.
 * Add handlers for each external service your API routes call.
 */
import { http, HttpResponse } from 'msw';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Mock bar data for market endpoints
const mockBarsResponse = {
  bars: [
    { t: '2024-01-15T00:00:00Z', o: 595.0, h: 598.5, l: 593.2, c: 597.8, v: 5000000 },
    { t: '2024-01-16T00:00:00Z', o: 597.8, h: 602.1, l: 596.5, c: 601.2, v: 4800000 },
    { t: '2024-01-17T00:00:00Z', o: 601.2, h: 605.0, l: 599.8, c: 603.5, v: 5200000 },
  ],
  mock: false,
};

// Mock quote data (individual symbol response from /quote/{symbol})
const mockQuoteData: Record<string, object> = {
  SPY: {
    price: 596.51,
    open: 595.0,
    high: 598.5,
    low: 593.2,
    close: 596.51,
    volume: 45000000,
    change: 1.51,
    change_percent: 0.25,
    bid: 596.50,
    ask: 596.52,
    timestamp: '2024-01-17T16:00:00Z',
  },
  AAPL: {
    price: 237.84,
    open: 236.0,
    high: 238.5,
    low: 235.2,
    close: 237.84,
    volume: 32000000,
    change: 1.84,
    change_percent: 0.78,
    bid: 237.82,
    ask: 237.86,
    timestamp: '2024-01-17T16:00:00Z',
  },
  TSLA: {
    price: 352.67,
    open: 350.0,
    high: 355.5,
    low: 348.2,
    close: 352.67,
    volume: 28000000,
    change: 2.67,
    change_percent: 0.76,
    bid: 352.65,
    ask: 352.69,
    timestamp: '2024-01-17T16:00:00Z',
  },
};

// Mock news data
const mockNewsResponse = {
  news: [
    {
      id: 'news-1',
      headline: 'Fed Signals Rate Cuts Ahead',
      summary: 'Federal Reserve hints at potential rate reductions in coming months.',
      url: 'https://example.com/fed-news',
      source: 'Bloomberg',
      created_at: '2024-01-17T10:00:00Z',
      symbols: ['SPY', 'QQQ'],
      sentiment: 'positive',
    },
    {
      id: 'news-2',
      headline: 'Tech Stocks Rally on AI Optimism',
      summary: 'Technology sector leads gains as AI investments accelerate.',
      url: 'https://example.com/tech-rally',
      source: 'Reuters',
      created_at: '2024-01-17T09:00:00Z',
      symbols: ['NVDA', 'MSFT', 'GOOGL'],
      sentiment: 'positive',
    },
  ],
};

// Legacy mock quote response (for backwards compatibility)
const mockQuoteResponse = {
  symbol: 'SPY',
  bid: 596.50,
  ask: 596.52,
  bidSize: 100,
  askSize: 150,
  last: 596.51,
  volume: 45000000,
};

export const handlers = [
  // Python Backend: Market Bars
  http.get(`${BACKEND_URL}/api/market/bars`, ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
      return HttpResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json(mockBarsResponse);
  }),

  // Python Backend: Individual Quote (used by quotes route)
  http.get(`${BACKEND_URL}/quote/:symbol`, ({ params }) => {
    const symbol = (params.symbol as string).toUpperCase();
    const quoteData = mockQuoteData[symbol];

    if (!quoteData) {
      // Return generic quote for unknown symbols
      return HttpResponse.json({
        price: 100 + Math.random() * 100,
        open: 100,
        high: 105,
        low: 98,
        close: 102,
        volume: 1000000,
        change: 2,
        change_percent: 2.0,
        bid: 101.98,
        ask: 102.02,
        timestamp: new Date().toISOString(),
      });
    }

    return HttpResponse.json(quoteData);
  }),

  // Python Backend: Assets search
  http.get(`${BACKEND_URL}/api/market/assets`, () => {
    return HttpResponse.json({
      assets: [
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'ARCA' },
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
        { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
      ],
    });
  }),

  // Python Backend: News
  http.get(`${BACKEND_URL}/api/news`, ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    let news = mockNewsResponse.news;

    // Filter by symbol if provided
    if (symbol) {
      news = news.filter((article) =>
        article.symbols.includes(symbol.toUpperCase())
      );
    }

    return HttpResponse.json({ news });
  }),

  // Python Backend: Calendar (earnings)
  http.get(`${BACKEND_URL}/api/calendar`, () => {
    return HttpResponse.json({
      events: [
        {
          symbol: 'AAPL',
          date: '2024-01-25',
          type: 'earnings',
          estimate: '2.10',
        },
      ],
    });
  }),
];

// Export mock data for assertions in tests
export const mocks = {
  bars: mockBarsResponse,
  quote: mockQuoteResponse,
  quoteData: mockQuoteData,
  news: mockNewsResponse,
};
