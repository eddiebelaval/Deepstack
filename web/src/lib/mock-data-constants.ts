/**
 * Shared mock data constants for market APIs
 * Used when the Python backend is unavailable to ensure consistency
 * between bars and quotes endpoints
 */

// Realistic prices for common symbols (as of late 2024)
// These must match across bars and quotes APIs for UI consistency
export const MOCK_PRICES: Record<string, number> = {
  // Market Indices ETFs
  SPY: 595,
  QQQ: 520,
  DIA: 440,
  IWM: 225,
  VIX: 14,
  // Tech stocks
  NVDA: 142,
  AAPL: 238,
  TSLA: 355,
  AMD: 140,
  MSFT: 432,
  GOOGL: 175,
  META: 580,
  AMZN: 210,
  // Crypto (Alpaca format with slash)
  'BTC/USD': 98500,
  'ETH/USD': 3800,
  'SOL/USD': 225,
  'DOGE/USD': 0.42,
  'XRP/USD': 2.45,
};

/**
 * Seeded random number generator for consistent mock data
 * Uses a simple mulberry32 algorithm
 */
export function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seed from symbol and date (changes daily)
 * Ensures same mock data across requests within a day
 */
export function createDailySeed(symbol: string): number {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const str = `${symbol}-${today}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Get mock price for a symbol
 * Returns undefined if symbol not in our list
 */
export function getMockPrice(symbol: string): number | undefined {
  return MOCK_PRICES[symbol.toUpperCase()];
}
