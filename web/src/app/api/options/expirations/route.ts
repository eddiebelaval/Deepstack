import { NextRequest, NextResponse } from 'next/server';
import { ExpirationResponse } from '@/lib/types/options';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Generate mock expiration dates
function generateMockExpirations(symbol: string): ExpirationResponse {
  const expirations: string[] = [];
  const today = new Date();

  // Weekly expirations for next 8 weeks
  for (let w = 1; w <= 8; w++) {
    const friday = new Date(today);
    friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7) + (w - 1) * 7);
    if (friday > today) {
      expirations.push(friday.toISOString().split('T')[0]);
    }
  }

  // Monthly expirations (3rd Friday) for next 6 months
  for (let m = 0; m < 6; m++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
    // Find first Friday
    const firstFriday = new Date(monthDate);
    firstFriday.setDate(1 + ((5 - monthDate.getDay() + 7) % 7));
    // 3rd Friday is 2 weeks later
    const thirdFriday = new Date(firstFriday);
    thirdFriday.setDate(firstFriday.getDate() + 14);

    const expStr = thirdFriday.toISOString().split('T')[0];
    if (thirdFriday > today && !expirations.includes(expStr)) {
      expirations.push(expStr);
    }
  }

  // Sort chronologically
  expirations.sort();

  return {
    symbol: symbol.toUpperCase(),
    expirations,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/options/expirations/${symbol.toUpperCase()}`,
      {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn('Backend unavailable for expirations, returning mock data:', error);

    const mockExpirations = generateMockExpirations(symbol);
    return NextResponse.json({
      ...mockExpirations,
      mock: true,
      warning: 'Using simulated data - backend unavailable',
    });
  }
}
