import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverCache, CACHE_TTL, marketCacheKey } from '@/lib/cache';
import { fetchAlpacaQuotesBatch } from '@/lib/alpaca-client';

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

/**
 * Data Source Hierarchy for Quotes:
 * 1. Memory cache (fastest, short TTL for real-time data)
 * 2. Python backend (preferred live source)
 * 3. Direct Alpaca API (fallback when backend down)
 *
 * We NEVER generate mock data. If all sources fail, we return an error.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    symbols: searchParams.get('symbols'),
  };

  // Validate query parameters
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

  // Check cache first
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

  // If all symbols were cached, return immediately
  if (uncachedSymbols.length === 0) {
    return NextResponse.json({
      quotes: cachedQuotes,
      mock: false,
      source: 'cache',
    });
  }

  // Try to fetch uncached symbols
  const quotes: Record<string, QuoteData> = { ...cachedQuotes };
  const failedSymbols: string[] = [];

  // 1. Try Python backend first
  const backendResults = await Promise.all(
    uncachedSymbols.map(async (symbol) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/quote/${encodeURIComponent(symbol)}`,
          {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
            next: { revalidate: CACHE_TTL.QUOTES },
          }
        );

        if (!response.ok) {
          return { symbol, error: true };
        }

        const data = await response.json();
        return { symbol, data, source: 'backend' };
      } catch {
        return { symbol, error: true };
      }
    })
  );

  // Process backend results
  const stillUncached: string[] = [];
  for (const result of backendResults) {
    if (result.error || !result.data) {
      stillUncached.push(result.symbol);
    } else {
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

      // Cache the quote
      const cacheKey = marketCacheKey('quote', { symbol: result.symbol });
      serverCache.set(cacheKey, quoteData, CACHE_TTL.QUOTES);
    }
  }

  // 2. If backend failed for some symbols, try direct Alpaca (BATCH request)
  // This makes at most 2 API calls (stocks + crypto) instead of N individual calls
  if (stillUncached.length > 0) {
    try {
      const batchQuotes = await fetchAlpacaQuotesBatch(stillUncached);

      for (const symbol of stillUncached) {
        const quote = batchQuotes[symbol];
        if (quote) {
          const quoteData: QuoteData = {
            symbol,
            last: quote.last,
            bid: quote.bid,
            ask: quote.ask,
            timestamp: quote.timestamp,
          };
          quotes[symbol] = quoteData;

          // Cache the quote
          const cacheKey = marketCacheKey('quote', { symbol });
          serverCache.set(cacheKey, quoteData, CACHE_TTL.QUOTES);
        } else {
          failedSymbols.push(symbol);
        }
      }
    } catch (error) {
      console.error('Error fetching batch quotes from Alpaca:', error);
      // Mark all as failed if batch request fails
      failedSymbols.push(...stillUncached);
    }
  }

  // Return results
  const hasAnyData = Object.keys(quotes).length > 0;

  if (hasAnyData) {
    const response: {
      quotes: Record<string, QuoteData>;
      mock: boolean;
      source: string;
      warning?: string;
      failedSymbols?: string[];
    } = {
      quotes,
      mock: false,
      source: 'mixed',
    };

    // Add warning if some symbols failed
    if (failedSymbols.length > 0) {
      response.warning = `Could not fetch quotes for: ${failedSymbols.join(', ')}`;
      response.failedSymbols = failedSymbols;
    }

    return NextResponse.json(response);
  }

  // All sources failed - return error (NEVER mock data)
  return NextResponse.json(
    {
      error: 'DATA_UNAVAILABLE',
      message: 'Quote data unavailable. All data sources failed.',
      details: {
        symbols: symbolList,
        suggestion: 'Please try again later or check if the symbols are valid.',
      }
    },
    { status: 503 }
  );
}
