import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';
import { getPerplexityClient } from '@/lib/perplexity/client';

// Mock SEC filing data for development
const MOCK_SEC_FILINGS = [
  {
    id: 'aapl-10k-2024',
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    filingType: '10-K',
    filingDate: '2024-11-01',
    periodOfReport: '2024-09-28',
    summary: 'Apple reported record services revenue of $96.2 billion for FY2024, while iPhone revenue remained flat YoY. Gross margin improved to 46.2% driven by services mix shift.',
    keyPoints: [
      'Total revenue: $383.3 billion (+2% YoY)',
      'Services segment: $96.2 billion (+14% YoY)',
      'iPhone revenue: $200.6 billion (flat)',
      'Gross margin: 46.2% (up from 44.1%)',
      'R&D spending increased 8% to $29.9 billion',
    ],
    edgarUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=10-K',
  },
  {
    id: 'nvda-10q-2024',
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    filingType: '10-Q',
    filingDate: '2024-11-20',
    periodOfReport: '2024-10-27',
    summary: 'NVIDIA reported Q3 FY2025 revenue of $35.1 billion, up 94% YoY, driven by Data Center segment growth of 112%.',
    keyPoints: [
      'Revenue: $35.1 billion (+94% YoY)',
      'Data Center: $30.8 billion (+112% YoY)',
      'Gross margin: 74.6%',
      'Blackwell architecture shipments began',
    ],
    edgarUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=10-Q',
  },
];

export async function GET(request: NextRequest) {
  // Rate limiting: 20 requests per minute for SEC search
  const rateLimit = checkRateLimit(request, { limit: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const filingType = searchParams.get('type') || 'all';
    const query = searchParams.get('q');
    const dateAfter = searchParams.get('after');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Try Perplexity API first
    const client = getPerplexityClient();

    if (client.isConfigured()) {
      try {
        const result = await client.searchSECFilings({
          symbol,
          filingType: filingType !== 'all' ? filingType : undefined,
          query: query || undefined,
          dateAfter: dateAfter || undefined,
        });

        // Parse the content into structured data
        // For now, return the raw analysis with metadata
        return NextResponse.json({
          filings: [{
            id: `${symbol}-${filingType}-${Date.now()}`,
            symbol,
            filingType,
            summary: result.content,
            citations: result.citations,
          }],
          symbol,
          query,
          count: 1,
          mock: result.mock,
        });
      } catch (error) {
        console.warn('Perplexity API failed, falling back to mock data:', error);
      }
    }

    // Fallback to mock data
    const mockFilings = MOCK_SEC_FILINGS.filter(f =>
      f.symbol === symbol &&
      (filingType === 'all' || f.filingType === filingType)
    );

    return NextResponse.json({
      filings: mockFilings.length > 0 ? mockFilings : [{
        id: `${symbol}-mock`,
        symbol,
        companyName: symbol,
        filingType: filingType === 'all' ? '10-K' : filingType,
        filingDate: new Date().toISOString().split('T')[0],
        summary: `SEC filings for ${symbol} would appear here with Perplexity API integration.`,
        keyPoints: ['Configure PERPLEXITY_API_KEY for live SEC filing search'],
        edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${symbol}`,
      }],
      symbol,
      query,
      count: mockFilings.length || 1,
      mock: true,
      note: 'Using mock data. Configure PERPLEXITY_API_KEY for live results.',
    });
  } catch (error) {
    console.error('SEC search error:', error);
    return NextResponse.json(
      { error: 'Failed to search SEC filings' },
      { status: 500 }
    );
  }
}
