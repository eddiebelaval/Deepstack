import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Generate mock bars data when backend is unavailable
function generateMockBars(symbol: string, limit: number) {
  const bars = [];
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 86400;
  let price = 150 + Math.random() * 100; // Random base price

  for (let i = limit; i > 0; i--) {
    const change = price * (Math.random() * 0.04 - 0.02);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    bars.push({
      time: now - i * dayInSeconds,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(1000000 + Math.random() * 9000000),
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
