import { Page, Route } from '@playwright/test';
import {
  mockMarketData as mockMarketDataSet,
  mockPortfolioData,
  mockChatResponses,
  mockApiResponses,
  generateMarketBars,
  generatePositions,
  generateOrderHistory
} from './test-data';

/**
 * API Mocking Helpers
 *
 * Provides reusable functions to mock API endpoints for E2E tests.
 * All functions return promises to support async route setup.
 */

/**
 * Mock market data endpoints
 */
export async function mockMarketData(
  page: Page,
  symbol: string = 'SPY',
  customData?: any
) {
  const data = customData || mockMarketDataSet[symbol as keyof typeof mockMarketDataSet] || {
    symbol,
    price: 100,
    change: 0,
    changePercent: 0
  };

  await page.route(`**/api/market/quote**${symbol}**`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data)
    });
  });

  await page.route(`**/api/market/${symbol}**`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data)
    });
  });
}

/**
 * Mock market bars (chart data)
 */
export async function mockMarketBars(
  page: Page,
  symbol: string = 'SPY',
  timeframe: string = '1D',
  customBars?: any[]
) {
  const bars = customBars || generateMarketBars(symbol, 100, timeframe);

  await page.route(`**/api/market/bars**`, route => {
    const url = new URL(route.request().url());
    const requestedSymbol = url.searchParams.get('symbol') || symbol;
    const requestedTimeframe = url.searchParams.get('timeframe') || timeframe;

    // If this is for a different symbol/timeframe, generate appropriate data
    const responseBars = requestedSymbol === symbol && requestedTimeframe === timeframe
      ? bars
      : generateMarketBars(requestedSymbol, 100, requestedTimeframe);

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bars: responseBars })
    });
  });
}

/**
 * Mock account/portfolio data
 */
export async function mockAccountData(page: Page, customData?: any) {
  const data = customData || mockPortfolioData.default;

  await page.route('**/api/account**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data)
    });
  });

  await page.route('**/api/portfolio**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data)
    });
  });
}

/**
 * Mock positions data
 */
export async function mockPositions(page: Page, symbols?: string[], customData?: any[]) {
  const positions = customData || generatePositions(symbols || ['AAPL', 'MSFT', 'TSLA']);

  await page.route('**/api/positions**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ positions })
    });
  });
}

/**
 * Mock order history
 */
export async function mockOrderHistory(page: Page, count: number = 10, customOrders?: any[]) {
  const orders = customOrders || generateOrderHistory(count);

  await page.route('**/api/orders**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orders })
    });
  });
}

/**
 * Mock chat/AI responses
 */
export async function mockChatResponse(
  page: Page,
  responseType: keyof typeof mockChatResponses = 'stockAnalysis',
  customResponse?: any
) {
  const response = customResponse || mockChatResponses[responseType];

  await page.route('**/api/chat**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });

  // Also mock streaming endpoint if it exists
  await page.route('**/api/chat/stream**', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `data: ${JSON.stringify(response)}\n\n`
    });
  });
}

/**
 * Mock watchlist data
 */
export async function mockWatchlist(page: Page, symbols: string[] = ['SPY', 'QQQ', 'AAPL', 'MSFT']) {
  const watchlist = symbols.map(symbol => {
    const data = mockMarketDataSet[symbol as keyof typeof mockMarketDataSet];
    return data || {
      symbol,
      name: `${symbol} Inc.`,
      price: 100 + Math.random() * 500,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5
    };
  });

  await page.route('**/api/watchlist**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ watchlist })
    });
  });
}

/**
 * Error Simulation Helpers
 */

/**
 * Simulate network error (connection refused, timeout, etc.)
 */
export async function simulateNetworkError(page: Page, urlPattern: string | RegExp = '**/*') {
  await page.route(urlPattern, route => route.abort('failed'));
}

/**
 * Simulate slow network with configurable delay
 */
export async function simulateSlowNetwork(
  page: Page,
  delayMs: number = 2000,
  urlPattern: string | RegExp = '**/api/**'
) {
  await page.route(urlPattern, async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

/**
 * Simulate request timeout
 */
export async function simulateTimeout(page: Page, urlPattern: string | RegExp = '**/api/**') {
  await page.route(urlPattern, route => route.abort('timedout'));
}

/**
 * Simulate server error (500)
 */
export async function simulateServerError(
  page: Page,
  urlPattern: string | RegExp = '**/api/**',
  errorMessage?: string
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.error500)
    });
  });
}

/**
 * Simulate 404 Not Found
 */
export async function simulate404Error(
  page: Page,
  urlPattern: string | RegExp
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.error404)
    });
  });
}

/**
 * Simulate 401 Unauthorized
 */
export async function simulate401Error(
  page: Page,
  urlPattern: string | RegExp = '**/api/**'
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.error401)
    });
  });
}

/**
 * Simulate 503 Service Unavailable
 */
export async function simulate503Error(
  page: Page,
  urlPattern: string | RegExp = '**/api/**'
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.error503)
    });
  });
}

/**
 * Simulate malformed JSON response
 */
export async function simulateMalformedResponse(
  page: Page,
  urlPattern: string | RegExp = '**/api/**'
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'invalid json {{{',
    });
  });
}

/**
 * Simulate empty response
 */
export async function simulateEmptyResponse(
  page: Page,
  urlPattern: string | RegExp = '**/api/**'
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });
}

/**
 * Simulate rate limiting (429)
 */
export async function simulateRateLimitError(
  page: Page,
  urlPattern: string | RegExp = '**/api/**',
  retryAfter: number = 60
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: {
        'Retry-After': retryAfter.toString()
      },
      body: JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`
      })
    });
  });
}

/**
 * Advanced Mock Scenarios
 */

/**
 * Mock retryable failure (fails N times, then succeeds)
 */
export async function mockRetryableFailure(
  page: Page,
  urlPattern: string | RegExp,
  failureCount: number = 1,
  errorStatus: number = 503
) {
  let attemptCount = 0;

  await page.route(urlPattern, route => {
    attemptCount++;

    if (attemptCount <= failureCount) {
      route.fulfill({
        status: errorStatus,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service temporarily unavailable' })
      });
    } else {
      route.continue();
    }
  });

  return {
    getAttemptCount: () => attemptCount,
    reset: () => { attemptCount = 0; }
  };
}

/**
 * Mock intermittent failures (random success/failure)
 */
export async function mockIntermittentFailure(
  page: Page,
  urlPattern: string | RegExp,
  failureRate: number = 0.3 // 30% failure rate
) {
  await page.route(urlPattern, route => {
    if (Math.random() < failureRate) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Intermittent error' })
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock progressive loading (simulate pagination or incremental data)
 */
export async function mockProgressiveLoading(
  page: Page,
  urlPattern: string | RegExp,
  dataChunks: any[],
  delayMs: number = 500
) {
  let chunkIndex = 0;

  await page.route(urlPattern, async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs));

    const chunk = dataChunks[chunkIndex];
    chunkIndex = (chunkIndex + 1) % dataChunks.length;

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(chunk)
    });
  });
}

/**
 * Mock conditional responses based on request
 */
export async function mockConditionalResponse(
  page: Page,
  urlPattern: string | RegExp,
  conditionFn: (route: Route) => boolean,
  successResponse: any,
  failureResponse: any = mockApiResponses.error500
) {
  await page.route(urlPattern, route => {
    const shouldSucceed = conditionFn(route);

    route.fulfill({
      status: shouldSucceed ? 200 : 500,
      contentType: 'application/json',
      body: JSON.stringify(shouldSucceed ? successResponse : failureResponse)
    });
  });
}

/**
 * Mock all common endpoints with default data
 */
export async function mockAllEndpoints(page: Page) {
  await mockAccountData(page);
  await mockPositions(page);
  await mockMarketData(page, 'SPY');
  await mockMarketData(page, 'QQQ');
  await mockMarketData(page, 'AAPL');
  await mockMarketBars(page, 'SPY');
  await mockOrderHistory(page);
  await mockWatchlist(page);
  await mockChatResponse(page);
}

/**
 * Clear all route mocks
 */
export async function clearAllMocks(page: Page) {
  await page.unrouteAll();
}

/**
 * Mock offline mode (block all network)
 */
export async function mockOfflineMode(page: Page) {
  await page.context().setOffline(true);
}

/**
 * Restore online mode
 */
export async function restoreOnlineMode(page: Page) {
  await page.context().setOffline(false);
}

/**
 * Mock with request counting (useful for testing retry logic)
 */
export async function mockWithRequestCounter(
  page: Page,
  urlPattern: string | RegExp
) {
  let requestCount = 0;
  const requestDetails: any[] = [];

  await page.route(urlPattern, route => {
    requestCount++;
    requestDetails.push({
      url: route.request().url(),
      method: route.request().method(),
      timestamp: Date.now()
    });

    route.continue();
  });

  return {
    getCount: () => requestCount,
    getDetails: () => requestDetails,
    reset: () => {
      requestCount = 0;
      requestDetails.length = 0;
    }
  };
}
