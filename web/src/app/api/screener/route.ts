import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Types for screener stocks
interface ScreenerStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  sector: string;
}

// Mock stocks as fallback
const MOCK_STOCKS: ScreenerStock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 238.50, change: 2.35, changePercent: 1.0, volume: 52345678, marketCap: 3.7e12, peRatio: 28.5, sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', price: 432.25, change: 3.20, changePercent: 0.75, volume: 23456789, marketCap: 3.2e12, peRatio: 35.2, sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.80, change: 1.15, changePercent: 0.66, volume: 18234567, marketCap: 2.2e12, peRatio: 24.1, sector: 'Communication Services' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 210.50, change: 1.85, changePercent: 0.89, volume: 34567890, marketCap: 2.2e12, peRatio: 65.3, sector: 'Consumer Discretionary' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 142.50, change: 4.35, changePercent: 3.15, volume: 45678901, marketCap: 3.5e12, peRatio: 62.8, sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 355.20, change: -5.40, changePercent: -1.50, volume: 67890123, marketCap: 1.1e12, peRatio: 78.4, sector: 'Consumer Discretionary' },
  { symbol: 'META', name: 'Meta Platforms Inc.', price: 580.60, change: 8.90, changePercent: 1.56, volume: 15678901, marketCap: 1.5e12, peRatio: 29.6, sector: 'Communication Services' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 248.35, change: 1.15, changePercent: 0.47, volume: 8901234, marketCap: 720e9, peRatio: 11.2, sector: 'Financials' },
  { symbol: 'V', name: 'Visa Inc.', price: 315.90, change: 2.45, changePercent: 0.78, volume: 5678901, marketCap: 640e9, peRatio: 30.5, sector: 'Financials' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', price: 528.75, change: -4.25, changePercent: -0.80, volume: 3456789, marketCap: 490e9, peRatio: 21.3, sector: 'Healthcare' },
];

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute for external API
  const rateLimit = checkRateLimit(request, { limit: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const searchParams = request.nextUrl.searchParams;
    const priceMin = searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')!) : undefined;
    const priceMax = searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')!) : undefined;
    const volumeMin = searchParams.get('volumeMin') ? parseFloat(searchParams.get('volumeMin')!) : undefined;
    const marketCapMin = searchParams.get('marketCapMin') ? parseFloat(searchParams.get('marketCapMin')!) : undefined;
    const marketCapMax = searchParams.get('marketCapMax') ? parseFloat(searchParams.get('marketCapMax')!) : undefined;
    const sector = searchParams.get('sector') || undefined;
    const sortBy = searchParams.get('sortBy') || 'volume';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    try {
      // Try to fetch real quotes from backend to enhance mock data
      const symbols = MOCK_STOCKS.map(s => s.symbol).join(',');
      const response = await fetch(
        `${API_BASE_URL}/api/market/quotes?symbols=${symbols}`,
        {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (response.ok) {
        const quoteData = await response.json();
        const quotes = quoteData.quotes || {};

        // Merge real quote data with mock stock info
        let results = MOCK_STOCKS.map(stock => {
          const quote = quotes[stock.symbol];
          if (quote && quote.last) {
            return {
              ...stock,
              price: quote.last,
              change: quote.change || stock.change,
              changePercent: quote.changePercent || stock.changePercent,
              volume: quote.volume || stock.volume,
            };
          }
          return stock;
        });

        // Apply filters
        if (priceMin !== undefined) results = results.filter(s => s.price >= priceMin);
        if (priceMax !== undefined) results = results.filter(s => s.price <= priceMax);
        if (volumeMin !== undefined) results = results.filter(s => s.volume >= volumeMin);
        if (marketCapMin !== undefined) results = results.filter(s => s.marketCap >= marketCapMin);
        if (marketCapMax !== undefined) results = results.filter(s => s.marketCap <= marketCapMax);
        if (sector) results = results.filter(s => s.sector === sector);

        // Sort
        results.sort((a, b) => {
          let aVal: number, bVal: number;
          switch (sortBy) {
            case 'price': aVal = a.price; bVal = b.price; break;
            case 'change': aVal = a.changePercent; bVal = b.changePercent; break;
            case 'marketCap': aVal = a.marketCap; bVal = b.marketCap; break;
            case 'volume':
            default: aVal = a.volume; bVal = b.volume; break;
          }
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return NextResponse.json({ results });
      }
      throw new Error('Failed to get quotes');
    } catch (error) {
      console.warn('Backend unavailable for screener, using mock data with applied filters:', error);

      let results = [...MOCK_STOCKS];

      // Apply filters
      if (priceMin !== undefined) results = results.filter(s => s.price >= priceMin);
      if (priceMax !== undefined) results = results.filter(s => s.price <= priceMax);
      if (volumeMin !== undefined) results = results.filter(s => s.volume >= volumeMin);
      if (marketCapMin !== undefined) results = results.filter(s => s.marketCap >= marketCapMin);
      if (marketCapMax !== undefined) results = results.filter(s => s.marketCap <= marketCapMax);
      if (sector) results = results.filter(s => s.sector === sector);

      // Sort
      results.sort((a, b) => {
        let aVal: number, bVal: number;
        switch (sortBy) {
          case 'price': aVal = a.price; bVal = b.price; break;
          case 'change': aVal = a.changePercent; bVal = b.changePercent; break;
          case 'marketCap': aVal = a.marketCap; bVal = b.marketCap; break;
          case 'volume':
          default: aVal = a.volume; bVal = b.volume; break;
        }
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });

      return NextResponse.json({
        results,
        mock: true,
        warning: 'Using simulated data enhanced with real prices when available',
      });
    }
  } catch (error) {
    console.error('Screener error:', error);
    return NextResponse.json(
      { error: 'Failed to run screener' },
      { status: 500 }
    );
  }
}
