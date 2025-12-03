/**
 * Mock market data for testing charts
 * This generates realistic-looking OHLCV data for demonstration purposes
 */

import type { OHLCVBar, QuoteData } from "@/lib/stores/market-data-store";

/**
 * Generate mock OHLCV bars for a symbol
 * @param symbol - Stock symbol
 * @param days - Number of days of data to generate
 * @param basePrice - Starting price
 * @returns Array of OHLCV bars
 */
export function generateMockBars(
  symbol: string,
  days: number = 100,
  basePrice: number = 450
): OHLCVBar[] {
  const bars: OHLCVBar[] = [];
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 86400;

  let price = basePrice;

  for (let i = days; i >= 0; i--) {
    // Skip weekends (simplified)
    const date = new Date((now - i * dayInSeconds) * 1000);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Random price movement (-3% to +3%)
    const change = price * (Math.random() * 0.06 - 0.03);
    const open = price;
    const close = price + change;

    // Generate high/low with some variance
    const range = Math.abs(change) + price * (Math.random() * 0.02);
    const high = Math.max(open, close) + Math.random() * range;
    const low = Math.min(open, close) - Math.random() * range;

    // Generate volume (random between 10M and 100M)
    const volume = Math.floor(10000000 + Math.random() * 90000000);

    bars.push({
      time: now - i * dayInSeconds,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    price = close;
  }

  return bars;
}

/**
 * Generate mock quote data for a symbol
 */
export function generateMockQuote(
  symbol: string,
  bars: OHLCVBar[]
): QuoteData | null {
  if (bars.length === 0) return null;

  const lastBar = bars[bars.length - 1];
  const prevBar = bars.length > 1 ? bars[bars.length - 2] : lastBar;

  const change = lastBar.close - prevBar.close;
  const changePercent = (change / prevBar.close) * 100;

  return {
    symbol,
    last: lastBar.close,
    open: lastBar.open,
    high: lastBar.high,
    low: lastBar.low,
    close: lastBar.close,
    volume: lastBar.volume,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    bid: lastBar.close - 0.01,
    ask: lastBar.close + 0.01,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Symbol base prices for realistic data
 */
const SYMBOL_PRICES: Record<string, number> = {
  SPY: 450,
  QQQ: 380,
  AAPL: 175,
  MSFT: 420,
  NVDA: 875,
  TSLA: 245,
  AMZN: 178,
  GOOGL: 165,
  META: 510,
  AMD: 165,
};

/**
 * Initialize mock data for all common symbols
 */
export function initializeMockData(): {
  bars: Record<string, OHLCVBar[]>;
  quotes: Record<string, QuoteData>;
} {
  const bars: Record<string, OHLCVBar[]> = {};
  const quotes: Record<string, QuoteData> = {};

  for (const [symbol, basePrice] of Object.entries(SYMBOL_PRICES)) {
    bars[symbol] = generateMockBars(symbol, 100, basePrice);
    const quote = generateMockQuote(symbol, bars[symbol]);
    if (quote) {
      quotes[symbol] = quote;
    }
  }

  return { bars, quotes };
}
