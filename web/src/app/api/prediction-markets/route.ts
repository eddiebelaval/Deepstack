import { NextRequest, NextResponse } from 'next/server';
import { transformMarket } from '@/lib/utils/prediction-market-transform';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '20';
  const category = searchParams.get('category');
  const source = searchParams.get('source');

  try {
    const params = new URLSearchParams({ limit });
    if (category) params.append('category', category);
    if (source && source !== 'all') params.append('source', source);

    const response = await fetch(`${BACKEND_URL}/api/predictions/trending?${params}`, {
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
    console.error('Prediction markets fetch error:', error);

    // Return mock data for development
    return NextResponse.json({
      markets: getMockMarkets(),
      mock: true,
    });
  }
}

function getMockMarkets() {
  return [
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
      description: 'This market resolves YES if the Federal Reserve cuts interest rates by any amount in January 2025.',
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
      description: 'Will Bitcoin trade above $100,000 on any exchange before January 1, 2025?',
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
      description: 'This market resolves YES if NVIDIA reports Q4 2024 revenue exceeding $22 billion.',
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
      description: 'Will Tesla deliver more than 500,000 vehicles in Q4 2024?',
    },
    {
      id: 'MOCK-INFLATION-DEC',
      platform: 'kalshi',
      title: 'December 2024 CPI below 3.0%?',
      category: 'Economics',
      yesPrice: 0.45,
      noPrice: 0.55,
      volume: 1500000,
      volume24h: 120000,
      status: 'active',
      url: 'https://kalshi.com/markets/CPI-DEC24',
      description: 'This market resolves YES if the December 2024 CPI year-over-year change is below 3.0%.',
    },
    {
      id: 'MOCK-SPY-500',
      platform: 'polymarket',
      title: 'SPY closes above $500 in December 2024?',
      category: 'Stocks',
      yesPrice: 0.88,
      noPrice: 0.12,
      volume: 4500000,
      volume24h: 350000,
      status: 'active',
      url: 'https://polymarket.com/event/spy-500',
      description: 'Will SPY close above $500 on any trading day in December 2024?',
    },
    {
      id: 'MOCK-OIL-80',
      platform: 'kalshi',
      title: 'Crude oil above $80 by end of Q1 2025?',
      category: 'Commodities',
      yesPrice: 0.52,
      noPrice: 0.48,
      volume: 980000,
      volume24h: 85000,
      status: 'active',
      url: 'https://kalshi.com/markets/OIL-Q125',
      description: 'Will WTI crude oil trade above $80/barrel before April 1, 2025?',
    },
    {
      id: 'MOCK-AAPL-3T',
      platform: 'polymarket',
      title: 'Apple reaches $3T market cap in 2025?',
      category: 'Stocks',
      yesPrice: 0.73,
      noPrice: 0.27,
      volume: 2800000,
      volume24h: 240000,
      status: 'active',
      url: 'https://polymarket.com/event/aapl-3t',
      description: 'Will Apple\'s market capitalization exceed $3 trillion at any point in 2025?',
    },
  ];
}
