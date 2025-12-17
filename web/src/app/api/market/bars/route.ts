import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { serverCache, CACHE_TTL, marketCacheKey } from '@/lib/cache';
import { fetchStoredBars, storeBars, MarketBar } from '@/lib/supabase/market-data';
import { fetchAlpacaBars, AlpacaBar } from '@/lib/alpaca-client';
import { z } from 'zod';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Zod schema for bars request
const barsRequestSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must be 20 characters or less')
    .regex(/^[A-Z0-9./-]+$/i, 'Symbol must contain only letters, numbers, dots, slashes, and hyphens')
    .transform((s: string) => s.toUpperCase()),
  timeframe: z.string()
    .transform((s: string) => s.toLowerCase())
    .pipe(z.string().regex(/^(1m|5m|15m|30m|1h|2h|4h|1d|1w|1mo?)$/, 'Invalid timeframe'))
    .default('1d'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .default('100')
    .transform((s: string) => parseInt(s, 10))
    .refine((num) => num >= 1 && num <= 1000, {
      message: 'Limit must be between 1 and 1000',
    }),
});

// Get cache TTL based on timeframe
function getCacheTTL(timeframe: string): number {
  switch (timeframe.toLowerCase()) {
    case '1m':
    case '5m':
      return 30;
    case '15m':
    case '30m':
      return 60;
    case '1h':
    case '2h':
    case '4h':
      return 120;
    case '1d':
    case '1w':
    case '1mo':
    default:
      return CACHE_TTL.BARS;
  }
}

// Standard bar format for API response
interface BarData {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// Convert Alpaca bar to our format
function alpacaBarToBarData(bar: AlpacaBar): BarData {
  return {
    t: bar.t,
    o: bar.o,
    h: bar.h,
    l: bar.l,
    c: bar.c,
    v: bar.v,
  };
}

// Convert MarketBar (from Supabase) to BarData
function marketBarToBarData(bar: MarketBar): BarData {
  return {
    t: bar.timestamp,
    o: bar.open,
    h: bar.high,
    l: bar.low,
    c: bar.close,
    v: bar.volume || 0,
  };
}

// Convert BarData to MarketBar for storage
function barDataToMarketBar(bar: BarData, symbol: string, timeframe: string): MarketBar {
  return {
    symbol: symbol.toUpperCase(),
    timeframe: timeframe.toLowerCase(),
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  };
}

/**
 * Data Source Hierarchy:
 * 1. Memory cache (fastest, shortest TTL)
 * 2. Supabase storage (historical data, persistent)
 * 3. Python backend (preferred live source)
 * 4. Direct Alpaca API (fallback when backend down)
 *
 * We NEVER generate mock data. If all sources fail, we return an error.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    symbol: searchParams.get('symbol'),
    timeframe: searchParams.get('timeframe') || '1d',
    limit: searchParams.get('limit') || '100',
  };

  // Validate query parameters
  const validation = barsRequestSchema.safeParse(queryParams);
  if (!validation.success) {
    return apiError(
      'INVALID_PARAMETERS',
      'Invalid query parameters',
      { status: 400, details: validation.error.format() }
    );
  }

  const { symbol, timeframe, limit } = validation.data;

  // 1. Check memory cache first (fastest path)
  const cacheKey = marketCacheKey('bars', { symbol, timeframe, limit });
  const cached = serverCache.get<BarData[]>(cacheKey);
  if (cached && cached.length >= limit * 0.8) {
    return apiSuccess({ bars: cached }, { isMock: false, source: 'cache' });
  }

  // 2. Check Supabase for stored historical data
  try {
    const storedBars = await fetchStoredBars(symbol, timeframe, limit);
    if (storedBars.length >= limit * 0.8) {
      const bars = storedBars.map(marketBarToBarData);
      // Cache for quick access
      serverCache.set(cacheKey, bars, getCacheTTL(timeframe));
      return apiSuccess({ bars }, { isMock: false, source: 'stored' });
    }
  } catch (error) {
    console.warn('Supabase fetch failed, continuing to other sources:', error);
  }

  // 3. Try Python backend (preferred live source)
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/market/bars?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`,
      {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        next: { revalidate: getCacheTTL(timeframe) },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const bars = data.bars || data;

      if (Array.isArray(bars) && bars.length > 0) {
        // Store in Supabase for future requests (background, don't await)
        const marketBars = bars.map((b: BarData) => barDataToMarketBar(b, symbol, timeframe));
        storeBars(marketBars).catch(err =>
          console.warn('Background storage failed:', err)
        );

        // Cache for quick access
        serverCache.set(cacheKey, bars, getCacheTTL(timeframe));

        return apiSuccess({ bars }, { isMock: false, source: 'backend' });
      }
    }
  } catch (error) {
    console.warn('Python backend unavailable:', error);
  }

  // 4. Fallback to direct Alpaca API
  try {
    const alpacaBars = await fetchAlpacaBars(symbol, timeframe, limit);

    if (alpacaBars && alpacaBars.length > 0) {
      const bars = alpacaBars.map(alpacaBarToBarData);

      // Store in Supabase for future requests (background)
      const marketBars = bars.map(b => barDataToMarketBar(b, symbol, timeframe));
      storeBars(marketBars).catch(err =>
        console.warn('Background storage failed:', err)
      );

      // Cache for quick access
      serverCache.set(cacheKey, bars, getCacheTTL(timeframe));

      return apiSuccess({ bars }, { isMock: false, source: 'alpaca_direct' });
    }
  } catch (error) {
    console.warn('Direct Alpaca API failed:', error);
  }

  // 5. Last resort: Return whatever we have from Supabase (even if incomplete)
  try {
    const storedBars = await fetchStoredBars(symbol, timeframe, limit);
    if (storedBars.length > 0) {
      const bars = storedBars.map(marketBarToBarData);
      return apiSuccess(
        { bars },
        {
          isMock: false,
          source: 'stored_partial',
          warning: `Returning ${storedBars.length} stored bars (requested ${limit}). Live data sources unavailable.`,
          lastUpdated: storedBars[storedBars.length - 1]?.timestamp,
        }
      );
    }
  } catch {
    // Final fallback failed
  }

  // All sources failed - return error (NEVER mock data)
  return apiError(
    'DATA_UNAVAILABLE',
    `Market data unavailable for ${symbol}. All data sources failed.`,
    {
      status: 503,
      details: {
        symbol,
        timeframe,
        limit,
        suggestion: 'Please try again later or check if the symbol is valid.',
      }
    }
  );
}
