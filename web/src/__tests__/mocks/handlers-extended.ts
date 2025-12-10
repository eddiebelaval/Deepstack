/**
 * Extended MSW Request Handlers
 *
 * Additional handlers for all API routes not covered by the base handlers.
 * Includes calendar, economic data, trades, positions, and AI endpoints.
 */
import { http, HttpResponse } from 'msw';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Mock calendar/earnings data
const mockCalendarResponse = {
  events: [
    {
      symbol: 'AAPL',
      date: '2024-01-25',
      type: 'earnings',
      estimate: '2.10',
      actual: null,
      time: 'after_close',
    },
    {
      symbol: 'MSFT',
      date: '2024-01-30',
      type: 'earnings',
      estimate: '2.75',
      actual: null,
      time: 'after_close',
    },
    {
      symbol: 'GOOGL',
      date: '2024-02-01',
      type: 'earnings',
      estimate: '1.45',
      actual: null,
      time: 'after_close',
    },
  ],
};

// Mock economic calendar data
const mockEconomicData = {
  events: [
    {
      id: 'econ-1',
      date: '2024-01-31',
      time: '14:00',
      event: 'FOMC Rate Decision',
      importance: 'high',
      actual: null,
      forecast: '5.50%',
      previous: '5.50%',
    },
    {
      id: 'econ-2',
      date: '2024-02-02',
      time: '08:30',
      event: 'Non-Farm Payrolls',
      importance: 'high',
      actual: null,
      forecast: '185K',
      previous: '216K',
    },
    {
      id: 'econ-3',
      date: '2024-02-05',
      time: '10:00',
      event: 'ISM Services PMI',
      importance: 'medium',
      actual: null,
      forecast: '52.0',
      previous: '50.6',
    },
  ],
};

// Mock prediction markets data
const mockPredictionMarkets = {
  markets: [
    {
      id: 'KXBTC-100K',
      platform: 'kalshi',
      title: 'Bitcoin above $100,000 by end of 2024?',
      category: 'Crypto',
      yes_price: 0.35,
      no_price: 0.65,
      volume: 2500000,
      volume_24h: 125000,
      open_interest: 450000,
      end_date: '2024-12-31',
      status: 'active',
      url: 'https://kalshi.com/markets/KXBTC-100K',
    },
    {
      id: 'PYELEC24',
      platform: 'polymarket',
      title: 'Will the Democrats win the 2024 Presidential Election?',
      category: 'Politics',
      yes_price: 0.48,
      no_price: 0.52,
      volume: 15000000,
      volume_24h: 750000,
      open_interest: 8500000,
      end_date: '2024-11-05',
      status: 'active',
      url: 'https://polymarket.com/markets/election-2024',
    },
  ],
  count: 2,
};

// Mock trades data
const mockTrades = [
  {
    id: 'trade-1',
    user_id: 'test-user-123',
    symbol: 'SPY',
    side: 'buy',
    quantity: 100,
    price: 595.50,
    executed_at: '2024-01-15T14:30:00Z',
    status: 'filled',
    order_type: 'market',
  },
  {
    id: 'trade-2',
    user_id: 'test-user-123',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 50,
    price: 237.25,
    executed_at: '2024-01-16T10:15:00Z',
    status: 'filled',
    order_type: 'limit',
  },
];

// Mock positions data
const mockPositions = [
  {
    symbol: 'SPY',
    qty: 100,
    avg_entry_price: 595.50,
    current_price: 596.51,
    market_value: 59651.00,
    unrealized_pl: 101.00,
    unrealized_pl_percent: 0.17,
    side: 'long',
  },
  {
    symbol: 'AAPL',
    qty: 50,
    avg_entry_price: 237.25,
    current_price: 237.84,
    market_value: 11892.00,
    unrealized_pl: 29.50,
    unrealized_pl_percent: 0.25,
    side: 'long',
  },
];

// Mock portfolio summary
const mockPortfolio = {
  equity: 125000.00,
  cash: 53457.00,
  buying_power: 106914.00,
  portfolio_value: 178457.00,
  day_pl: 130.50,
  day_pl_percent: 0.07,
  total_pl: 3457.00,
  total_pl_percent: 1.97,
};

// Mock search results
const mockSearchResults = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'ARCA', type: 'ETF' },
  { symbol: 'SPYG', name: 'SPDR Portfolio S&P 500 Growth ETF', exchange: 'ARCA', type: 'ETF' },
  { symbol: 'SPYV', name: 'SPDR Portfolio S&P 500 Value ETF', exchange: 'ARCA', type: 'ETF' },
];

export const extendedHandlers = [
  // Calendar/Earnings endpoint
  http.get(`${BACKEND_URL}/api/calendar`, ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const type = url.searchParams.get('type');

    let events = mockCalendarResponse.events;

    if (symbol) {
      events = events.filter((e) => e.symbol === symbol.toUpperCase());
    }

    if (type) {
      events = events.filter((e) => e.type === type);
    }

    return HttpResponse.json({ events });
  }),

  // Economic data endpoint
  http.get(`${BACKEND_URL}/api/economic`, () => {
    return HttpResponse.json(mockEconomicData);
  }),

  // Prediction markets trending
  http.get(`${BACKEND_URL}/api/predictions/trending`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const category = url.searchParams.get('category');
    const source = url.searchParams.get('source');

    let markets = mockPredictionMarkets.markets;

    if (category) {
      markets = markets.filter((m) => m.category === category);
    }

    if (source && source !== 'all') {
      markets = markets.filter((m) => m.platform === source);
    }

    return HttpResponse.json({
      markets: markets.slice(0, limit),
      count: markets.length,
    });
  }),

  // Trades endpoint (requires auth - handled by route)
  http.get(`${BACKEND_URL}/api/trades`, () => {
    return HttpResponse.json({ trades: mockTrades });
  }),

  http.post(`${BACKEND_URL}/api/trades`, async ({ request }) => {
    const body = await request.json() as any;
    const newTrade = {
      id: `trade-${Date.now()}`,
      ...body,
      executed_at: new Date().toISOString(),
      status: 'filled',
    };
    return HttpResponse.json({ trade: newTrade }, { status: 201 });
  }),

  // Positions endpoint
  http.get(`${BACKEND_URL}/api/positions`, () => {
    return HttpResponse.json({ positions: mockPositions });
  }),

  // Portfolio endpoint
  http.get(`${BACKEND_URL}/api/portfolio`, () => {
    return HttpResponse.json(mockPortfolio);
  }),

  // Search/assets endpoint
  http.get(`${BACKEND_URL}/api/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    if (!query) {
      return HttpResponse.json({ results: [] });
    }

    const results = mockSearchResults.filter(
      (r) =>
        r.symbol.toLowerCase().includes(query.toLowerCase()) ||
        r.name.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json({ results });
  }),

  // Order submission endpoint
  http.post(`${BACKEND_URL}/api/orders`, async ({ request }) => {
    const body = await request.json() as any;

    // Validate required fields
    if (!body.symbol || !body.qty || !body.side) {
      return HttpResponse.json(
        { error: 'Missing required fields: symbol, qty, side' },
        { status: 400 }
      );
    }

    const order = {
      id: `order-${Date.now()}`,
      symbol: body.symbol,
      qty: body.qty,
      side: body.side,
      type: body.type || 'market',
      limit_price: body.limit_price,
      status: 'accepted',
      submitted_at: new Date().toISOString(),
      filled_at: null,
      filled_qty: 0,
      filled_avg_price: null,
    };

    return HttpResponse.json({ order }, { status: 201 });
  }),

  // Watchlist endpoint
  http.get(`${BACKEND_URL}/api/watchlists`, () => {
    return HttpResponse.json({
      watchlists: [
        {
          id: 'default',
          name: 'Default',
          symbols: ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA'],
        },
      ],
    });
  }),

  // Alerts endpoint
  http.get(`${BACKEND_URL}/api/alerts`, () => {
    return HttpResponse.json({
      alerts: [
        {
          id: 'alert-1',
          symbol: 'SPY',
          condition: 'price_above',
          value: 600,
          triggered: false,
          created_at: '2024-01-15T00:00:00Z',
        },
      ],
    });
  }),
];

// Export mock data for test assertions
export const extendedMocks = {
  calendar: mockCalendarResponse,
  economic: mockEconomicData,
  predictionMarkets: mockPredictionMarkets,
  trades: mockTrades,
  positions: mockPositions,
  portfolio: mockPortfolio,
  search: mockSearchResults,
};
