import { NextRequest, NextResponse } from 'next/server';

/**
 * Politicians Trading API
 *
 * GET /api/politicians/trades - Get congressional stock trades
 *
 * Query params:
 * - symbol: Filter by stock symbol
 * - party: Filter by party (D, R, I)
 * - chamber: Filter by chamber (House, Senate)
 * - type: Filter by transaction type (purchase, sale)
 * - limit: Max results (default 50)
 *
 * Note: In production, this would connect to a data provider like
 * Capitol Trades, Quiver Quantitative, or scrape congressional disclosures.
 * Currently returns mock data for development.
 */

interface PoliticianTrade {
  id: string;
  politician: string;
  party: 'D' | 'R' | 'I';
  chamber: 'House' | 'Senate';
  state: string;
  symbol: string;
  companyName: string;
  transactionType: 'purchase' | 'sale';
  transactionDate: string;
  disclosureDate: string;
  amountMin: number;
  amountMax: number;
  assetType: string;
  sourceUrl?: string;
}

// Stock data for mock generation
const STOCKS = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
];

// Politicians for mock data
const POLITICIANS = [
  { name: 'Nancy Pelosi', party: 'D' as const, chamber: 'House' as const, state: 'CA' },
  { name: 'Dan Crenshaw', party: 'R' as const, chamber: 'House' as const, state: 'TX' },
  { name: 'Tommy Tuberville', party: 'R' as const, chamber: 'Senate' as const, state: 'AL' },
  { name: 'Mark Warner', party: 'D' as const, chamber: 'Senate' as const, state: 'VA' },
  { name: 'Marjorie Taylor Greene', party: 'R' as const, chamber: 'House' as const, state: 'GA' },
  { name: 'Josh Gottheimer', party: 'D' as const, chamber: 'House' as const, state: 'NJ' },
  { name: 'Pat Fallon', party: 'R' as const, chamber: 'House' as const, state: 'TX' },
  { name: 'Michael McCaul', party: 'R' as const, chamber: 'House' as const, state: 'TX' },
  { name: 'Ro Khanna', party: 'D' as const, chamber: 'House' as const, state: 'CA' },
  { name: 'John Hoeven', party: 'R' as const, chamber: 'Senate' as const, state: 'ND' },
];

// Amount ranges per disclosure rules
const AMOUNT_RANGES = [
  [1001, 15000],
  [15001, 50000],
  [50001, 100000],
  [100001, 250000],
  [250001, 500000],
  [500001, 1000000],
];

// Generate deterministic mock trades
function generateMockTrades(seed: number = Date.now()): PoliticianTrade[] {
  const trades: PoliticianTrade[] = [];
  const now = new Date();

  // Use seed for pseudo-random but consistent results
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 50; i++) {
    const politician = POLITICIANS[Math.floor(seededRandom(i * 3) * POLITICIANS.length)];
    const stock = STOCKS[Math.floor(seededRandom(i * 5) * STOCKS.length)];
    const amount = AMOUNT_RANGES[Math.floor(seededRandom(i * 7) * AMOUNT_RANGES.length)];
    const daysAgo = Math.floor(seededRandom(i * 11) * 120);

    const transactionDate = new Date(now);
    transactionDate.setDate(transactionDate.getDate() - daysAgo);

    const disclosureDate = new Date(transactionDate);
    disclosureDate.setDate(disclosureDate.getDate() + Math.floor(seededRandom(i * 13) * 45) + 1);

    trades.push({
      id: `trade-${i}-${seed}`,
      politician: politician.name,
      party: politician.party,
      chamber: politician.chamber,
      state: politician.state,
      symbol: stock.symbol,
      companyName: stock.name,
      transactionType: seededRandom(i * 17) > 0.5 ? 'purchase' : 'sale',
      transactionDate: transactionDate.toISOString(),
      disclosureDate: disclosureDate.toISOString(),
      amountMin: amount[0],
      amountMax: amount[1],
      assetType: 'Stock',
      sourceUrl: politician.chamber === 'House'
        ? 'https://disclosures.house.gov/'
        : 'https://efdsearch.senate.gov/',
    });
  }

  // Sort by transaction date (newest first)
  return trades.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const symbolFilter = searchParams.get('symbol')?.toUpperCase();
    const partyFilter = searchParams.get('party');
    const chamberFilter = searchParams.get('chamber');
    const typeFilter = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Generate mock trades (in production, fetch from data provider)
    let trades = generateMockTrades();

    // Apply filters
    if (symbolFilter) {
      trades = trades.filter(t => t.symbol === symbolFilter);
    }
    if (partyFilter && partyFilter !== 'all') {
      trades = trades.filter(t => t.party === partyFilter);
    }
    if (chamberFilter && chamberFilter !== 'all') {
      trades = trades.filter(t => t.chamber === chamberFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
      trades = trades.filter(t => t.transactionType === typeFilter);
    }

    // Limit results
    trades = trades.slice(0, limit);

    return NextResponse.json({
      trades,
      total: trades.length,
      mock: true, // Flag that this is mock data
    });
  } catch (error) {
    console.error('Politicians trades API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch political trades' },
      { status: 500 }
    );
  }
}
