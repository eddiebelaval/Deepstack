import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Types for stock analysis
interface StockAnalysis {
  symbol: string;
  analysis: string;
  score?: number;
  thesis?: string;
  technicals?: {
    trend: string;
    support: number;
    resistance: number;
    rsi: number;
    macd_signal: string;
  };
  fundamentals?: {
    pe_ratio?: number;
    market_cap?: string;
    sector?: string;
    industry?: string;
  };
  sentiment?: {
    overall: string;
    news_score: number;
    social_score: number;
  };
}

// Generate mock analysis when backend is unavailable
function generateMockAnalysis(symbol: string): StockAnalysis {
  const mockData: Record<string, Partial<StockAnalysis>> = {
    AAPL: {
      thesis: 'Apple remains a strong long-term hold with consistent iPhone demand and growing services revenue.',
      score: 78,
      technicals: {
        trend: 'bullish',
        support: 225,
        resistance: 245,
        rsi: 55,
        macd_signal: 'bullish crossover',
      },
      fundamentals: {
        pe_ratio: 32.5,
        market_cap: '$3.5T',
        sector: 'Technology',
        industry: 'Consumer Electronics',
      },
      sentiment: {
        overall: 'positive',
        news_score: 72,
        social_score: 68,
      },
    },
    TSLA: {
      thesis: 'Tesla faces near-term headwinds from competition but maintains EV leadership position.',
      score: 62,
      technicals: {
        trend: 'neutral',
        support: 320,
        resistance: 380,
        rsi: 48,
        macd_signal: 'neutral',
      },
      fundamentals: {
        pe_ratio: 65.2,
        market_cap: '$1.1T',
        sector: 'Consumer Discretionary',
        industry: 'Electric Vehicles',
      },
      sentiment: {
        overall: 'mixed',
        news_score: 55,
        social_score: 75,
      },
    },
    NVDA: {
      thesis: 'NVIDIA dominates AI chip market with strong data center growth driving record revenues.',
      score: 85,
      technicals: {
        trend: 'strongly bullish',
        support: 130,
        resistance: 155,
        rsi: 62,
        macd_signal: 'bullish',
      },
      fundamentals: {
        pe_ratio: 55.8,
        market_cap: '$3.2T',
        sector: 'Technology',
        industry: 'Semiconductors',
      },
      sentiment: {
        overall: 'very positive',
        news_score: 88,
        social_score: 82,
      },
    },
    SPY: {
      thesis: 'S&P 500 ETF provides broad market exposure with steady upward momentum.',
      score: 72,
      technicals: {
        trend: 'bullish',
        support: 570,
        resistance: 610,
        rsi: 58,
        macd_signal: 'bullish',
      },
      fundamentals: {
        pe_ratio: 22.1,
        market_cap: '$550B',
        sector: 'Diversified',
        industry: 'ETF',
      },
      sentiment: {
        overall: 'positive',
        news_score: 65,
        social_score: 60,
      },
    },
  };

  const baseAnalysis = mockData[symbol.toUpperCase()] || {
    thesis: `${symbol.toUpperCase()} requires further analysis. Consider reviewing recent earnings and market conditions.`,
    score: 50 + Math.floor(Math.random() * 30),
    technicals: {
      trend: ['bullish', 'bearish', 'neutral'][Math.floor(Math.random() * 3)],
      support: Math.floor(Math.random() * 100) + 50,
      resistance: Math.floor(Math.random() * 100) + 100,
      rsi: Math.floor(Math.random() * 40) + 30,
      macd_signal: 'neutral',
    },
    fundamentals: {
      sector: 'Unknown',
      industry: 'Unknown',
    },
    sentiment: {
      overall: 'neutral',
      news_score: 50,
      social_score: 50,
    },
  };

  return {
    symbol: symbol.toUpperCase(),
    analysis: generateAnalysisText(symbol.toUpperCase(), baseAnalysis),
    ...baseAnalysis,
  } as StockAnalysis;
}

function generateAnalysisText(symbol: string, data: Partial<StockAnalysis>): string {
  const trend = data.technicals?.trend || 'neutral';
  const score = data.score || 50;
  const thesis = data.thesis || 'Analysis pending.';

  let recommendation = 'HOLD';
  if (score >= 70) recommendation = 'BUY';
  else if (score <= 40) recommendation = 'SELL';

  return `## ${symbol} Analysis

**Overall Score:** ${score}/100
**Recommendation:** ${recommendation}

### Thesis
${thesis}

### Technical Analysis
- **Trend:** ${trend.charAt(0).toUpperCase() + trend.slice(1)}
- **Support:** $${data.technicals?.support || 'N/A'}
- **Resistance:** $${data.technicals?.resistance || 'N/A'}
- **RSI:** ${data.technicals?.rsi || 'N/A'}
- **MACD:** ${data.technicals?.macd_signal || 'N/A'}

### Market Sentiment
- **Overall:** ${data.sentiment?.overall || 'Neutral'}
- **News Score:** ${data.sentiment?.news_score || 50}/100
- **Social Score:** ${data.sentiment?.social_score || 50}/100

### Key Considerations
- Monitor upcoming earnings and guidance
- Watch sector rotation trends
- Consider position sizing based on volatility

*Note: This analysis is for informational purposes only and not financial advice.*`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();

    try {
      // Try to call the Python backend for AI-powered analysis
      const response = await fetch(
        `${API_BASE_URL}/api/v1/agents/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbol: upperSymbol }),
          // Use a reasonable timeout
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (backendError) {
      // Backend unavailable - return mock analysis so chat still works
      console.warn('Backend unavailable, returning mock analysis:', backendError);

      const mockAnalysis = generateMockAnalysis(upperSymbol);

      return NextResponse.json({
        ...mockAnalysis,
        mock: true,
        warning: 'Using simulated analysis - AI backend unavailable',
      });
    }
  } catch (error) {
    console.error('Analyze endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to process analysis request' },
      { status: 500 }
    );
  }
}

// Also support GET for simple requests
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol query parameter is required' },
      { status: 400 }
    );
  }

  // Reuse POST logic by creating a mock request
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ symbol }),
  });

  return POST(mockRequest);
}
