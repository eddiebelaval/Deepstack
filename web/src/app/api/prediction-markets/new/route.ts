import { NextRequest, NextResponse } from 'next/server';
import { transformMarket } from '@/lib/utils/prediction-market-transform';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '20';
  const offset = searchParams.get('offset') || '0';
  const category = searchParams.get('category');
  const source = searchParams.get('source');

  try {
    const params = new URLSearchParams({ limit, offset });
    if (category) params.append('category', category);
    if (source && source !== 'all') params.append('source', source);

    const response = await fetch(`${BACKEND_URL}/api/predictions/new?${params}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    // Transform snake_case from Python backend to camelCase for frontend
    const transformedMarkets = (data.markets || []).map(transformMarket);

    return NextResponse.json({
      markets: transformedMarkets,
      count: data.count,
    });
  } catch (error) {
    console.error('New prediction markets fetch error:', error);

    // Return error response - no mock data
    return NextResponse.json(
      {
        error: 'Unable to fetch new markets',
        message: 'The prediction markets service is currently unavailable. Please try again later.',
        unavailable: true,
      },
      { status: 503 }
    );
  }
}
