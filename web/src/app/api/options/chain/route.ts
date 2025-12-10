import { NextRequest, NextResponse } from 'next/server';
import { OptionChain, OptionContract } from '@/lib/types/options';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Generate mock options chain when backend unavailable
function generateMockChain(symbol: string): OptionChain {
  const underlyingPrice = 450 + Math.random() * 50;
  const contracts: OptionContract[] = [];
  const today = new Date();
  const expirations: string[] = [];

  // Generate 3 expiration dates
  for (let w = 1; w <= 3; w++) {
    const expDate = new Date(today);
    expDate.setDate(expDate.getDate() + w * 7);
    expirations.push(expDate.toISOString().split('T')[0]);
  }

  // Generate strikes around the money
  const strikes = [-20, -15, -10, -5, 0, 5, 10, 15, 20].map(
    (offset) => Math.round((underlyingPrice + offset) / 5) * 5
  );

  for (const exp of expirations) {
    const daysToExp = Math.ceil(
      (new Date(exp).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const strike of strikes) {
      for (const optType of ['call', 'put'] as const) {
        const moneyness =
          optType === 'call'
            ? strike < underlyingPrice
              ? 'itm'
              : strike > underlyingPrice
              ? 'otm'
              : 'atm'
            : strike > underlyingPrice
            ? 'itm'
            : strike < underlyingPrice
            ? 'otm'
            : 'atm';

        const delta =
          optType === 'call'
            ? 0.5 + (underlyingPrice - strike) / (underlyingPrice * 0.4)
            : -0.5 + (underlyingPrice - strike) / (underlyingPrice * 0.4);

        const iv = 0.20 + Math.random() * 0.15;
        const bid = Math.max(0.01, 5 + (underlyingPrice - strike) * (optType === 'call' ? 1 : -1) * 0.1);
        const ask = bid * (1 + 0.02 + Math.random() * 0.05);

        contracts.push({
          symbol: `${symbol}${exp.replace(/-/g, '')}${optType === 'call' ? 'C' : 'P'}${String(strike * 1000).padStart(8, '0')}`,
          underlying_symbol: symbol,
          option_type: optType,
          strike_price: strike,
          expiration_date: exp,
          days_to_expiration: daysToExp,
          bid: Math.round(bid * 100) / 100,
          ask: Math.round(ask * 100) / 100,
          last_price: Math.round(((bid + ask) / 2) * 100) / 100,
          volume: Math.floor(100 + Math.random() * 5000),
          open_interest: Math.floor(500 + Math.random() * 10000),
          delta: Math.max(-1, Math.min(1, delta)),
          gamma: 0.01 + Math.random() * 0.05,
          theta: -(0.01 + Math.random() * 0.05),
          vega: 0.05 + Math.random() * 0.15,
          implied_volatility: iv,
          bid_ask_spread: Math.round((ask - bid) * 100) / 100,
          bid_ask_spread_pct: Math.round(((ask - bid) / bid) * 100 * 100) / 100,
          moneyness,
          underlying_price: underlyingPrice,
        });
      }
    }
  }

  return {
    underlying_symbol: symbol,
    underlying_price: underlyingPrice,
    contracts,
    expirations,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute for heavy data
  const rateLimit = checkRateLimit(request, { limit: 30, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const expiration = searchParams.get('expiration');
  const optionType = searchParams.get('option_type');
  const strikeMin = searchParams.get('strike_min');
  const strikeMax = searchParams.get('strike_max');
  const limit = searchParams.get('limit') || '100';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    // Build query string
    const params = new URLSearchParams({ limit });
    if (expiration) params.append('expiration', expiration);
    if (optionType) params.append('option_type', optionType);
    if (strikeMin) params.append('strike_min', strikeMin);
    if (strikeMax) params.append('strike_max', strikeMax);

    const response = await fetch(
      `${API_BASE_URL}/api/options/chain/${symbol.toUpperCase()}?${params.toString()}`,
      {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn('Backend unavailable for options chain, returning mock data:', error);

    const mockChain = generateMockChain(symbol.toUpperCase());
    return NextResponse.json({
      ...mockChain,
      mock: true,
      warning: 'Using simulated data - backend unavailable',
    });
  }
}
