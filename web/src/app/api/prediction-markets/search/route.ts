import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/predictions/search?q=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Prediction markets search error:', error);

    // Return mock search results for development
    return NextResponse.json({
      markets: getMockSearchResults(query),
      mock: true,
      query
    });
  }
}

function getMockSearchResults(query: string) {
  const allMarkets = [
    {
      id: 'MOCK-FED-JAN25',
      platform: 'kalshi',
      title: 'Will the Fed cut rates in January 2025?',
      category: 'Economics',
      yesPrice: 0.72,
      noPrice: 0.28,
      volume: 2500000,
      volume24h: 150000,
      status: 'active',
      url: 'https://kalshi.com/markets/FED-JAN25',
    },
    {
      id: 'MOCK-BTC-100K',
      platform: 'polymarket',
      title: 'Bitcoin above $100,000 by end of 2024?',
      category: 'Crypto',
      yesPrice: 0.65,
      noPrice: 0.35,
      volume: 5000000,
      volume24h: 500000,
      status: 'active',
      url: 'https://polymarket.com/event/btc-100k',
    },
    {
      id: 'MOCK-NVDA-Q4',
      platform: 'kalshi',
      title: 'NVIDIA Q4 2024 revenue exceeds $22B?',
      category: 'Earnings',
      yesPrice: 0.81,
      noPrice: 0.19,
      volume: 1800000,
      volume24h: 200000,
      status: 'active',
      url: 'https://kalshi.com/markets/NVDA-Q4',
    },
    {
      id: 'MOCK-TSLA-DELIVERY',
      platform: 'polymarket',
      title: 'Tesla Q4 deliveries over 500K vehicles?',
      category: 'Stocks',
      yesPrice: 0.58,
      noPrice: 0.42,
      volume: 3200000,
      volume24h: 280000,
      status: 'active',
      url: 'https://polymarket.com/event/tsla-delivery',
    },
  ];

  // Simple mock search: filter by query in title
  const lowerQuery = query.toLowerCase();
  return allMarkets.filter((market) =>
    market.title.toLowerCase().includes(lowerQuery) ||
    market.category.toLowerCase().includes(lowerQuery)
  );
}
