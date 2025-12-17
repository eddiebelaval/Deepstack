import { NextRequest, NextResponse } from 'next/server';

/**
 * Symbol-specific Politicians Trading API
 *
 * GET /api/politicians/trades/[symbol] - Get congressional trades for a specific stock
 *
 * This is a convenience endpoint that filters trades by symbol.
 */

// Redirect to main endpoint with symbol filter
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params;

  // Forward to main endpoint with symbol filter
  const url = new URL('/api/politicians/trades', request.url);
  url.searchParams.set('symbol', symbol.toUpperCase());

  // Copy other params
  const { searchParams } = new URL(request.url);
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'symbol') {
      url.searchParams.set(key, value);
    }
  }

  // Fetch from main endpoint
  const response = await fetch(url.toString());
  const data = await response.json();

  return NextResponse.json(data);
}
