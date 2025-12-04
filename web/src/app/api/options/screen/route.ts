import { NextRequest, NextResponse } from 'next/server';
import { ScreenerFilters, ScreenerResponse, OptionContract } from '@/lib/types/options';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Generate mock screener results when backend unavailable
function generateMockScreenerResults(filters: ScreenerFilters): ScreenerResponse {
  const contracts: OptionContract[] = [];
  const today = new Date();

  for (const symbol of filters.underlying_symbols) {
    const underlyingPrice = 100 + Math.random() * 400;

    for (let i = 0; i < 20; i++) {
      const daysToExp = filters.min_dte + Math.floor(Math.random() * (filters.max_dte - filters.min_dte));
      const expDate = new Date(today);
      expDate.setDate(expDate.getDate() + daysToExp);

      const strikeOffset = (Math.random() - 0.5) * 40;
      const strike = Math.round((underlyingPrice + strikeOffset) / 5) * 5;
      const optType = Math.random() > 0.5 ? 'call' : 'put';

      const moneyness =
        optType === 'call'
          ? strike < underlyingPrice ? 'itm' : strike > underlyingPrice ? 'otm' : 'atm'
          : strike > underlyingPrice ? 'itm' : strike < underlyingPrice ? 'otm' : 'atm';

      const delta = optType === 'call'
        ? 0.3 + Math.random() * 0.4
        : -(0.3 + Math.random() * 0.4);

      const iv = 0.20 + Math.random() * 0.30;
      const bid = Math.max(0.10, 2 + Math.abs(underlyingPrice - strike) * 0.05 + Math.random() * 3);
      const ask = bid * (1 + 0.01 + Math.random() * 0.04);
      const volume = filters.min_volume + Math.floor(Math.random() * 5000);
      const openInterest = filters.min_open_interest + Math.floor(Math.random() * 10000);

      contracts.push({
        symbol: `${symbol}${expDate.toISOString().split('T')[0].replace(/-/g, '')}${optType === 'call' ? 'C' : 'P'}${String(strike * 1000).padStart(8, '0')}`,
        underlying_symbol: symbol,
        option_type: optType as 'call' | 'put',
        strike_price: strike,
        expiration_date: expDate.toISOString().split('T')[0],
        days_to_expiration: daysToExp,
        bid: Math.round(bid * 100) / 100,
        ask: Math.round(ask * 100) / 100,
        last_price: Math.round(((bid + ask) / 2) * 100) / 100,
        volume,
        open_interest: openInterest,
        delta: Math.round(delta * 1000) / 1000,
        gamma: Math.round((0.01 + Math.random() * 0.03) * 1000) / 1000,
        theta: Math.round(-(0.02 + Math.random() * 0.05) * 1000) / 1000,
        vega: Math.round((0.05 + Math.random() * 0.10) * 1000) / 1000,
        implied_volatility: Math.round(iv * 1000) / 1000,
        bid_ask_spread: Math.round((ask - bid) * 100) / 100,
        bid_ask_spread_pct: Math.round(((ask - bid) / bid) * 100 * 10) / 10,
        moneyness: moneyness as 'itm' | 'atm' | 'otm',
        underlying_price: Math.round(underlyingPrice * 100) / 100,
      });
    }
  }

  // Sort by volume desc
  contracts.sort((a, b) => (b.volume || 0) - (a.volume || 0));

  return {
    contracts: contracts.slice(0, filters.limit),
    total_count: contracts.length,
    filters_applied: filters,
  };
}

export async function POST(request: NextRequest) {
  try {
    const filters: ScreenerFilters = await request.json();

    if (!filters.underlying_symbols || filters.underlying_symbols.length === 0) {
      return NextResponse.json(
        { error: 'At least one underlying symbol is required' },
        { status: 400 }
      );
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/options/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.warn('Backend unavailable for options screen, returning mock data:', error);

      const mockResults = generateMockScreenerResults(filters);
      return NextResponse.json({
        ...mockResults,
        mock: true,
        warning: 'Using simulated data - backend unavailable',
      });
    }
  } catch (error) {
    console.error('Error in options screen:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
