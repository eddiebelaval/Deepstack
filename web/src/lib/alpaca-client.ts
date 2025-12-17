/**
 * Direct Alpaca API Client for Next.js
 *
 * Fallback data source when Python backend is unavailable.
 * Fetches historical bars directly from Alpaca Data API.
 */

// Alpaca Data API endpoints
const STOCK_DATA_URL = 'https://data.alpaca.markets/v2';
const CRYPTO_DATA_URL = 'https://data.alpaca.markets/v1beta3/crypto/us';

// Feed type: 'iex' for free/paper accounts, 'sip' for paid subscriptions
// Free and paper trading accounts only have access to IEX feed for real-time
// But SIP historical data (15+ min delay) is available on free tier
const STOCK_FEED = 'iex';
const SIP_FEED = 'sip';

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
 * Internal helper to fetch bars with a specific feed
 */
async function fetchBarsWithFeed(
  symbol: string,
  alpacaTimeframe: string,
  start: Date,
  end: Date,
  limit: number,
  feed: string,
  credentials: { apiKey: string; secretKey: string }
): Promise<AlpacaBar[] | null> {
  const isCrypto = isCryptoSymbol(symbol);

  let url: string;
  if (isCrypto) {
    // Crypto API endpoint (no feed parameter needed for crypto)
    url = `${CRYPTO_DATA_URL}/bars?symbols=${encodeURIComponent(symbol)}&timeframe=${alpacaTimeframe}&start=${start.toISOString()}&end=${end.toISOString()}&limit=${limit}`;
  } else {
    // Stock API endpoint
    url = `${STOCK_DATA_URL}/stocks/${encodeURIComponent(symbol)}/bars?timeframe=${alpacaTimeframe}&start=${start.toISOString()}&end=${end.toISOString()}&limit=${limit}&feed=${feed}`;
  }

  const response = await fetch(url, {
    headers: {
      'APCA-API-KEY-ID': credentials.apiKey,
      'APCA-API-SECRET-KEY': credentials.secretKey,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  // Handle different response structures for stocks vs crypto
  let bars: AlpacaBar[];
  if (isCrypto) {
    bars = data.bars?.[symbol] || [];
  } else {
    bars = data.bars || [];
  }

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
}

/**
 * Fetch historical bars directly from Alpaca Data API
 * Works for both stocks and crypto
 *
 * Data Source Hierarchy:
 * 1. IEX feed (real-time, but limited symbols)
 * 2. SIP feed with 20-min delay (historical data, all symbols, free tier allowed)
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
    // 1. Try IEX feed first (free, real-time, but limited symbols like SPY/MSFT may not have data)
    const iexBars = await fetchBarsWithFeed(symbol, alpacaTimeframe, start, end, limit, STOCK_FEED, credentials);

    if (iexBars && iexBars.length > 0) {
      return iexBars;
    }

    // 2. Fallback to SIP feed with delayed end time (free tier allows SIP data 15+ min old)
    // Use 20 minutes ago to be safe
    if (!isCrypto) {
      const delayedEnd = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago

      // Only use delayed end if it's after the start date
      if (delayedEnd > start) {
        console.log(`IEX returned no data for ${symbol}, trying SIP feed with 20-min delay`);
        const sipBars = await fetchBarsWithFeed(symbol, alpacaTimeframe, start, delayedEnd, limit, SIP_FEED, credentials);

        if (sipBars && sipBars.length > 0) {
          return sipBars;
        }
      }
    }

    return null;

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
      // Crypto quotes (no feed parameter needed)
      url = `${CRYPTO_DATA_URL}/latest/quotes?symbols=${encodeURIComponent(symbol)}`;
    } else {
      // Stock quotes - use IEX feed for free/paper accounts
      url = `${STOCK_DATA_URL}/stocks/${encodeURIComponent(symbol)}/quotes/latest?feed=${STOCK_FEED}`;
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
 * Quote result type for batch fetching
 */
export interface AlpacaQuoteResult {
  bid: number;
  ask: number;
  last: number;
  timestamp: string;
}

/**
 * Fetch latest quotes for MULTIPLE symbols in batch (reduces API calls from N to 2)
 * This is the preferred method to avoid rate limiting.
 *
 * Makes at most 2 API calls: one for stocks, one for crypto.
 * Alpaca supports batch quotes: GET /v2/stocks/quotes/latest?symbols=AAPL,MSFT,GOOGL
 */
export async function fetchAlpacaQuotesBatch(
  symbols: string[]
): Promise<Record<string, AlpacaQuoteResult>> {
  const credentials = getCredentials();
  if (!credentials) {
    return {};
  }

  const results: Record<string, AlpacaQuoteResult> = {};

  // Separate stocks and crypto
  const stockSymbols = symbols.filter(s => !isCryptoSymbol(s));
  const cryptoSymbols = symbols.filter(s => isCryptoSymbol(s));

  const headers = {
    'APCA-API-KEY-ID': credentials.apiKey,
    'APCA-API-SECRET-KEY': credentials.secretKey,
  };

  // Fetch stock quotes in batch (single API call for all stocks)
  if (stockSymbols.length > 0) {
    try {
      const symbolsParam = stockSymbols.join(',');
      const url = `${STOCK_DATA_URL}/stocks/quotes/latest?symbols=${encodeURIComponent(symbolsParam)}&feed=${STOCK_FEED}`;

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        // Response format: { quotes: { "AAPL": {...}, "MSFT": {...} } }
        const quotes = data.quotes || {};

        for (const symbol of stockSymbols) {
          const quote = quotes[symbol];
          if (quote) {
            results[symbol] = {
              bid: quote.bp || quote.bid_price || 0,
              ask: quote.ap || quote.ask_price || 0,
              last: quote.ap || quote.ask_price || 0,
              timestamp: quote.t || new Date().toISOString(),
            };
          }
        }
      } else {
        console.error(`Alpaca batch stock quotes error (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching batch stock quotes from Alpaca:', error);
    }
  }

  // Fetch crypto quotes in batch (single API call for all crypto)
  if (cryptoSymbols.length > 0) {
    try {
      const symbolsParam = cryptoSymbols.join(',');
      const url = `${CRYPTO_DATA_URL}/latest/quotes?symbols=${encodeURIComponent(symbolsParam)}`;

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        // Response format: { quotes: { "BTC/USD": {...}, "ETH/USD": {...} } }
        const quotes = data.quotes || {};

        for (const symbol of cryptoSymbols) {
          const quote = quotes[symbol];
          if (quote) {
            results[symbol] = {
              bid: quote.bp || quote.bid_price || 0,
              ask: quote.ap || quote.ask_price || 0,
              last: quote.ap || quote.ask_price || 0,
              timestamp: quote.t || new Date().toISOString(),
            };
          }
        }
      } else {
        console.error(`Alpaca batch crypto quotes error (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching batch crypto quotes from Alpaca:', error);
    }
  }

  return results;
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
    // Use IEX feed for free/paper accounts to avoid 403 errors
    const response = await fetch(`${STOCK_DATA_URL}/stocks/SPY/quotes/latest?feed=${STOCK_FEED}`, {
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
