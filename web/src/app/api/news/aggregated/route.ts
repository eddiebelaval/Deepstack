import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Extended types for aggregated news
interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  source_provider?: string;
  publishedAt: string;
  symbols: string[];
  sentiment?: string;
  sentiment_score?: number;
  imageUrl?: string;
  author?: string;
  engagement?: {
    likes?: number;
    comments?: number;
  };
}

// Mock news articles as fallback
const MOCK_ARTICLES: NewsArticle[] = [
  {
    id: 'mock-1',
    headline: 'Fed Signals Potential Rate Cuts as Inflation Cools',
    summary: 'Federal Reserve officials indicated they may begin cutting interest rates as inflation continues to moderate toward their 2% target.',
    url: 'https://example.com/fed-rates',
    source: 'MarketWatch',
    source_provider: 'rss',
    publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    symbols: ['SPY', 'TLT', 'GLD'],
    sentiment: 'positive',
  },
  {
    id: 'mock-2',
    headline: 'NVIDIA Reports Record Revenue, AI Chip Demand Soars',
    summary: 'NVIDIA exceeded expectations with record quarterly revenue driven by unprecedented demand for AI computing chips.',
    url: 'https://example.com/nvda-earnings',
    source: 'Reuters',
    source_provider: 'rss',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    symbols: ['NVDA', 'AMD', 'INTC'],
    sentiment: 'positive',
  },
  {
    id: 'mock-3',
    headline: 'S&P 500 Continues Record Run on Economic Optimism',
    summary: 'The S&P 500 index extended gains as investors remain confident in a soft landing for the U.S. economy.',
    url: 'https://example.com/sp500-record',
    source: 'Financial Times',
    source_provider: 'rss',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    symbols: ['SPY', 'QQQ', 'DIA'],
    sentiment: 'positive',
  },
  {
    id: 'mock-social-1',
    headline: '$NVDA crushing it today! AI revolution is real',
    summary: '',
    url: 'https://stocktwits.com/mock',
    source: 'StockTwits',
    source_provider: 'stocktwits',
    publishedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    symbols: ['NVDA'],
    sentiment: 'bullish',
    sentiment_score: 0.8,
    engagement: { likes: 42, comments: 8 },
  },
];

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute for aggregated news
  const rateLimit = checkRateLimit(request, { limit: 30, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const source = searchParams.get('source'); // 'api', 'rss', 'social'
    const includeSocial = searchParams.get('include_social') !== 'false';

    try {
      // Proxy to Python backend aggregated endpoint with pagination
      const params = new URLSearchParams({ limit, offset });
      if (symbol) params.append('symbol', symbol);
      if (source) params.append('source', source);
      params.append('include_social', includeSocial.toString());

      const response = await fetch(
        `${API_BASE_URL}/api/news/aggregated?${params.toString()}`,
        {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();

      // Return the aggregated response as-is (already normalized)
      return NextResponse.json(data);
    } catch (error) {
      console.warn('Backend unavailable for aggregated news, returning mock data:', error);

      // Filter mock articles by symbol if provided
      let articles = [...MOCK_ARTICLES];
      if (symbol) {
        articles = articles.filter(a => a.symbols?.includes(symbol));
      }

      // Filter by source type
      if (source === 'social') {
        articles = articles.filter(a => a.source_provider === 'stocktwits');
      } else if (source === 'rss') {
        articles = articles.filter(a => a.source_provider === 'rss');
      } else if (source === 'api') {
        articles = articles.filter(a => !['rss', 'stocktwits'].includes(a.source_provider || ''));
      }

      // Filter out social if not included
      if (!includeSocial) {
        articles = articles.filter(a => a.source_provider !== 'stocktwits');
      }

      return NextResponse.json({
        articles,
        sources: {
          rss: articles.filter(a => a.source_provider === 'rss').length,
          stocktwits: articles.filter(a => a.source_provider === 'stocktwits').length,
        },
        total_fetched: MOCK_ARTICLES.length,
        total_returned: articles.length,
        mock: true,
        warning: 'Using simulated data - backend unavailable',
      });
    }
  } catch (error) {
    console.error('Aggregated news error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aggregated news' },
      { status: 500 }
    );
  }
}
