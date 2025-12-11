import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
function generateMockQuotes(symbols: string[]): Record<string, object> {
  const mockPrices: Record<string, number> = {
    // Market Indices ETFs
    SPY: 595.42, QQQ: 518.73, DIA: 437.21, IWM: 225.89, VIX: 13.45,
    // Tech stocks
    NVDA: 142.56, AAPL: 237.84, TSLA: 352.67, AMD: 138.92, MSFT: 432.15,
    GOOGL: 175.50, META: 580.00, AMZN: 210.00,
    // Crypto (Alpaca format with slash)
    'BTC/USD': 98500, 'ETH/USD': 3800, 'SOL/USD': 225,
    'DOGE/USD': 0.42, 'XRP/USD': 2.45,
  };

  const quotes: Record<string, object> = {};
  for (const symbol of symbols) {
    const basePrice = mockPrices[symbol] || 100 + Math.random() * 400;
    const change = (Math.random() - 0.5) * 4;
    const changePercent = (change / basePrice) * 100;

    quotes[symbol] = {
      symbol,
      last: basePrice,
      open: basePrice - change * 0.5,
      high: basePrice + Math.abs(change) * 0.3,
      low: basePrice - Math.abs(change) * 0.3,
      close: basePrice,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      change: change,
      changePercent: changePercent,
      bid: basePrice - 0.01,
      ask: basePrice + 0.01,
      timestamp: new Date().toISOString(),
    };
  }
  return quotes;
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

  try {
    // Backend uses /quote/{symbol} endpoint for individual quotes
    // Fetch all symbols in parallel
    const quotePromises = symbolList.map(async (symbol) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/quote/${encodeURIComponent(symbol)}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
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

    // Build quotes object from results
    const quotes: Record<string, object> = {};
    let hasRealData = false;

    for (const result of results) {
      if (!result.error && result.data) {
        hasRealData = true;
        quotes[result.symbol] = {
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
