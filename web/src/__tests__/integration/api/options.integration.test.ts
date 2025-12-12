/**
 * Integration Tests: Options API Routes
 *
 * Tests all options-related API endpoints with mocked Python backend responses.
 * Verifies: validation, successful responses, error handling, fallback behavior.
 *
 * Routes tested:
 * - GET  /api/options/chain        - Options chain lookup
 * - POST /api/options/screen       - Options screener
 * - GET  /api/options/expirations  - Available expiration dates
 * - POST /api/options/strategy     - Options strategy P&L calculation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GET as getChain } from '@/app/api/options/chain/route';
import { POST as postScreen } from '@/app/api/options/screen/route';
import { GET as getExpirations } from '@/app/api/options/expirations/route';
import { POST as postStrategy } from '@/app/api/options/strategy/route';
import { createRequest, parseResponse } from '../test-utils';
import { server } from '../setup';
import type {
  OptionChain,
  ScreenerResponse,
  ExpirationResponse,
  StrategyCalculation,
  OptionContract,
  ScreenerFilters
} from '@/lib/types/options';

// Import setup to initialize MSW server
import '../setup';

const BACKEND_URL = 'http://127.0.0.1:8000';

// ============== Mock Data ==============

const mockOptionChain: OptionChain = {
  underlying_symbol: 'SPY',
  underlying_price: 450.0,
  contracts: [
    {
      symbol: 'SPY240119C00450000',
      underlying_symbol: 'SPY',
      option_type: 'call',
      strike_price: 450,
      expiration_date: '2024-01-19',
      days_to_expiration: 7,
      bid: 5.5,
      ask: 5.6,
      last_price: 5.55,
      volume: 10000,
      open_interest: 50000,
      delta: 0.5,
      gamma: 0.02,
      theta: -0.05,
      vega: 0.15,
      implied_volatility: 0.25,
      bid_ask_spread: 0.1,
      bid_ask_spread_pct: 1.82,
      moneyness: 'atm',
      underlying_price: 450.0,
    },
    {
      symbol: 'SPY240119P00445000',
      underlying_symbol: 'SPY',
      option_type: 'put',
      strike_price: 445,
      expiration_date: '2024-01-19',
      days_to_expiration: 7,
      bid: 3.2,
      ask: 3.3,
      last_price: 3.25,
      volume: 8000,
      open_interest: 40000,
      delta: -0.35,
      gamma: 0.018,
      theta: -0.04,
      vega: 0.12,
      implied_volatility: 0.23,
      bid_ask_spread: 0.1,
      bid_ask_spread_pct: 3.13,
      moneyness: 'otm',
      underlying_price: 450.0,
    },
  ],
  expirations: ['2024-01-19', '2024-01-26', '2024-02-16'],
  timestamp: '2024-01-12T10:00:00Z',
};

const mockScreenerResponse: ScreenerResponse = {
  contracts: [
    {
      symbol: 'SPY240119C00455000',
      underlying_symbol: 'SPY',
      option_type: 'call',
      strike_price: 455,
      expiration_date: '2024-01-19',
      days_to_expiration: 7,
      bid: 2.5,
      ask: 2.6,
      last_price: 2.55,
      volume: 15000,
      open_interest: 60000,
      delta: 0.35,
      gamma: 0.025,
      theta: -0.06,
      vega: 0.18,
      implied_volatility: 0.28,
      bid_ask_spread: 0.1,
      bid_ask_spread_pct: 4.0,
      moneyness: 'otm',
      underlying_price: 450.0,
    },
  ],
  total_count: 1,
  filters_applied: {
    underlying_symbols: ['SPY'],
    min_dte: 7,
    max_dte: 30,
    min_volume: 100,
    min_open_interest: 500,
    sort_by: 'volume',
    sort_order: 'desc',
    limit: 100,
  },
};

const mockExpirations: ExpirationResponse = {
  symbol: 'SPY',
  expirations: [
    '2024-01-19',
    '2024-01-26',
    '2024-02-02',
    '2024-02-09',
    '2024-02-16',
    '2024-03-15',
  ],
};

const mockStrategyCalculation: StrategyCalculation = {
  pnl_at_expiration: [
    { price: 440, pnl: -200 },
    { price: 445, pnl: -100 },
    { price: 450, pnl: 0 },
    { price: 455, pnl: 100 },
    { price: 460, pnl: 200 },
  ],
  pnl_current: [
    { price: 440, pnl: -150 },
    { price: 445, pnl: -75 },
    { price: 450, pnl: 0 },
    { price: 455, pnl: 75 },
    { price: 460, pnl: 150 },
  ],
  greeks: {
    delta: 0.5,
    gamma: 0.02,
    theta: -0.05,
    vega: 0.15,
  },
  greeks_over_price: [
    { price: 440, delta: 0.3, gamma: 0.015, theta: -0.04, vega: 0.12 },
    { price: 450, delta: 0.5, gamma: 0.02, theta: -0.05, vega: 0.15 },
    { price: 460, delta: 0.7, gamma: 0.018, theta: -0.045, vega: 0.13 },
  ],
  max_profit: 500,
  max_loss: 500,
  breakeven_points: [450],
  risk_reward_ratio: 1.0,
  net_debit_credit: -555,
  strategy_name: 'Long Call',
  probability_of_profit: 0.45,
};

// ============== GET /api/options/chain ==============

describe('/api/options/chain', () => {
  describe('Validation', () => {
    it('returns 400 when symbol is missing', async () => {
      const request = createRequest('http://localhost:3000/api/options/chain');
      const response = await getChain(request);
      const data = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Symbol is required');
    });
  });

  describe('Successful Responses', () => {
    beforeEach(() => {
      // Mock backend response
      server.use(
        http.get(`${BACKEND_URL}/api/options/chain/:symbol`, () => {
          return HttpResponse.json(mockOptionChain);
        })
      );
    });

    it('returns options chain for valid symbol', async () => {
      const request = createRequest(
        'http://localhost:3000/api/options/chain?symbol=SPY'
      );
      const response = await getChain(request);
      const data = await parseResponse<OptionChain>(response);

      expect(response.status).toBe(200);
      expect(data.underlying_symbol).toBe('SPY');
      expect(data.underlying_price).toBe(450.0);
      expect(data.contracts).toHaveLength(2);
      expect(data.expirations).toHaveLength(3);
    });

    it('normalizes symbol to uppercase', async () => {
      const request = createRequest(
        'http://localhost:3000/api/options/chain?symbol=spy'
      );
      const response = await getChain(request);
      const data = await parseResponse<OptionChain>(response);

      expect(response.status).toBe(200);
      expect(data.underlying_symbol).toBe('SPY');
    });

    it('accepts optional query parameters', async () => {
      const request = createRequest(
        'http://localhost:3000/api/options/chain?symbol=SPY&expiration=2024-01-19&option_type=call&strike_min=445&strike_max=455&limit=50'
      );
      const response = await getChain(request);
      const data = await parseResponse<OptionChain>(response);

      expect(response.status).toBe(200);
      expect(data.underlying_symbol).toBe('SPY');
    });

    it('returns contracts with correct structure', async () => {
      const request = createRequest(
        'http://localhost:3000/api/options/chain?symbol=SPY'
      );
      const response = await getChain(request);
      const data = await parseResponse<OptionChain>(response);

      const contract = data.contracts[0];
      expect(contract).toHaveProperty('symbol');
      expect(contract).toHaveProperty('underlying_symbol');
      expect(contract).toHaveProperty('option_type');
      expect(contract).toHaveProperty('strike_price');
      expect(contract).toHaveProperty('expiration_date');
      expect(contract).toHaveProperty('delta');
      expect(contract).toHaveProperty('gamma');
      expect(contract).toHaveProperty('theta');
      expect(contract).toHaveProperty('vega');
      expect(contract).toHaveProperty('implied_volatility');
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns mock data when backend is unavailable', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/options/chain/:symbol`, () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/options/chain?symbol=SPY'
      );
      const response = await getChain(request);
      const data = await parseResponse<OptionChain & { mock?: boolean; warning?: string }>(response);

      expect(response.status).toBe(200);
      expect(data.underlying_symbol).toBe('SPY');
      expect(data.contracts).toBeDefined();
      expect(data.contracts.length).toBeGreaterThan(0);
      expect(data.mock).toBe(true);
      expect(data.warning).toContain('simulated data');
    });

    it('returns mock data when backend returns error status', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/options/chain/:symbol`, () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/options/chain?symbol=AAPL'
      );
      const response = await getChain(request);
      const data = await parseResponse<OptionChain & { mock?: boolean }>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
    });
  });
});

// ============== POST /api/options/screen ==============

describe('/api/options/screen', () => {
  describe('Successful Responses', () => {
    it('returns screener results for valid filters', async () => {
      const filters: ScreenerFilters = {
        underlying_symbols: ['SPY'],
        min_dte: 7,
        max_dte: 30,
        min_volume: 100,
        min_open_interest: 500,
        sort_by: 'volume',
        sort_order: 'desc',
        limit: 100,
      };

      const request = createRequest('http://localhost:3000/api/options/screen', {
        method: 'POST',
        body: filters,
      });
      const response = await postScreen(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.contracts).toBeDefined();
      expect(Array.isArray(data.contracts)).toBe(true);
      expect(data.total_count).toBeDefined();
      expect(typeof data.total_count).toBe('number');
    });

    it('accepts multiple underlying symbols', async () => {
      const filters: ScreenerFilters = {
        underlying_symbols: ['SPY', 'QQQ', 'IWM'],
        min_dte: 7,
        max_dte: 30,
        min_volume: 100,
        min_open_interest: 500,
        sort_by: 'volume',
        sort_order: 'desc',
        limit: 100,
      };

      const request = createRequest('http://localhost:3000/api/options/screen', {
        method: 'POST',
        body: filters,
      });
      const response = await postScreen(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.contracts).toBeDefined();
    });

    it('applies option type filters', async () => {
      const filters: ScreenerFilters = {
        underlying_symbols: ['SPY'],
        option_types: ['call'],
        min_dte: 7,
        max_dte: 30,
        min_volume: 100,
        min_open_interest: 500,
        sort_by: 'volume',
        sort_order: 'desc',
        limit: 100,
      };

      const request = createRequest('http://localhost:3000/api/options/screen', {
        method: 'POST',
        body: filters,
      });
      const response = await postScreen(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.contracts).toBeDefined();
    });

    it('applies greek filters (delta, theta, vega)', async () => {
      const filters: ScreenerFilters = {
        underlying_symbols: ['SPY'],
        min_dte: 7,
        max_dte: 30,
        min_volume: 100,
        min_open_interest: 500,
        min_delta: 0.3,
        max_delta: 0.7,
        min_theta: -0.1,
        max_theta: 0,
        min_vega: 0.1,
        sort_by: 'delta',
        sort_order: 'asc',
        limit: 100,
      };

      const request = createRequest('http://localhost:3000/api/options/screen', {
        method: 'POST',
        body: filters,
      });
      const response = await postScreen(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.contracts).toBeDefined();
    });

    it('applies IV and spread filters', async () => {
      const filters: ScreenerFilters = {
        underlying_symbols: ['SPY'],
        min_dte: 7,
        max_dte: 30,
        min_volume: 100,
        min_open_interest: 500,
        min_iv: 0.15,
        max_iv: 0.35,
        max_bid_ask_spread_pct: 5,
        sort_by: 'iv',
        sort_order: 'desc',
        limit: 100,
      };

      const request = createRequest('http://localhost:3000/api/options/screen', {
        method: 'POST',
        body: filters,
      });
      const response = await postScreen(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.contracts).toBeDefined();
    });

    it('applies moneyness filter', async () => {
      const filters: ScreenerFilters = {
        underlying_symbols: ['SPY'],
        min_dte: 7,
        max_dte: 30,
        min_volume: 100,
        min_open_interest: 500,
        moneyness: ['otm'],
        sort_by: 'volume',
        sort_order: 'desc',
        limit: 100,
      };

      const request = createRequest('http://localhost:3000/api/options/screen', {
        method: 'POST',
        body: filters,
      });
      const response = await postScreen(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.contracts).toBeDefined();
    });

    it('respects limit parameter', async () => {
      const filters: ScreenerFilters = {
        underlying_symbols: ['SPY'],
        min_dte: 7,
        max_dte: 30,
        min_volume: 100,
        min_open_interest: 500,
        sort_by: 'volume',
        sort_order: 'desc',
        limit: 10,
      };

      const request = createRequest('http://localhost:3000/api/options/screen', {
        method: 'POST',
        body: filters,
      });
      const response = await postScreen(request);
      const data = await parseResponse<ScreenerResponse>(response);

      expect(response.status).toBe(200);
      expect(data.contracts.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on invalid request body', async () => {
      // Create a Request object with invalid JSON body
      // The IP address property won't exist in test environment, but that's okay
      const req = {
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
        nextUrl: {
          pathname: '/api/options/screen',
        },
        headers: {
          get: () => '127.0.0.1',
        },
      };

      const response = await postScreen(req as any);
      const data = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});

// ============== GET /api/options/expirations ==============

describe('/api/options/expirations', () => {
  describe('Validation', () => {
    it('returns 400 when symbol is missing', async () => {
      const request = createRequest('http://localhost:3000/api/options/expirations');
      const response = await getExpirations(request);
      const data = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Symbol is required');
    });
  });

  describe('Successful Responses', () => {
    beforeEach(() => {
      server.use(
        http.get(`${BACKEND_URL}/api/options/expirations/:symbol`, () => {
          return HttpResponse.json(mockExpirations);
        })
      );
    });

    it('returns expiration dates for valid symbol', async () => {
      const request = createRequest(
        'http://localhost:3000/api/options/expirations?symbol=SPY'
      );
      const response = await getExpirations(request);
      const data = await parseResponse<ExpirationResponse>(response);

      expect(response.status).toBe(200);
      expect(data.symbol).toBe('SPY');
      expect(data.expirations).toBeDefined();
      expect(Array.isArray(data.expirations)).toBe(true);
      expect(data.expirations.length).toBeGreaterThan(0);
    });

    it('normalizes symbol to uppercase', async () => {
      // Override mock to return AAPL data
      server.use(
        http.get(`${BACKEND_URL}/api/options/expirations/:symbol`, () => {
          return HttpResponse.json({
            symbol: 'AAPL',
            expirations: mockExpirations.expirations,
          });
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/options/expirations?symbol=aapl'
      );
      const response = await getExpirations(request);
      const data = await parseResponse<ExpirationResponse>(response);

      expect(response.status).toBe(200);
      expect(data.symbol).toBe('AAPL');
    });

    it('returns dates in YYYY-MM-DD format', async () => {
      const request = createRequest(
        'http://localhost:3000/api/options/expirations?symbol=SPY'
      );
      const response = await getExpirations(request);
      const data = await parseResponse<ExpirationResponse>(response);

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      data.expirations.forEach((date) => {
        expect(date).toMatch(dateRegex);
      });
    });

    it('returns dates in chronological order', async () => {
      const request = createRequest(
        'http://localhost:3000/api/options/expirations?symbol=SPY'
      );
      const response = await getExpirations(request);
      const data = await parseResponse<ExpirationResponse>(response);

      const dates = data.expirations.map((d) => new Date(d).getTime());
      const sortedDates = [...dates].sort((a, b) => a - b);
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns mock data when backend is unavailable', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/options/expirations/:symbol`, () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/options/expirations?symbol=SPY'
      );
      const response = await getExpirations(request);
      const data = await parseResponse<ExpirationResponse & { mock?: boolean; warning?: string }>(response);

      expect(response.status).toBe(200);
      expect(data.symbol).toBe('SPY');
      expect(data.expirations).toBeDefined();
      expect(data.expirations.length).toBeGreaterThan(0);
      expect(data.mock).toBe(true);
      expect(data.warning).toContain('simulated data');
    });

    it('returns mock data when backend returns error status', async () => {
      server.use(
        http.get(`${BACKEND_URL}/api/options/expirations/:symbol`, () => {
          return HttpResponse.json(
            { error: 'Not found' },
            { status: 404 }
          );
        })
      );

      const request = createRequest(
        'http://localhost:3000/api/options/expirations?symbol=INVALID'
      );
      const response = await getExpirations(request);
      const data = await parseResponse<ExpirationResponse & { mock?: boolean }>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
    });
  });
});

// ============== POST /api/options/strategy ==============

describe('/api/options/strategy', () => {
  describe('Validation', () => {
    it('returns 400 when legs array is missing', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          underlying_price: 450,
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('At least one leg is required');
    });

    it('returns 400 when legs array is empty', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          underlying_price: 450,
          legs: [],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('At least one leg is required');
    });

    it('returns 400 when underlying_price is missing', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid underlying price is required');
    });

    it('returns 400 when underlying_price is zero or negative', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          underlying_price: 0,
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid underlying price is required');
    });

    it('returns 400 on invalid JSON body', async () => {
      const req = new Request('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await postStrategy(req as any);
      const data = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });
  });

  describe('Successful Responses', () => {
    beforeEach(() => {
      server.use(
        http.post(`${BACKEND_URL}/api/options/strategy/calculate`, () => {
          return HttpResponse.json(mockStrategyCalculation);
        })
      );
    });

    it('calculates P&L for single leg (long call)', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          underlying_price: 450,
          expiration_date: '2024-01-19',
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<StrategyCalculation>(response);

      expect(response.status).toBe(200);
      expect(data.pnl_at_expiration).toBeDefined();
      expect(data.pnl_current).toBeDefined();
      expect(data.greeks).toBeDefined();
      expect(data.max_profit).toBeDefined();
      expect(data.max_loss).toBeDefined();
      expect(data.breakeven_points).toBeDefined();
    });

    it('calculates P&L for multi-leg strategy', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          underlying_price: 450,
          expiration_date: '2024-01-19',
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
            {
              strike: 455,
              option_type: 'call',
              action: 'sell',
              quantity: 1,
              premium: 3.0,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<StrategyCalculation>(response);

      expect(response.status).toBe(200);
      expect(data.strategy_name).toBeDefined();
      expect(data.net_debit_credit).toBeDefined();
    });

    it('includes greeks in calculation', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          underlying_price: 450,
          expiration_date: '2024-01-19',
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<StrategyCalculation>(response);

      expect(data.greeks).toHaveProperty('delta');
      expect(data.greeks).toHaveProperty('gamma');
      expect(data.greeks).toHaveProperty('theta');
      expect(data.greeks).toHaveProperty('vega');
    });

    it('includes greeks over price range', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          underlying_price: 450,
          expiration_date: '2024-01-19',
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<StrategyCalculation>(response);

      expect(data.greeks_over_price).toBeDefined();
      expect(Array.isArray(data.greeks_over_price)).toBe(true);
      expect(data.greeks_over_price.length).toBeGreaterThan(0);
    });

    it('accepts optional parameters', async () => {
      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          underlying_price: 450,
          expiration_date: '2024-01-19',
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
          volatility: 0.25,
          risk_free_rate: 0.05,
          price_range_pct: 0.15,
          num_points: 50,
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<StrategyCalculation>(response);

      expect(response.status).toBe(200);
      expect(data.pnl_at_expiration).toBeDefined();
    });
  });

  describe('Backend Fallback Behavior', () => {
    it('returns mock data when backend is unavailable', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/options/strategy/calculate`, () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          underlying_price: 450,
          expiration_date: '2024-01-19',
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<StrategyCalculation & { mock?: boolean; warning?: string }>(response);

      expect(response.status).toBe(200);
      expect(data.pnl_at_expiration).toBeDefined();
      expect(data.pnl_current).toBeDefined();
      expect(data.mock).toBe(true);
      expect(data.warning).toContain('simulated data');
    });

    it('returns mock data when backend returns error status', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/options/strategy/calculate`, () => {
          return HttpResponse.json(
            { error: 'Calculation failed' },
            { status: 500 }
          );
        })
      );

      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          underlying_price: 450,
          expiration_date: '2024-01-19',
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<StrategyCalculation & { mock?: boolean }>(response);

      expect(response.status).toBe(200);
      expect(data.mock).toBe(true);
    });

    it('generates reasonable mock calculations', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/options/strategy/calculate`, () => {
          return HttpResponse.error();
        })
      );

      const request = createRequest('http://localhost:3000/api/options/strategy', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          underlying_price: 450,
          expiration_date: '2024-01-19',
          legs: [
            {
              strike: 450,
              option_type: 'call',
              action: 'buy',
              quantity: 1,
              premium: 5.5,
            },
          ],
        },
      });
      const response = await postStrategy(request);
      const data = await parseResponse<StrategyCalculation>(response);

      // Verify mock data quality
      expect(data.pnl_at_expiration.length).toBeGreaterThan(0);
      expect(data.max_profit).toBeGreaterThanOrEqual(0);
      expect(data.max_loss).toBeGreaterThanOrEqual(0);
      expect(data.strategy_name).toBeDefined();
      expect(data.net_debit_credit).toBeLessThan(0); // Long call should be a debit
    });
  });
});
