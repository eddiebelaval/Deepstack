import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';
import { getPerplexityClient } from '@/lib/perplexity/client';

// Mock screener results
function generateMockScreenerResults(query: string, limit: number) {
  const lowerQuery = query.toLowerCase();
  const mockStocks = [
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'Technology', price: 142, marketCap: 3.5e12, pe: 65, revenueGrowth: 94 },
    { symbol: 'AAPL', name: 'Apple', sector: 'Technology', price: 238, marketCap: 3.6e12, pe: 32, revenueGrowth: 2 },
    { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', price: 432, marketCap: 3.2e12, pe: 38, revenueGrowth: 16 },
    { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology', price: 175, marketCap: 2.1e12, pe: 24, revenueGrowth: 14 },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', price: 580, marketCap: 1.5e12, pe: 27, revenueGrowth: 23 },
    { symbol: 'AMD', name: 'AMD', sector: 'Technology', price: 140, marketCap: 227e9, pe: 48, revenueGrowth: 18 },
  ];

  let filtered = [...mockStocks];

  if (lowerQuery.includes('tech')) {
    filtered = filtered.filter(s => s.sector === 'Technology');
  }
  if (lowerQuery.includes('p/e') || lowerQuery.includes('pe')) {
    const peMatch = lowerQuery.match(/p\/e\s*(under|below|<)\s*(\d+)/i) || lowerQuery.match(/pe\s*(under|below|<)\s*(\d+)/i);
    if (peMatch) {
      const maxPE = parseInt(peMatch[2]);
      filtered = filtered.filter(s => s.pe < maxPE);
    }
  }
  if (lowerQuery.includes('growth') || lowerQuery.includes('growing')) {
    const growthMatch = lowerQuery.match(/(\d+)%/);
    if (growthMatch) {
      const minGrowth = parseInt(growthMatch[1]);
      filtered = filtered.filter(s => s.revenueGrowth >= minGrowth);
    }
  }

  return filtered.slice(0, limit).map(s => ({
    symbol: s.symbol,
    companyName: s.name,
    price: s.price,
    marketCap: s.marketCap,
    sector: s.sector,
    matchReason: `Matches criteria: ${query}`,
    metrics: {
      'P/E Ratio': s.pe,
      'Revenue Growth': `${s.revenueGrowth}%`,
      'Market Cap': formatMarketCap(s.marketCap),
    },
  }));
}

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  return `$${cap}`;
}

export async function POST(request: NextRequest) {
  // Rate limiting: 15 requests per minute for NL screener (more expensive)
  const rateLimit = checkRateLimit(request, { limit: 15, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Try Perplexity API first
    const client = getPerplexityClient();

    if (client.isConfigured()) {
      try {
        const result = await client.naturalLanguageScreen({
          query,
          limit,
        });

        return NextResponse.json({
          results: result.content,
          query,
          interpretation: `AI-powered search for: ${query}`,
          citations: result.citations,
          mock: result.mock,
        });
      } catch (error) {
        console.warn('Perplexity API failed, falling back to mock data:', error);
      }
    }

    // Fallback to mock data
    const mockResults = generateMockScreenerResults(query, limit);

    return NextResponse.json({
      results: mockResults,
      query,
      interpretation: `Searching for: ${query}`,
      count: mockResults.length,
      mock: true,
      note: 'Using mock data. Configure PERPLEXITY_API_KEY for AI-powered screening.',
    });
  } catch (error) {
    console.error('Screener error:', error);
    return NextResponse.json(
      { error: 'Failed to run natural language screen' },
      { status: 500 }
    );
  }
}
