import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';
import { getPerplexityClient } from '@/lib/perplexity/client';

// Mock market summary for development
const MOCK_MARKET_SUMMARY = {
  timestamp: new Date().toISOString(),
  overview: 'US equities are mixed as investors digest economic data ahead of the Fed meeting. Tech stocks are leading while energy lags on oil weakness. Treasury yields are stable around 4.25%.',
  sectors: [
    { name: 'Technology', performance: '+0.8%', sentiment: 'bullish', keyDrivers: ['AI optimism', 'Strong earnings', 'Rate cut expectations'] },
    { name: 'Healthcare', performance: '+0.3%', sentiment: 'neutral', keyDrivers: ['M&A activity', 'Drug approvals'] },
    { name: 'Energy', performance: '-1.2%', sentiment: 'bearish', keyDrivers: ['Oil price weakness', 'Oversupply concerns'] },
    { name: 'Financials', performance: '+0.2%', sentiment: 'neutral', keyDrivers: ['Stable rates', 'Credit quality'] },
  ],
  topMovers: [
    { symbol: 'NVDA', name: 'NVIDIA', change: 3.2, reason: 'Analyst upgrade on AI demand outlook' },
    { symbol: 'TSLA', name: 'Tesla', change: -2.1, reason: 'Margin pressure concerns' },
    { symbol: 'META', name: 'Meta Platforms', change: 1.8, reason: 'Ad revenue beat expectations' },
  ],
  risks: [
    'Fed policy uncertainty remains elevated',
    'Geopolitical tensions',
    'China economic slowdown',
  ],
  opportunities: [
    'AI infrastructure buildout accelerating',
    'Interest rate cuts expected in 2025',
    'Consumer spending remains resilient',
  ],
  sources: ['Federal Reserve', 'Bureau of Labor Statistics', 'Company earnings'],
};

// Shared handler logic
async function handleMarketSummary(focus?: string[], symbols?: string[]) {
  // Try Perplexity API first
  const client = getPerplexityClient();

  if (client.isConfigured()) {
    try {
      const result = await client.getMarketSummary({ focus, symbols });

      return NextResponse.json({
        content: result.content,
        citations: result.citations,
        focus,
        symbols,
        mock: result.mock,
      });
    } catch (error) {
      console.warn('Perplexity API failed, falling back to mock data:', error);
    }
  }

  // Fallback to mock data
  return NextResponse.json({
    content: MOCK_MARKET_SUMMARY.overview,
    citations: [],
    sectors: MOCK_MARKET_SUMMARY.sectors,
    mock: true,
    note: 'Using mock data. Configure PERPLEXITY_API_KEY for live market intelligence.',
  });
}

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute for market summary (encourage frequent use)
  const rateLimit = checkRateLimit(request, { limit: 30, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const { searchParams } = new URL(request.url);
    const focusParam = searchParams.get('focus');
    const symbolsParam = searchParams.get('symbols');

    const focus = focusParam ? focusParam.split(',') : undefined;
    const symbols = symbolsParam ? symbolsParam.split(',').map(s => s.toUpperCase()) : undefined;

    return handleMarketSummary(focus, symbols);
  } catch (error) {
    console.error('Market summary error:', error);
    return NextResponse.json(
      { error: 'Failed to generate market summary' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute for market summary
  const rateLimit = checkRateLimit(request, { limit: 30, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const body = await request.json();
    const { topics, focus, symbols } = body;

    // Support both 'topics' (from store) and 'focus' (for compatibility)
    const focusAreas = topics || focus;

    return handleMarketSummary(focusAreas, symbols);
  } catch (error) {
    console.error('Market summary error:', error);
    return NextResponse.json(
      { error: 'Failed to generate market summary' },
      { status: 500 }
    );
  }
}
