/**
 * Test Data Generators and Mock Data
 *
 * Provides reusable test data for E2E tests including:
 * - Mock user data
 * - Mock market data
 * - Mock portfolio data
 * - Test email generator
 */

/**
 * User Data
 */
export const mockUsers = {
  validUser: {
    email: 'test@deepstack.com',
    password: 'TestPassword123!',
    name: 'Test User'
  },

  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
    name: 'Invalid User'
  },

  newUser: {
    email: 'newuser@deepstack.com',
    password: 'NewUser123!',
    name: 'New User'
  }
};

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}.${timestamp}.${random}@deepstack-test.com`;
}

/**
 * Generate test user data
 */
export function generateTestUser(overrides: Partial<typeof mockUsers.validUser> = {}) {
  return {
    email: generateTestEmail(),
    password: 'TestPassword123!',
    name: 'Test User',
    ...overrides
  };
}

/**
 * Market Data
 */
export const mockMarketData = {
  SPY: {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    price: 458.32,
    change: 2.45,
    changePercent: 0.54,
    volume: 75234567,
    marketCap: 415000000000,
    previousClose: 455.87,
    open: 456.12,
    high: 459.45,
    low: 455.23,
    bid: 458.30,
    ask: 458.34
  },

  QQQ: {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    price: 392.15,
    change: -1.23,
    changePercent: -0.31,
    volume: 45123456,
    marketCap: 187000000000,
    previousClose: 393.38,
    open: 393.00,
    high: 393.89,
    low: 391.45,
    bid: 392.13,
    ask: 392.17
  },

  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.43,
    change: 3.21,
    changePercent: 1.72,
    volume: 52341234,
    marketCap: 2950000000000,
    previousClose: 186.22,
    open: 187.50,
    high: 190.12,
    low: 187.00,
    bid: 189.41,
    ask: 189.45
  },

  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 374.58,
    change: 5.67,
    changePercent: 1.54,
    volume: 23456789,
    marketCap: 2780000000000,
    previousClose: 368.91,
    open: 370.00,
    high: 375.23,
    low: 369.45,
    bid: 374.56,
    ask: 374.60
  },

  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 248.73,
    change: -4.32,
    changePercent: -1.71,
    volume: 98765432,
    marketCap: 789000000000,
    previousClose: 253.05,
    open: 252.50,
    high: 253.45,
    low: 247.89,
    bid: 248.70,
    ask: 248.76
  }
};

/**
 * Generate market bars data for charting
 */
export function generateMarketBars(symbol: string, count: number = 100, timeframe: string = '1D') {
  const bars = [];
  const basePrice = mockMarketData[symbol as keyof typeof mockMarketData]?.price || 100;
  const now = Date.now();

  const timeframeMs: Record<string, number> = {
    '1Min': 60 * 1000,
    '5Min': 5 * 60 * 1000,
    '15Min': 15 * 60 * 1000,
    '1H': 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000
  };

  const interval = timeframeMs[timeframe] || timeframeMs['1D'];

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now - (i * interval)).toISOString();
    const volatility = basePrice * 0.02; // 2% volatility
    const open = basePrice + (Math.random() - 0.5) * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 10000000) + 1000000;

    bars.push({
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
  }

  return bars;
}

/**
 * Generate watchlist data
 */
export function generateWatchlist(symbols: string[] = ['SPY', 'QQQ', 'AAPL', 'MSFT']) {
  return symbols.map(symbol => {
    const data = mockMarketData[symbol as keyof typeof mockMarketData];
    if (data) return data;

    return {
      symbol,
      name: `${symbol} Inc.`,
      price: 100 + Math.random() * 500,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 100000000)
    };
  });
}

/**
 * Portfolio Data
 */
export const mockPortfolioData = {
  default: {
    portfolio_value: 125450.32,
    cash: 45230.15,
    buying_power: 90460.30,
    day_pnl: 1234.56,
    day_pnl_percent: 0.99,
    total_pnl: 25450.32,
    total_pnl_percent: 25.45
  },

  largePortfolio: {
    portfolio_value: 1250000.00,
    cash: 250000.00,
    buying_power: 500000.00,
    day_pnl: 15000.00,
    day_pnl_percent: 1.22,
    total_pnl: 250000.00,
    total_pnl_percent: 25.00
  },

  smallPortfolio: {
    portfolio_value: 5000.00,
    cash: 2500.00,
    buying_power: 5000.00,
    day_pnl: -50.00,
    day_pnl_percent: -0.99,
    total_pnl: 0.00,
    total_pnl_percent: 0.00
  },

  negativePortfolio: {
    portfolio_value: 8500.00,
    cash: 500.00,
    buying_power: 1000.00,
    day_pnl: -500.00,
    day_pnl_percent: -5.56,
    total_pnl: -1500.00,
    total_pnl_percent: -15.00
  }
};

/**
 * Generate portfolio positions
 */
export function generatePositions(symbols: string[] = ['AAPL', 'MSFT', 'TSLA']) {
  return symbols.map(symbol => {
    const marketData = mockMarketData[symbol as keyof typeof mockMarketData];
    const qty = Math.floor(Math.random() * 100) + 10;
    const avgPrice = marketData ? marketData.price * (0.9 + Math.random() * 0.2) : 100;
    const currentPrice = marketData?.price || 100;
    const marketValue = currentPrice * qty;
    const costBasis = avgPrice * qty;
    const unrealizedPL = marketValue - costBasis;
    const unrealizedPLPercent = (unrealizedPL / costBasis) * 100;

    return {
      symbol,
      qty,
      avg_entry_price: Number(avgPrice.toFixed(2)),
      current_price: Number(currentPrice.toFixed(2)),
      market_value: Number(marketValue.toFixed(2)),
      cost_basis: Number(costBasis.toFixed(2)),
      unrealized_pl: Number(unrealizedPL.toFixed(2)),
      unrealized_plpc: Number(unrealizedPLPercent.toFixed(2)),
      side: 'long'
    };
  });
}

/**
 * Trading Data
 */
export const mockTradeOrders = {
  buyOrder: {
    symbol: 'AAPL',
    qty: 10,
    side: 'buy',
    type: 'market',
    time_in_force: 'day'
  },

  sellOrder: {
    symbol: 'AAPL',
    qty: 10,
    side: 'sell',
    type: 'market',
    time_in_force: 'day'
  },

  limitBuyOrder: {
    symbol: 'MSFT',
    qty: 5,
    side: 'buy',
    type: 'limit',
    limit_price: 370.00,
    time_in_force: 'gtc'
  },

  stopLossOrder: {
    symbol: 'TSLA',
    qty: 20,
    side: 'sell',
    type: 'stop',
    stop_price: 245.00,
    time_in_force: 'gtc'
  }
};

/**
 * Generate order history
 */
export function generateOrderHistory(count: number = 10) {
  const statuses = ['filled', 'partially_filled', 'pending', 'cancelled', 'rejected'];
  const sides = ['buy', 'sell'];
  const symbols = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'SPY', 'QQQ'];

  const orders = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const qty = Math.floor(Math.random() * 100) + 1;
    const price = 100 + Math.random() * 400;
    const timestamp = new Date(now - (i * 3600000)).toISOString();

    orders.push({
      id: `order_${i + 1}`,
      symbol,
      side,
      qty,
      filled_qty: status === 'filled' ? qty : status === 'partially_filled' ? Math.floor(qty / 2) : 0,
      type: 'market',
      status,
      submitted_at: timestamp,
      filled_at: status === 'filled' ? timestamp : null,
      filled_avg_price: status === 'filled' ? Number(price.toFixed(2)) : null
    });
  }

  return orders;
}

/**
 * Chat/AI Response Data
 */
export const mockChatResponses = {
  stockAnalysis: {
    message: "AAPL is currently trading at $189.43, up 1.72% today. The stock has strong fundamentals with a market cap of $2.95T. Recent earnings beat expectations, and the company continues to show strong growth in services revenue.",
    suggestions: ['Tell me more about AAPL earnings', 'Compare AAPL to MSFT', 'What is the outlook for tech stocks?']
  },

  marketOverview: {
    message: "The market is showing positive momentum today. The S&P 500 is up 0.54%, led by technology and healthcare sectors. Overall market sentiment is bullish with moderate volume.",
    suggestions: ['Show me top gainers', 'What sectors are performing well?', 'Any economic news today?']
  },

  tradingAdvice: {
    message: "Based on current market conditions, consider diversifying your portfolio across sectors. The technology sector shows strength, but be mindful of valuation levels. Always use stop losses to manage risk.",
    suggestions: ['How should I diversify?', 'Tell me about risk management', 'What are good entry points?']
  },

  error: {
    error: "I'm having trouble processing that request. Could you rephrase your question?",
    message: null
  }
};

/**
 * API Response Templates
 */
export const mockApiResponses = {
  accountSuccess: mockPortfolioData.default,

  positionsSuccess: generatePositions(['AAPL', 'MSFT', 'TSLA', 'GOOGL']),

  marketDataSuccess: (symbol: string) => mockMarketData[symbol as keyof typeof mockMarketData] || {
    symbol,
    price: 100,
    change: 0,
    changePercent: 0
  },

  barsSuccess: (symbol: string, timeframe: string = '1D', limit: number = 100) =>
    generateMarketBars(symbol, limit, timeframe),

  ordersSuccess: generateOrderHistory(20),

  error500: {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  },

  error404: {
    error: 'Not Found',
    message: 'The requested resource was not found'
  },

  error401: {
    error: 'Unauthorized',
    message: 'Authentication required'
  },

  error503: {
    error: 'Service Unavailable',
    message: 'The service is temporarily unavailable'
  }
};

/**
 * Timeframe options
 */
export const timeframes = ['1Min', '5Min', '15Min', '1H', '1D', '1W', '1M', '3M', '1Y', 'All'];

/**
 * Market regions
 */
export const marketRegions = [
  { code: 'US', name: 'United States' },
  { code: 'EU', name: 'Europe' },
  { code: 'ASIA', name: 'Asia Pacific' }
];

/**
 * Common test tickers
 */
export const commonTickers = {
  etfs: ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'],
  stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'],
  crypto: ['BTC-USD', 'ETH-USD'],
  invalid: ['INVALID', 'NOTREAL', 'XXXXX']
};
