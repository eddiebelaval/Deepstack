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
 * Proxies to the Python backend at /api/signals/congress.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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

function mapBackendTrade(raw: Record<string, any>, index: number): PoliticianTrade {
  // Map Python backend fields (snake_case from CongressTrade dataclass)
  // to the PoliticianTrade interface the frontend expects (camelCase)
  const txType = (raw.transaction_type || raw.transactionType || '').toLowerCase();

  return {
    id: raw.id || `congress-${index}`,
    politician: raw.politician || '',
    party: raw.party || 'I',
    chamber: raw.chamber || 'House',
    state: raw.state || '',
    symbol: (raw.ticker || raw.symbol || '').toUpperCase(),
    companyName: raw.company_name || raw.companyName || '',
    transactionType: txType.includes('sale') ? 'sale' : 'purchase',
    transactionDate: raw.transaction_date || raw.transactionDate || '',
    disclosureDate: raw.disclosure_date || raw.disclosureDate || '',
    amountMin: raw.amount_min || raw.amountMin || 0,
    amountMax: raw.amount_max || raw.amountMax || 0,
    assetType: raw.asset_type || raw.assetType || 'Stock',
    sourceUrl: raw.source_url || raw.sourceUrl,
  };
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

    // Build params for the Python backend
    const params = new URLSearchParams();
    if (symbolFilter) params.append('ticker', symbolFilter);
    if (partyFilter && partyFilter !== 'all') params.append('party', partyFilter);
    if (chamberFilter && chamberFilter !== 'all') params.append('chamber', chamberFilter);
    if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
    params.append('limit', String(limit));

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/signals/congress?${params.toString()}`,
        {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();

      // Backend may return { trades: [...] } or a bare array
      const rawTrades: Record<string, any>[] = Array.isArray(data)
        ? data
        : (data.trades || []);

      const trades: PoliticianTrade[] = rawTrades
        .slice(0, limit)
        .map(mapBackendTrade);

      // Sort by transaction date (newest first)
      trades.sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      );

      return NextResponse.json({
        trades,
        total: trades.length,
      });
    } catch (backendError) {
      console.warn('Backend unavailable for congress trades:', backendError);

      // Graceful degradation: return empty array so the UI doesn't break
      return NextResponse.json({
        trades: [],
        total: 0,
      });
    }
  } catch (error) {
    console.error('Politicians trades API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch political trades' },
      { status: 500 },
    );
  }
}
