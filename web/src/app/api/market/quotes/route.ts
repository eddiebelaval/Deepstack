import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverCache, CACHE_TTL, marketCacheKey } from '@/lib/cache';
import { MOCK_PRICES, seededRandom, createDailySeed } from '@/lib/mock-data-constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Zod schema for quotes request
const quotesRequestSchema = z.object({
  symbols: z.string()
    .min(1, 'At least one symbol is required')
    .transform(s => s.split(',').map(sym => sym.trim().toUpperCase()).join(','))
    .refine(
      s => s.split(',').every(sym => /^[A-Z0-9.\-\/]+$/.test(sym)),
      'All symbols must contain only letters, numbers, dots, hyphens, and slashes'
    ),
});

// Generate mock quote data when backend is unavailable
// Uses seeded random for consistency with bars API
function generateMockQuotes(symbols: string[]): Record<string, object> {
  const quotes: Record<string, object> = {};

  for (const symbol of symbols) {
    // Use seeded random for consistent data across requests
    const seed = createDailySeed(symbol.toUpperCase());
    const random = seededRandom(seed);

    const basePrice = MOCK_PRICES[symbol.toUpperCase()] || (100 + random() * 400);
    // Small intraday change (seeded for consistency)
    const change = basePrice * (random() - 0.5) * 0.02; // +/- 1%
    const changePercent = (change / basePrice) * 100;

    quotes[symbol] = {
      symbol,
      last: basePrice,
      open: basePrice - change * 0.5,
      high: basePrice + Math.abs(change) * 0.3,
      low: basePrice - Math.abs(change) * 0.3,
      close: basePrice,
      volume: Math.floor(1000000 + random() * 9000000),
      change: change,
      changePercent: changePercent,
      bid: basePrice - 0.01,
      ask: basePrice + 0.01,
      timestamp: new Date().toISOString(),
    };
  }
  return quotes;
}

interface QuoteData {
  symbol: string;
  last?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  bid?: number;
  ask?: number;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    symbols: searchParams.get('symbols'),
  };

  // Validate query parameters with Zod
  const validation = quotesRequestSchema.safeParse(queryParams);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        message: 'Invalid query parameters',
        details: validation.error.format()
      },
      { status: 400 }
    );
  }

  const symbolList = validation.data.symbols.split(',');

  // First, check if backend is available before trusting cache
  // This prevents returning stale cached data when backend goes down
  let backendAvailable = false;
  try {
    const testResponse = await fetch(
      `${API_BASE_URL}/health`,
      {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2000), // 2 second timeout
      }
    );
    backendAvailable = testResponse.ok;
  } catch {
    backendAvailable = false;
  }

  // If backend is unavailable, return fresh mock data (don't trust stale cache)
  if (!backendAvailable) {
    console.warn('Backend unavailable, returning fresh mock quotes with realistic prices');
    return NextResponse.json({
      quotes: generateMockQuotes(symbolList),
      mock: true,
      warning: 'Using simulated data - backend unavailable'
    });
  }

  // Backend is available - now we can use cache safely
  const cachedQuotes: Record<string, QuoteData> = {};
  const uncachedSymbols: string[] = [];

  for (const symbol of symbolList) {
    const cacheKey = marketCacheKey('quote', { symbol });
    const cached = serverCache.get<QuoteData>(cacheKey);
    if (cached) {
      cachedQuotes[symbol] = cached;
    } else {
      uncachedSymbols.push(symbol);
    }
  }

  // If all symbols were cached and backend is available, return cached data
  if (uncachedSymbols.length === 0) {
    return NextResponse.json({
      quotes: cachedQuotes,
      mock: false,
      cached: true,
    });
  }

  try {
    // Fetch uncached symbols in parallel from backend
    const quotePromises = uncachedSymbols.map(async (symbol) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/quote/${encodeURIComponent(symbol)}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            // Use next.js revalidation for edge caching
            next: { revalidate: CACHE_TTL.QUOTES },
          }
        );

        if (!response.ok) {
          return { symbol, error: true };
        }

        const data = await response.json();
        return { symbol, data };
      } catch {
        return { symbol, error: true };
      }
    });

    const results = await Promise.all(quotePromises);

    // Build quotes object from results and cache them
    const quotes: Record<string, QuoteData> = { ...cachedQuotes };
    let hasRealData = Object.keys(cachedQuotes).length > 0;

    for (const result of results) {
      if (!result.error && result.data) {
        hasRealData = true;
        const quoteData: QuoteData = {
          symbol: result.symbol,
          last: result.data.price ?? result.data.last ?? result.data.close,
          open: result.data.open,
          high: result.data.high,
          low: result.data.low,
          close: result.data.close,
          volume: result.data.volume,
          change: result.data.change,
          changePercent: result.data.change_percent ?? result.data.changePercent,
          bid: result.data.bid,
          ask: result.data.ask,
          timestamp: result.data.timestamp || new Date().toISOString(),
        };
        quotes[result.symbol] = quoteData;

        // Cache individual quote
        const cacheKey = marketCacheKey('quote', { symbol: result.symbol });
        serverCache.set(cacheKey, quoteData, CACHE_TTL.QUOTES);
      }
    }

    if (hasRealData) {
      return NextResponse.json({ quotes, mock: false });
    }

    throw new Error('No real quotes available');
  } catch (error) {
    // Backend unavailable - return mock data so UI still works
    console.warn('Backend unavailable, returning mock quotes:', error);
    return NextResponse.json({
      quotes: generateMockQuotes(symbolList),
      mock: true,
      warning: 'Using simulated data - backend unavailable'
    });
  }
}
