import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';
import { getPerplexityClient } from '@/lib/perplexity/client';

// Mock earnings transcript data
const MOCK_TRANSCRIPTS: Record<string, object> = {
  'AAPL': {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    quarter: 'Q4 FY2024',
    date: '2024-10-31',
    keyTakeaways: [
      'Services revenue hit all-time high of $25 billion',
      'iPhone 16 demand "better than expected" in early weeks',
      'Apple Intelligence rolling out across devices',
      'China revenue stabilizing after multi-quarter decline',
    ],
    guidanceHighlights: [
      'Holiday quarter revenue expected to grow low-to-mid single digits',
      'Services growth to remain in double digits',
      'Gross margin expected at 46-47%',
    ],
    managementTone: 'optimistic',
    qaHighlights: [
      'CEO emphasized AI as "once in a generation opportunity"',
      'CFO noted Vision Pro gaining traction in enterprise',
      'Management confident in India manufacturing expansion',
    ],
  },
  'NVDA': {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    quarter: 'Q3 FY2025',
    date: '2024-11-20',
    keyTakeaways: [
      'Data Center revenue grew 112% YoY to $30.8 billion',
      'Blackwell demand is "incredible" - production ramping',
      'Sovereign AI emerging as major demand driver',
      'Gaming segment returned to growth',
    ],
    guidanceHighlights: [
      'Q4 revenue guidance of $37.5 billion (+/-2%)',
      'Gross margin expected at 73.5%',
      'Blackwell revenue to be "several billion" in Q4',
    ],
    managementTone: 'optimistic',
    qaHighlights: [
      'CEO: "Demand for Blackwell is insane"',
      'Supply constraints expected to ease by Q1 2025',
      'CUDA ecosystem moat continues to strengthen',
    ],
  },
};

export async function GET(request: NextRequest) {
  // Rate limiting: 20 requests per minute for earnings
  const rateLimit = checkRateLimit(request, { limit: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const quarter = searchParams.get('quarter');
    const query = searchParams.get('q');

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
        const result = await client.searchEarningsTranscripts({
          symbol,
          quarter: quarter || undefined,
          query: query || undefined,
        });

        return NextResponse.json({
          transcripts: [{
            symbol,
            quarter: quarter || 'Most Recent',
            content: result.content,
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
    const mockTranscript = MOCK_TRANSCRIPTS[symbol];

    return NextResponse.json({
      transcripts: mockTranscript ? [mockTranscript] : [{
        symbol,
        companyName: symbol,
        quarter: quarter || 'Latest',
        date: new Date().toISOString().split('T')[0],
        keyTakeaways: ['Configure PERPLEXITY_API_KEY for live earnings transcript search'],
        guidanceHighlights: [],
        managementTone: 'neutral',
        qaHighlights: [],
      }],
      symbol,
      query,
      count: mockTranscript ? 1 : 0,
      mock: true,
      note: 'Using mock data. Configure PERPLEXITY_API_KEY for live results.',
    });
  } catch (error) {
    console.error('Earnings search error:', error);
    return NextResponse.json(
      { error: 'Failed to search earnings transcripts' },
      { status: 500 }
    );
  }
}
