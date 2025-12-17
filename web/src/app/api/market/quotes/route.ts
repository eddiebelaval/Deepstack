import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverCache, CACHE_TTL, marketCacheKey } from '@/lib/cache';
import { fetchAlpacaQuotesBatch, fetchAlpacaBars } from '@/lib/alpaca-client';

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

  // 1. Try Python backend BATCH endpoint (single request for all symbols)
  let stillUncached: string[] = [...uncachedSymbols];

  try {
    const symbolsParam = uncachedSymbols.join(',');
    const response = await fetch(
      `${API_BASE_URL}/api/market/quotes?symbols=${encodeURIComponent(symbolsParam)}`,
      {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        next: { revalidate: CACHE_TTL.QUOTES },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const backendQuotes = data.quotes || {};

      // Process batch results
      for (const symbol of uncachedSymbols) {
        const quote = backendQuotes[symbol];
        if (quote) {
          const quoteData: QuoteData = {
            symbol,
            last: quote.last,
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            volume: quote.volume,
            change: quote.change,
            changePercent: quote.changePercent,
            bid: quote.bid,
            ask: quote.ask,
            timestamp: quote.timestamp || new Date().toISOString(),
          };
          quotes[symbol] = quoteData;

          // Cache the quote
          const cacheKey = marketCacheKey('quote', { symbol });
          serverCache.set(cacheKey, quoteData, CACHE_TTL.QUOTES);

          // Remove from uncached list
          stillUncached = stillUncached.filter(s => s !== symbol);
        }
      }
    } else {
      console.warn(`Backend batch quotes failed (${response.status}), falling back to Alpaca`);
    }
  } catch (error) {
    console.error('Error fetching batch quotes from backend:', error);
    // Continue to Alpaca fallback
  }

  // 2. If backend failed for some symbols, try direct Alpaca (BATCH request)
  // This makes at most 2 API calls (stocks + crypto) instead of N individual calls
  const symbolsNeedingBarsFallback: string[] = [];

  if (stillUncached.length > 0) {
    try {
      const batchQuotes = await fetchAlpacaQuotesBatch(stillUncached);

      for (const symbol of stillUncached) {
        const quote = batchQuotes[symbol];
        if (quote && quote.last && quote.last > 0) {
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
          // Quote returned $0 or no data - need to try bars fallback
          // This is common for symbols like SPY/MSFT on IEX feed
          symbolsNeedingBarsFallback.push(symbol);
        }
      }
    } catch (error) {
      console.error('Error fetching batch quotes from Alpaca:', error);
      // Mark all as needing bars fallback
      symbolsNeedingBarsFallback.push(...stillUncached);
    }
  }

  // 3. Fallback: For symbols with $0 quotes, fetch last bar's close price
  // This handles IEX feed limitations where some symbols (SPY, MSFT) have no quote data
  if (symbolsNeedingBarsFallback.length > 0) {
    // Fetch bars in parallel for all symbols needing fallback
    const barsPromises = symbolsNeedingBarsFallback.map(async (symbol) => {
      try {
        const bars = await fetchAlpacaBars(symbol, '1d', 1);
        if (bars && bars.length > 0) {
          const lastBar = bars[bars.length - 1];
          const quoteData: QuoteData = {
            symbol,
            last: lastBar.c, // Use close price
            open: lastBar.o,
            high: lastBar.h,
            low: lastBar.l,
            close: lastBar.c,
            volume: lastBar.v,
            timestamp: lastBar.t,
          };
          return { symbol, quoteData };
        }
        return { symbol, quoteData: null };
      } catch (error) {
        console.warn(`Failed to fetch bars fallback for ${symbol}:`, error);
        return { symbol, quoteData: null };
      }
    });

    const barsResults = await Promise.all(barsPromises);

    for (const result of barsResults) {
      if (result.quoteData) {
        quotes[result.symbol] = result.quoteData;

        // Cache the quote
        const cacheKey = marketCacheKey('quote', { symbol: result.symbol });
        serverCache.set(cacheKey, result.quoteData, CACHE_TTL.QUOTES);
      } else {
        failedSymbols.push(result.symbol);
      }
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
