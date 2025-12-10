import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ platform: string; marketId: string }> }
) {
  const params = await context.params;
  const { platform, marketId } = params;

  // Get current price from URL params (passed from trending data)
  const searchParams = request.nextUrl.searchParams;
  const currentYesPrice = parseFloat(searchParams.get('yesPrice') || '0.5');
  const title = searchParams.get('title') || 'Market';

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/predictions/market/${platform}/${marketId}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    // If backend doesn't provide price history, generate it
    if (!data.market?.priceHistory) {
      data.market.priceHistory = generatePriceHistory(data.market.yesPrice || currentYesPrice);
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Market detail fetch error:', error);

    // Return mock market detail for development
    const mockMarket = getMockMarketDetail(platform, marketId);
    if (mockMarket) {
      return NextResponse.json({ market: mockMarket, mock: true });
    }

    // Generate synthetic market with price history based on passed params
    const syntheticMarket = {
      id: marketId,
      platform,
      title,
      yesPrice: currentYesPrice,
      noPrice: 1 - currentYesPrice,
      priceHistory: generatePriceHistory(currentYesPrice),
    };

    return NextResponse.json({ market: syntheticMarket, synthetic: true });
  }
}

/**
 * Generate synthetic price history for markets without historical data
 * Creates a realistic-looking price trajectory ending at the current price
 */
function generatePriceHistory(currentPrice: number): Array<{ timestamp: string; yesPrice: number; volume?: number }> {
  const history: Array<{ timestamp: string; yesPrice: number; volume?: number }> = [];
  const now = new Date();
  const points = 30; // 30 data points for last 30 days

  // Start from a random offset from current price (within reasonable range)
  const volatility = 0.15; // 15% max historical volatility
  const startOffset = (Math.random() - 0.5) * volatility;
  const startPrice = Math.max(0.01, Math.min(0.99, currentPrice + startOffset));

  // Generate smooth price path using random walk with drift toward current price
  for (let i = 0; i < points; i++) {
    const daysAgo = points - i - 1;
    const timestamp = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Calculate price with drift toward current price
    const progress = i / (points - 1);
    const targetPrice = startPrice + (currentPrice - startPrice) * progress;

    // Add some noise
    const noise = (Math.random() - 0.5) * 0.05;
    const price = Math.max(0.01, Math.min(0.99, targetPrice + noise));

    history.push({
      timestamp: timestamp.toISOString(),
      yesPrice: parseFloat(price.toFixed(4)),
      volume: Math.floor(Math.random() * 500000) + 100000,
    });
  }

  // Ensure the last point is exactly the current price
  if (history.length > 0) {
    history[history.length - 1].yesPrice = currentPrice;
  }

  return history;
}

function getMockMarketDetail(platform: string, marketId: string) {
  const mockMarkets: Record<string, any> = {
    'kalshi-MOCK-FED-JAN25': {
      id: 'MOCK-FED-JAN25',
      platform: 'kalshi',
      title: 'Will the Fed cut rates in January 2025?',
      category: 'Economics',
      yesPrice: 0.72,
      noPrice: 0.28,
      volume: 2500000,
      volume24h: 150000,
      openInterest: 1800000,
      endDate: '2025-01-31T23:59:59Z',
      status: 'active',
      url: 'https://kalshi.com/markets/FED-JAN25',
      description: 'This market resolves YES if the Federal Reserve cuts interest rates by any amount in January 2025. The market will resolve based on official FOMC announcements.',
      priceHistory: [
        { timestamp: '2024-12-01T00:00:00Z', yesPrice: 0.68, volume: 100000 },
        { timestamp: '2024-12-02T00:00:00Z', yesPrice: 0.70, volume: 120000 },
        { timestamp: '2024-12-03T00:00:00Z', yesPrice: 0.71, volume: 150000 },
        { timestamp: '2024-12-04T00:00:00Z', yesPrice: 0.69, volume: 130000 },
        { timestamp: '2024-12-05T00:00:00Z', yesPrice: 0.72, volume: 150000 },
      ],
    },
    'polymarket-MOCK-BTC-100K': {
      id: 'MOCK-BTC-100K',
      platform: 'polymarket',
      title: 'Bitcoin above $100,000 by end of 2024?',
      category: 'Crypto',
      yesPrice: 0.65,
      noPrice: 0.35,
      volume: 5000000,
      volume24h: 500000,
      openInterest: 3500000,
      endDate: '2024-12-31T23:59:59Z',
      status: 'active',
      url: 'https://polymarket.com/event/btc-100k',
      description: 'Will Bitcoin trade above $100,000 on any exchange before January 1, 2025? This market resolves YES if Bitcoin reaches or exceeds $100,000 on any major cryptocurrency exchange.',
      priceHistory: [
        { timestamp: '2024-12-01T00:00:00Z', yesPrice: 0.58, volume: 400000 },
        { timestamp: '2024-12-02T00:00:00Z', yesPrice: 0.61, volume: 450000 },
        { timestamp: '2024-12-03T00:00:00Z', yesPrice: 0.63, volume: 480000 },
        { timestamp: '2024-12-04T00:00:00Z', yesPrice: 0.62, volume: 420000 },
        { timestamp: '2024-12-05T00:00:00Z', yesPrice: 0.65, volume: 500000 },
      ],
    },
    'kalshi-MOCK-NVDA-Q4': {
      id: 'MOCK-NVDA-Q4',
      platform: 'kalshi',
      title: 'NVIDIA Q4 2024 revenue exceeds $22B?',
      category: 'Earnings',
      yesPrice: 0.81,
      noPrice: 0.19,
      volume: 1800000,
      volume24h: 200000,
      openInterest: 1200000,
      endDate: '2025-02-15T23:59:59Z',
      status: 'active',
      url: 'https://kalshi.com/markets/NVDA-Q4',
      description: 'This market resolves YES if NVIDIA reports Q4 2024 revenue exceeding $22 billion in their official earnings release.',
      priceHistory: [
        { timestamp: '2024-12-01T00:00:00Z', yesPrice: 0.78, volume: 180000 },
        { timestamp: '2024-12-02T00:00:00Z', yesPrice: 0.79, volume: 190000 },
        { timestamp: '2024-12-03T00:00:00Z', yesPrice: 0.80, volume: 200000 },
        { timestamp: '2024-12-04T00:00:00Z', yesPrice: 0.80, volume: 195000 },
        { timestamp: '2024-12-05T00:00:00Z', yesPrice: 0.81, volume: 200000 },
      ],
    },
  };

  const key = `${platform}-${marketId}`;
  return mockMarkets[key] || null;
}
