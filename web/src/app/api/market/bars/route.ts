import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
    console.error('Error fetching bars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
