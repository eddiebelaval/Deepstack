import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbols = searchParams.get('symbols');

  if (!symbols) {
    return NextResponse.json(
      { error: 'Symbols parameter is required' },
      { status: 400 }
    );
  }

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
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
