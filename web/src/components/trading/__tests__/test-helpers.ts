/**
 * Test Helpers for Trading Components
 *
 * Common utilities and factory functions for testing trading features
 */

import { Position } from '@/lib/supabase/portfolio';
import { TradeEntry } from '@/lib/stores/trades-store';

/**
 * Creates a mock position for testing
 */
export function createMockPosition(overrides: Partial<Position> = {}): Position {
  const now = new Date().toISOString();
  const base: Position = {
    symbol: 'AAPL',
    quantity: 100,
    avg_cost: 150.0,
    total_cost: 15000.0,
    current_price: 160.0,
    market_value: 16000.0,
    unrealized_pnl: 1000.0,
    unrealized_pnl_pct: 6.67,
    realized_pnl: 0,
    first_trade_at: now,
    last_trade_at: now,
    trades: [
      {
        id: '1',
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        createdAt: now,
        orderType: 'MKT',
      },
    ],
  };

  return { ...base, ...overrides };
}

/**
 * Creates a mock trade entry for testing
 */
export function createMockTrade(overrides: Partial<TradeEntry> = {}): TradeEntry {
  const base: TradeEntry = {
    id: Math.random().toString(36).substr(2, 9),
    symbol: 'SPY',
    action: 'BUY',
    quantity: 100,
    price: 450.0,
    orderType: 'MKT',
    createdAt: new Date().toISOString(),
    notes: '',
    tags: [],
  };

  return { ...base, ...overrides };
}

/**
 * Creates a mock quote for testing
 */
export function createMockQuote(symbol: string, overrides: Partial<any> = {}) {
  return {
    symbol,
    last: 100.0,
    bid: 99.95,
    ask: 100.05,
    volume: 1000000,
    changePercent: 0.5,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock watchlist for testing
 */
export function createMockWatchlist(overrides: Partial<any> = {}) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: 'Test Watchlist',
    items: [
      { symbol: 'AAPL', notes: undefined },
      { symbol: 'GOOGL', notes: undefined },
    ],
    ...overrides,
  };
}

/**
 * Waits for an element to appear with custom timeout
 */
export async function waitForElement(
  getElement: () => HTMLElement | null,
  timeout = 3000
): Promise<HTMLElement> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = getElement();
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error('Element not found within timeout');
}

/**
 * Simulates a delay (useful for testing loading states)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a mock error response
 */
export function createMockError(message: string, code?: string) {
  const error = new Error(message);
  if (code) {
    (error as any).code = code;
  }
  return error;
}

/**
 * Mock market data store state
 */
export function createMockMarketDataState(symbols: string[] = ['SPY', 'AAPL']) {
  const quotes: Record<string, any> = {};

  symbols.forEach((symbol, index) => {
    quotes[symbol] = createMockQuote(symbol, {
      last: 100 + index * 10,
      changePercent: (index % 2 === 0 ? 1 : -1) * Math.random() * 5,
    });
  });

  return { quotes };
}

/**
 * Mock trading store state
 */
export function createMockTradingState(overrides: Partial<any> = {}) {
  return {
    activeSymbol: 'SPY',
    chartType: 'candlestick' as const,
    timeframe: '1d' as const,
    showWatchlist: true,
    showOrderPanel: true,
    overlaySymbols: [],
    indicators: [],
    ...overrides,
  };
}

/**
 * Assert number is close to expected (for floating point comparisons)
 */
export function expectCloseTo(actual: number, expected: number, precision = 2) {
  const multiplier = Math.pow(10, precision);
  const roundedActual = Math.round(actual * multiplier) / multiplier;
  const roundedExpected = Math.round(expected * multiplier) / multiplier;

  if (roundedActual !== roundedExpected) {
    throw new Error(
      `Expected ${actual} to be close to ${expected} (precision: ${precision})`
    );
  }
}

/**
 * Flexible text matcher that handles number formatting
 */
export function matchCurrency(amount: number): RegExp {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = amount >= 0 ? '\\+?' : '-';
  // Match with or without commas
  const pattern = formatted.replace(/,/g, ',?');

  return new RegExp(`${sign}\\$${pattern}`);
}

/**
 * Flexible percentage matcher
 */
export function matchPercentage(value: number): RegExp {
  const sign = value >= 0 ? '\\+?' : '-';
  const absValue = Math.abs(value).toFixed(2);
  return new RegExp(`${sign}${absValue}%`);
}

/**
 * Create mock HTML element with pointer capture methods
 */
export function createMockElement() {
  const element = document.createElement('div');

  // Add pointer capture methods if not present
  if (!element.hasPointerCapture) {
    (element as any).hasPointerCapture = () => false;
    (element as any).setPointerCapture = () => {};
    (element as any).releasePointerCapture = () => {};
  }

  return element;
}

/**
 * Create mock form submission event
 */
export function createMockSubmitEvent(preventDefault = true) {
  const event = new Event('submit', { bubbles: true, cancelable: true });

  if (preventDefault) {
    const originalPreventDefault = event.preventDefault.bind(event);
    event.preventDefault = () => {
      originalPreventDefault();
    };
  }

  return event as unknown as React.FormEvent;
}

/**
 * Batch create multiple mock positions
 */
export function createMockPositions(count: number, baseOverrides: Partial<Position> = {}): Position[] {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA'];

  return Array.from({ length: count }, (_, index) => {
    return createMockPosition({
      symbol: symbols[index % symbols.length],
      quantity: (index + 1) * 10,
      avg_cost: 100 + index * 10,
      ...baseOverrides,
    });
  });
}

/**
 * Calculate expected P&L for a position
 */
export function calculateExpectedPnL(
  quantity: number,
  avgCost: number,
  currentPrice: number,
  side: 'long' | 'short' = 'long'
): { pnl: number; pnlPercent: number } {
  const costBasis = quantity * avgCost;
  const marketValue = quantity * currentPrice;

  const pnl = side === 'long'
    ? marketValue - costBasis
    : costBasis - marketValue;

  const pnlPercent = costBasis !== 0 ? (pnl / costBasis) * 100 : 0;

  return { pnl, pnlPercent };
}

/**
 * Format currency for display (matches app formatting)
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
