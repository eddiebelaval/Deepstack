import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Realistic base prices for common symbols (as of late 2024)
const SYMBOL_PRICES: Record<string, number> = {
  // Market Indices ETFs
  SPY: 595, QQQ: 520, DIA: 440, IWM: 225, VIX: 14,
  // Crypto
  'BTC/USD': 98500, 'ETH/USD': 3800, 'DOGE/USD': 0.42, 'XRP/USD': 2.45,
  // Tech
  NVDA: 142, AAPL: 238, TSLA: 355, AMD: 140, MSFT: 432, GOOGL: 175, META: 580, AMZN: 210,
};

// Generate mock bars data when backend is unavailable
function generateMockBars(symbol: string, limit: number) {
  const bars = [];
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 86400;

  // Use realistic price for known symbols, otherwise random
  let price = SYMBOL_PRICES[symbol.toUpperCase()] || (150 + Math.random() * 100);

  for (let i = limit; i > 0; i--) {
    const change = price * (Math.random() * 0.04 - 0.02);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    bars.push({
      t: new Date((now - i * dayInSeconds) * 1000).toISOString(),
      o: Math.round(open * 100) / 100,
      h: Math.round(high * 100) / 100,
      l: Math.round(low * 100) / 100,
      c: Math.round(close * 100) / 100,
      v: Math.floor(1000000 + Math.random() * 9000000),
    });

    price = close;
  }

  return bars;
}


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe') || '1d';
  const limit = searchParams.get('limit') || '100';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    // Call the Python backend to get historical bars
    const response = await fetch(
      `${API_BASE_URL}/api/market/bars?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`,
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
    console.warn('Backend unavailable for bars, returning mock data:', error);

    // Generate mock bars data
    const mockBars = generateMockBars(symbol, parseInt(limit));

    return NextResponse.json({
      bars: mockBars,
      mock: true,
      warning: 'Using simulated data - backend unavailable'
    });
  }
}
