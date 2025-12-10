import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Types for news articles
interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  symbols: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// Mock news articles as fallback
const MOCK_ARTICLES: NewsArticle[] = [
  {
    id: '1',
    headline: 'Fed Signals Potential Rate Cuts as Inflation Cools',
    summary: 'Federal Reserve officials indicated they may begin cutting interest rates as inflation continues to moderate toward their 2% target.',
    url: 'https://example.com/fed-rates',
    source: 'MarketWatch',
    publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    symbols: ['SPY', 'TLT', 'GLD'],
    sentiment: 'positive',
  },
  {
    id: '2',
    headline: 'NVIDIA Reports Record Revenue, AI Chip Demand Soars',
    summary: 'NVIDIA exceeded expectations with record quarterly revenue driven by unprecedented demand for AI computing chips.',
    url: 'https://example.com/nvda-earnings',
    source: 'Reuters',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    symbols: ['NVDA', 'AMD', 'INTC'],
    sentiment: 'positive',
  },
  {
    id: '3',
    headline: 'S&P 500 Continues Record Run on Economic Optimism',
    summary: 'The S&P 500 index extended gains as investors remain confident in a soft landing for the U.S. economy.',
    url: 'https://example.com/sp500-record',
    source: 'Financial Times',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    symbols: ['SPY', 'QQQ', 'DIA'],
    sentiment: 'positive',
  },
];

// Determine sentiment from headline/summary
function inferSentiment(headline: string, summary: string): 'positive' | 'negative' | 'neutral' {
  const text = (headline + ' ' + summary).toLowerCase();
  const positiveWords = ['surge', 'rally', 'gain', 'rise', 'record', 'beat', 'strong', 'growth', 'bullish', 'optimism', 'exceeds'];
  const negativeWords = ['drop', 'fall', 'decline', 'loss', 'miss', 'weak', 'bearish', 'concern', 'risk', 'crash', 'plunge'];

  const positiveCount = positiveWords.filter(w => text.includes(w)).length;
  const negativeCount = negativeWords.filter(w => text.includes(w)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute for external API
  const rateLimit = checkRateLimit(request, { limit: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const limit = searchParams.get('limit') || '10';

    try {
      // Try to fetch from Python backend (which can use Alpaca News API)
      const params = new URLSearchParams({ limit });
      if (symbol) params.append('symbol', symbol);

      const response = await fetch(
        `${API_BASE_URL}/api/news?${params.toString()}`,
        {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();

      // Map backend response to frontend format
      const articles = (data.news || data.articles || []).map((item: any, index: number) => ({
        id: item.id || `news-${index}`,
        headline: item.headline || item.title,
        summary: item.summary || item.content?.substring(0, 200) || '',
        url: item.url || item.article_url || '#',
        source: item.source || item.author || 'News',
        publishedAt: item.created_at || item.publishedAt || new Date().toISOString(),
        symbols: item.symbols || [],
        sentiment: item.sentiment || inferSentiment(item.headline || '', item.summary || ''),
      }));

      return NextResponse.json({ articles });
    } catch (error) {
      console.warn('Backend unavailable for news, returning mock data:', error);

      // Filter mock articles by symbol if provided
      let articles = [...MOCK_ARTICLES];
      if (symbol) {
        articles = articles.filter(a => a.symbols?.includes(symbol));
      }

      return NextResponse.json({
        articles,
        mock: true,
        warning: 'Using simulated data - backend unavailable',
      });
    }
  } catch (error) {
    console.error('News error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
