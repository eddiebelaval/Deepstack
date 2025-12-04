import { NextResponse } from 'next/server';

// Mock data for stock screener
const MOCK_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.50, change: 2.35, changePercent: 1.33, volume: 52345678, marketCap: 2.8e12, peRatio: 28.5, sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.25, change: -1.20, changePercent: -0.32, volume: 23456789, marketCap: 2.8e12, peRatio: 35.2, sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.80, change: 3.15, changePercent: 2.26, volume: 18234567, marketCap: 1.8e12, peRatio: 24.1, sector: 'Communication Services' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.50, change: 1.85, changePercent: 1.05, volume: 34567890, marketCap: 1.9e12, peRatio: 65.3, sector: 'Consumer Discretionary' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.50, change: 12.35, changePercent: 2.61, volume: 45678901, marketCap: 1.2e12, peRatio: 62.8, sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.20, change: -5.40, changePercent: -2.13, volume: 67890123, marketCap: 790e9, peRatio: 78.4, sector: 'Consumer Discretionary' },
  { symbol: 'META', name: 'Meta Platforms Inc.', price: 505.60, change: 8.90, changePercent: 1.79, volume: 15678901, marketCap: 1.3e12, peRatio: 29.6, sector: 'Communication Services' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 198.35, change: 1.15, changePercent: 0.58, volume: 8901234, marketCap: 570e9, peRatio: 11.2, sector: 'Financials' },
  { symbol: 'V', name: 'Visa Inc.', price: 278.90, change: 2.45, changePercent: 0.89, volume: 5678901, marketCap: 570e9, peRatio: 30.5, sector: 'Financials' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 156.45, change: -0.80, changePercent: -0.51, volume: 6789012, marketCap: 380e9, peRatio: 15.8, sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', price: 528.75, change: 4.25, changePercent: 0.81, volume: 3456789, marketCap: 490e9, peRatio: 21.3, sector: 'Healthcare' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', price: 108.30, change: -1.55, changePercent: -1.41, volume: 12345678, marketCap: 430e9, peRatio: 10.8, sector: 'Energy' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', price: 158.60, change: 0.75, changePercent: 0.47, volume: 4567890, marketCap: 375e9, peRatio: 25.4, sector: 'Consumer Staples' },
  { symbol: 'HD', name: 'The Home Depot Inc.', price: 378.45, change: 3.80, changePercent: 1.01, volume: 3234567, marketCap: 375e9, peRatio: 22.1, sector: 'Consumer Discretionary' },
  { symbol: 'BAC', name: 'Bank of America Corp.', price: 33.85, change: 0.45, changePercent: 1.35, volume: 28901234, marketCap: 265e9, peRatio: 10.2, sector: 'Financials' },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const priceMin = searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')!) : undefined;
    const priceMax = searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')!) : undefined;
    const volumeMin = searchParams.get('volumeMin') ? parseFloat(searchParams.get('volumeMin')!) : undefined;
    const marketCapMin = searchParams.get('marketCapMin') ? parseFloat(searchParams.get('marketCapMin')!) : undefined;
    const marketCapMax = searchParams.get('marketCapMax') ? parseFloat(searchParams.get('marketCapMax')!) : undefined;
    const sector = searchParams.get('sector') || undefined;
    const sortBy = searchParams.get('sortBy') || 'volume';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

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

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Screener error:', error);
    return NextResponse.json(
      { error: 'Failed to run screener' },
      { status: 500 }
    );
  }
}
