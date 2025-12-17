/**
 * Direct Alpaca API Client for Next.js
 *
 * Fallback data source when Python backend is unavailable.
 * Fetches historical bars directly from Alpaca Data API.
 */

// Alpaca Data API endpoints
const STOCK_DATA_URL = 'https://data.alpaca.markets/v2';
const CRYPTO_DATA_URL = 'https://data.alpaca.markets/v1beta3/crypto/us';

// Type definitions
export interface AlpacaBar {
  t: string;  // ISO timestamp
  o: number;  // Open
  h: number;  // High
  l: number;  // Low
  c: number;  // Close
  v: number;  // Volume
  n?: number; // Trade count
  vw?: number; // VWAP
}

export interface AlpacaBarsResponse {
  bars: AlpacaBar[];
  symbol: string;
  next_page_token?: string;
}

// Timeframe mapping from our format to Alpaca's
const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1Min',
  '5m': '5Min',
  '15m': '15Min',
  '30m': '30Min',
  '1h': '1Hour',
  '2h': '2Hour',
  '4h': '4Hour',
  '1d': '1Day',
  '1w': '1Week',
  '1mo': '1Month',
};

// Check if symbol is crypto (contains '/')
function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes('/');
}

// Get API credentials from environment
function getCredentials(): { apiKey: string; secretKey: string } | null {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.warn('Alpaca API credentials not configured');
    return null;
  }

  return { apiKey, secretKey };
}

// Calculate start date based on limit and timeframe
function calculateStartDate(timeframe: string, limit: number): Date {
  const now = new Date();
  const multiplier: Record<string, number> = {
    '1m': limit * 60 * 1000,
    '5m': limit * 5 * 60 * 1000,
    '15m': limit * 15 * 60 * 1000,
    '30m': limit * 30 * 60 * 1000,
    '1h': limit * 60 * 60 * 1000,
    '2h': limit * 2 * 60 * 60 * 1000,
    '4h': limit * 4 * 60 * 60 * 1000,
    '1d': limit * 24 * 60 * 60 * 1000,
    '1w': limit * 7 * 24 * 60 * 60 * 1000,
    '1mo': limit * 30 * 24 * 60 * 60 * 1000,
  };

  const msBack = multiplier[timeframe.toLowerCase()] || multiplier['1d'];
  return new Date(now.getTime() - msBack * 1.5); // Add 50% buffer for missing data
}

/**
 * Fetch historical bars directly from Alpaca Data API
 * Works for both stocks and crypto
 */
export async function fetchAlpacaBars(
  symbol: string,
  timeframe: string = '1d',
  limit: number = 100,
  startDate?: Date,
  endDate?: Date
): Promise<AlpacaBar[] | null> {
  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  const isCrypto = isCryptoSymbol(symbol);
  const alpacaTimeframe = TIMEFRAME_MAP[timeframe.toLowerCase()] || '1Day';

  // Calculate date range
  const end = endDate || new Date();
  const start = startDate || calculateStartDate(timeframe, limit);

  try {
    let url: string;
    let headers: Record<string, string>;

    if (isCrypto) {
      // Crypto API endpoint
      url = `${CRYPTO_DATA_URL}/bars?symbols=${encodeURIComponent(symbol)}&timeframe=${alpacaTimeframe}&start=${start.toISOString()}&end=${end.toISOString()}&limit=${limit}`;
    } else {
      // Stock API endpoint
      url = `${STOCK_DATA_URL}/stocks/${encodeURIComponent(symbol)}/bars?timeframe=${alpacaTimeframe}&start=${start.toISOString()}&end=${end.toISOString()}&limit=${limit}`;
    }

    headers = {
      'APCA-API-KEY-ID': credentials.apiKey,
      'APCA-API-SECRET-KEY': credentials.secretKey,
    };

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Alpaca API error (${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();

    // Handle different response structures for stocks vs crypto
    let bars: AlpacaBar[];
    if (isCrypto) {
      // Crypto response: { bars: { "BTC/USD": [...] } }
      bars = data.bars?.[symbol] || [];
    } else {
      // Stock response: { bars: [...] }
      bars = data.bars || [];
    }

    // Map to our standard format
    return bars.map((bar: AlpacaBar) => ({
      t: bar.t,
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      v: bar.v,
      n: bar.n,
      vw: bar.vw,
    }));

  } catch (error) {
    console.error(`Error fetching bars from Alpaca for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch latest quote directly from Alpaca
 */
export async function fetchAlpacaQuote(symbol: string): Promise<{
  bid: number;
  ask: number;
  last: number;
  timestamp: string;
} | null> {
  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  const isCrypto = isCryptoSymbol(symbol);

  try {
    let url: string;

    if (isCrypto) {
      url = `${CRYPTO_DATA_URL}/latest/quotes?symbols=${encodeURIComponent(symbol)}`;
    } else {
      url = `${STOCK_DATA_URL}/stocks/${encodeURIComponent(symbol)}/quotes/latest`;
    }

    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.secretKey,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error(`Alpaca quote error (${response.status})`);
      return null;
    }

    const data = await response.json();

    // Handle different response structures
    let quote;
    if (isCrypto) {
      quote = data.quotes?.[symbol];
    } else {
      quote = data.quote;
    }

    if (!quote) {
      return null;
    }

    return {
      bid: quote.bp || quote.bid_price,
      ask: quote.ap || quote.ask_price,
      last: quote.ap || quote.ask_price, // Use ask as last
      timestamp: quote.t || new Date().toISOString(),
    };

  } catch (error) {
    console.error(`Error fetching quote from Alpaca for ${symbol}:`, error);
    return null;
  }
}

/**
 * Check if Alpaca API is accessible
 */
export async function isAlpacaAvailable(): Promise<boolean> {
  const credentials = getCredentials();
  if (!credentials) {
    return false;
  }

  try {
    // Simple test request to check credentials and connectivity
    const response = await fetch(`${STOCK_DATA_URL}/stocks/SPY/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.secretKey,
      },
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    return response.ok;
  } catch {
    return false;
  }
}
