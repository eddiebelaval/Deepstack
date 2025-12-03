import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Generate mock quote data when backend is unavailable
function generateMockQuotes(symbols: string[]): Record<string, object> {
  const mockPrices: Record<string, number> = {
    SPY: 595.42, QQQ: 518.73, DIA: 437.21, IWM: 225.89, VIX: 13.45,
    NVDA: 142.56, AAPL: 237.84, TSLA: 352.67, AMD: 138.92, MSFT: 432.15,
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
  const symbols = searchParams.get('symbols');

  if (!symbols) {
    return NextResponse.json(
      { error: 'Symbols parameter is required' },
      { status: 400 }
    );
  }

  const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());

  try {
    // Call the Python backend to get quotes
    const response = await fetch(
      `${API_BASE_URL}/api/market/quotes?symbols=${symbols}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        // Don't cache market data
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
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
