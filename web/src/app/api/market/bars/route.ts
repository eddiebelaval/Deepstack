import { NextRequest } from 'next/server';
import { apiSuccess, apiError, MOCK_DATA_WARNING } from '@/lib/api-response';
import { serverCache, CACHE_TTL, marketCacheKey } from '@/lib/cache';
import { MOCK_PRICES, seededRandom, createDailySeed } from '@/lib/mock-data-constants';
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
    .transform((s: string) => s.toLowerCase()) // Normalize to lowercase
    .pipe(z.string().regex(/^(1m|5m|15m|30m|1h|2h|4h|1d|1w|1m)$/, 'Invalid timeframe. Valid values: 1m, 5m, 15m, 30m, 1h, 2h, 4h, 1d, 1w, 1M'))
    .default('1d'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .default('100')
    .transform((s: string) => parseInt(s, 10))
    .refine((num) => num >= 1 && num <= 1000, {
      message: 'Limit must be between 1 and 1000',
    }),
});

// Get bar interval in seconds based on timeframe
function getBarIntervalSeconds(timeframe: string): number {
  const hourInSeconds = 3600;
  const dayInSeconds = 86400;
  const weekInSeconds = 7 * dayInSeconds;
  const monthInSeconds = 30 * dayInSeconds;

  switch (timeframe.toLowerCase()) {
    case '1m': return 60;
    case '5m': return 5 * 60;
    case '15m': return 15 * 60;
    case '30m': return 30 * 60;
    case '1h': return hourInSeconds;
    case '2h': return 2 * hourInSeconds;
    case '4h': return 4 * hourInSeconds;
    case '1d': return dayInSeconds;
    case '1w': return weekInSeconds;
    case '1mo': return monthInSeconds;
    default: return dayInSeconds;
  }
}

// Get cache TTL based on timeframe - shorter timeframes need fresher data
function getCacheTTL(timeframe: string): number {
  switch (timeframe.toLowerCase()) {
    case '1m':
    case '5m':
      return 30; // 30 seconds for minute data
    case '15m':
    case '30m':
      return 60; // 1 minute for 15/30m data
    case '1h':
    case '2h':
    case '4h':
      return 120; // 2 minutes for hourly data
    case '1d':
    case '1w':
    case '1mo':
    default:
      return CACHE_TTL.BARS; // 5 minutes for daily/weekly/monthly
  }
}

interface BarData {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// Generate mock bars data when backend is unavailable
// Uses deterministic random based on symbol + date for consistency
function generateMockBars(symbol: string, limit: number, timeframe: string = '1d'): BarData[] {
  const bars: BarData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = getBarIntervalSeconds(timeframe);

  // Use seeded random for consistent data across requests
  const seed = createDailySeed(symbol.toUpperCase());
  const random = seededRandom(seed);

  // Target price is the current price (matches quotes API from shared constants)
  const targetPrice = MOCK_PRICES[symbol.toUpperCase()] || (150 + random() * 100);

  // Generate bars backwards from target price to ensure last bar = target
  // First, generate random changes
  const changes: number[] = [];
  for (let i = 0; i < limit; i++) {
    // Random change between -2% and +2%
    changes.push(random() * 0.04 - 0.02);
  }

  // Calculate starting price by applying changes in reverse
  let startPrice = targetPrice;
  for (let i = changes.length - 1; i >= 0; i--) {
    startPrice = startPrice / (1 + changes[i]);
  }

  // Now generate bars forward from start price
  let price = startPrice;
  for (let i = limit; i > 0; i--) {
    const changeIdx = limit - i;
    const change = price * changes[changeIdx];
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + random() * 0.01);
    const low = Math.min(open, close) * (1 - random() * 0.01);

    bars.push({
      t: new Date((now - i * intervalSeconds) * 1000).toISOString(),
      o: Math.round(open * 100) / 100,
      h: Math.round(high * 100) / 100,
      l: Math.round(low * 100) / 100,
      c: Math.round(close * 100) / 100,
      v: Math.floor(1000000 + random() * 9000000),
    });

    price = close;
  }

  return bars;
}


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    symbol: searchParams.get('symbol'),
    timeframe: searchParams.get('timeframe') || '1d',
    limit: searchParams.get('limit') || '100',
  };

  // Validate query parameters with Zod
  const validation = barsRequestSchema.safeParse(queryParams);

  if (!validation.success) {
    return apiError(
      'INVALID_PARAMETERS',
      'Invalid query parameters',
      {
        status: 400,
        details: validation.error.format()
      }
    );
  }

  const { symbol, timeframe, limit } = validation.data;

  // Check cache first
  const cacheKey = marketCacheKey('bars', { symbol, timeframe, limit });
  const cached = serverCache.get<BarData[]>(cacheKey);

  if (cached) {
    return apiSuccess({ bars: cached }, { isMock: false });
  }

  try {
    // Call the Python backend to get historical bars
    const response = await fetch(
      `${API_BASE_URL}/api/market/bars?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        // Use next.js revalidation for edge caching
        next: { revalidate: getCacheTTL(timeframe) },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    const bars = data.bars || data;

    // If backend returns empty bars, use mock data for better UX
    if (!bars || (Array.isArray(bars) && bars.length === 0)) {
      console.warn('Backend returned empty bars, using mock data');
      const mockBars = generateMockBars(symbol, limit, timeframe);
      return apiSuccess(
        { bars: mockBars },
        { isMock: true, warning: MOCK_DATA_WARNING }
      );
    }

    // Cache the result with appropriate TTL
    serverCache.set(cacheKey, bars, getCacheTTL(timeframe));

    // Wrap backend response in standard format
    return apiSuccess({ bars }, { isMock: data.mock || false });
  } catch (error) {
    // Backend unavailable - return mock data so UI still works
    console.warn('Backend unavailable for bars, returning mock data:', error);

    // Generate mock bars data with correct timeframe intervals
    const mockBars = generateMockBars(symbol, limit, timeframe);

    return apiSuccess(
      { bars: mockBars },
      { isMock: true, warning: MOCK_DATA_WARNING }
    );
  }
}
