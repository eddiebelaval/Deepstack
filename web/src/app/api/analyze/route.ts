import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface StockAnalysis {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  technicals: {
    trend: string;
    support: number;
    resistance: number;
    rsi: number; // Placeholder or calculated from bars
    macd_signal: string; // Placeholder
  };
  sentiment?: {
    overall: string;
    score: number;
  };
}

// Generate mock analysis when backend is unavailable
function generateMockAnalysis(symbol: string): StockAnalysis {
  const basePrice = 100 + Math.random() * 400;
  const change = (Math.random() - 0.5) * 10;

  return {
    symbol: symbol.toUpperCase(),
    price: parseFloat(basePrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
    volume: Math.floor(Math.random() * 10000000) + 500000,
    technicals: {
      trend: change > 0 ? 'bullish' : 'bearish',
      support: parseFloat((basePrice * 0.95).toFixed(2)),
      resistance: parseFloat((basePrice * 1.05).toFixed(2)),
      rsi: Math.floor(40 + Math.random() * 20),
      macd_signal: 'neutral',
    },
    sentiment: {
      overall: change > 0 ? 'positive' : 'negative',
      score: Math.floor(40 + Math.random() * 40),
    }
  };
}

// Simple technical analysis from bars
function calculateTechnicals(bars: any[], currentPrice: number) {
  if (!bars || bars.length < 5) return {
    trend: 'neutral',
    support: currentPrice * 0.95,
    resistance: currentPrice * 1.05,
    rsi: 50,
    macd_signal: 'neutral'
  };

  // Simple Trend based on last vs first bar in range
  const firstClose = bars[bars.length - 1].c; // bars are often returned newest first or handle appropriately.
  // Let's assume bars are time descending or ascending.
  // The Market API usually returns bars time-ascending (oldest to newest) or descending.
  // We'll check timestamps if needed, but for simple stuff:
  // If we assume typical API format, let's just grab min and max of recent closes for sup/res.

  const closes = bars.map((b: any) => b.c);
  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);

  const trend = currentPrice > closes[0] ? 'bullish' : 'bearish'; // Comparing to oldest in the set (index 0)

  return {
    trend,
    support: minPrice,
    resistance: maxPrice,
    rsi: 50, // Not calculating full RSI here to keep it simple
    macd_signal: 'neutral'
  };
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
      // Step 1: Fetch Quote
      const quoteRes = await fetch(`${API_BASE_URL}/api/market/quotes?symbols=${upperSymbol}`, {
        cache: 'no-store'
      });
      if (!quoteRes.ok) throw new Error('Failed to fetch quote');
      const quoteData = await quoteRes.json();

      // quoteData is usually { "SYMBOL": { ... } }
      const quote = quoteData[upperSymbol];
      if (!quote) throw new Error('Symbol not found in quote data');

      // Step 2: Fetch Bars (for technicals)
      const barsRes = await fetch(
        `${API_BASE_URL}/api/market/bars?symbol=${upperSymbol}&timeframe=1d&limit=20`,
        { cache: 'no-store' }
      );

      let technicals = {
        trend: 'neutral',
        support: quote.last * 0.9,
        resistance: quote.last * 1.1,
        rsi: 50,
        macd_signal: 'neutral'
      };

      if (barsRes.ok) {
        const barsData = await barsRes.json();
        if (barsData.bars) {
          technicals = calculateTechnicals(barsData.bars, quote.last);
        }
      }

      // Step 3: Construct Response
      const result: StockAnalysis = {
        symbol: upperSymbol,
        price: quote.last,
        change: quote.change,
        changePercent: quote.changePercent,
        volume: quote.volume,
        technicals: technicals,
        sentiment: {
          overall: 'neutral', // Placeholder as we don't have real sentiment API yet
          score: 50
        }
      };

      return NextResponse.json(result);

    } catch (backendError) {
      console.warn('Backend unavailable or error, returning mock analysis:', backendError);
      const mock = generateMockAnalysis(upperSymbol);
      return NextResponse.json({ ...mock, mock: true });
    }

  } catch (error) {
    console.error('Analyze endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to process analysis request' },
      { status: 500 }
    );
  }
}
