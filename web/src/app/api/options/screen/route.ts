
import { NextRequest, NextResponse } from 'next/server';
import {
  OptionContract,
  ScreenerFilters,
  ScreenerResponse
} from '@/lib/types/options';

// Helper to generate random number between min and max
function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to calculate error function (approximation)
function erf(x: number): number {
  // Constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Save the sign of x
  let sign = 1;
  if (x < 0) {
    sign = -1;
  }
  x = Math.abs(x);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// Helper to calculate Black-Scholes Greeks (simplified approximation for mock data)
function calculateMockGreeks(
  type: 'call' | 'put',
  s: number, // Spot price
  k: number, // Strike price
  t: number, // Time to expiration (years)
  v: number  // Volatility
) {
  // Very rough approximations just to have sensitive-looking data
  const d1 = (Math.log(s / k) + (0.05 + 0.5 * v * v) * t) / (v * Math.sqrt(t));
  const nd1 = 0.5 * (1 + erf(d1 / Math.sqrt(2))); // Standard normal CDF

  let delta = type === 'call' ? nd1 : nd1 - 1;

  // Ensure delta is within bounds
  if (type === 'call') delta = Math.max(0.01, Math.min(0.99, delta));
  else delta = Math.max(-0.99, Math.min(-0.01, delta));

  return {
    delta: delta,
    gamma: Math.exp(-d1 * d1 / 2) / (s * v * Math.sqrt(t * 2 * Math.PI)), // PDF
    theta: -1 * (s * v * Math.exp(-d1 * d1 / 2)) / (2 * Math.sqrt(t)) / 365,
    vega: s * Math.sqrt(t) * Math.exp(-d1 * d1 / 2) / 100,
  };
}

export async function POST(req: NextRequest) {
  try {
    const filters: ScreenerFilters = await req.json();
    const results: OptionContract[] = [];

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Base prices for common symbols
    const basePrices: Record<string, number> = {
      'SPY': 545.50,
      'QQQ': 468.20,
      'IWM': 202.15,
      'AAPL': 214.30,
      'NVDA': 125.80,
      'MSFT': 425.10,
      'AMD': 165.40,
      'TSLA': 178.50,
      'AMZN': 185.60,
      'GOOGL': 176.30
    };

    const symbols = filters.underlying_symbols.length > 0
      ? filters.underlying_symbols
      : ['SPY'];

    for (const symbol of symbols) {
      const underlyingPrice = basePrices[symbol] || 100.00; // Default if unknown
      const iv = random(0.15, 0.45); // 15% to 45% IV

      // Generate expiration dates
      const today = new Date();
      const expirationMap = [
        { days: 2, label: '2d' },
        { days: 7, label: '1w' },
        { days: 14, label: '2w' },
        { days: 30, label: '1m' },
        { days: 60, label: '2m' },
        { days: 90, label: '3m' }
      ];

      // Filter expirations by DTE
      const validExpirations = expirationMap.filter(
        exp => exp.days >= filters.min_dte && exp.days <= filters.max_dte
      );

      for (const exp of validExpirations) {
        const expirationDate = new Date(today);
        expirationDate.setDate(today.getDate() + exp.days);
        const expStr = formatDate(expirationDate);
        const t = exp.days / 365; // Time in years

        // Generate strikes around the underlying price
        // 20 strikes above and below
        const strikeStep = underlyingPrice > 200 ? 5 : (underlyingPrice > 50 ? 1 : 0.5);
        const centerStrike = Math.round(underlyingPrice / strikeStep) * strikeStep;

        for (let i = -10; i <= 10; i++) {
          const strike = centerStrike + (i * strikeStep);

          // Generate Call
          if (!filters.option_types || filters.option_types.includes('call')) {
            const greeks = calculateMockGreeks('call', underlyingPrice, strike, t, iv);

            // Filter by Delta
            if ((filters.min_delta === undefined || greeks.delta >= filters.min_delta) &&
              (filters.max_delta === undefined || greeks.delta <= filters.max_delta)) {

              const intrinsicValue = Math.max(0, underlyingPrice - strike);
              const timeValue = underlyingPrice * 0.05 * Math.sqrt(t);
              const theoreticalPrice = intrinsicValue + timeValue;

              const bid = theoreticalPrice * 0.98;
              const ask = theoreticalPrice * 1.02;
              const mid = (bid + ask) / 2;

              const volume = Math.floor(random(10, 10000) * Math.exp(-Math.abs(i) / 3));
              const oi = Math.floor(volume * random(2, 10));

              // Apply Volume/OI filters
              if (volume >= filters.min_volume && oi >= filters.min_open_interest) {
                results.push({
                  symbol: `${symbol}${formatDate(expirationDate).replace(/-/g, '').slice(2)}C${Math.floor(strike * 1000).toString().padStart(8, '0')}`,
                  underlying_symbol: symbol,
                  option_type: 'call',
                  strike_price: strike,
                  expiration_date: expStr,
                  days_to_expiration: exp.days,
                  bid: Number(bid.toFixed(2)),
                  ask: Number(ask.toFixed(2)),
                  last_price: Number(mid.toFixed(2)),
                  volume: volume,
                  open_interest: oi,
                  delta: Number(greeks.delta.toFixed(4)),
                  gamma: Number(greeks.gamma.toFixed(4)),
                  theta: Number(greeks.theta.toFixed(4)),
                  vega: Number(greeks.vega.toFixed(4)),
                  implied_volatility: Number(iv.toFixed(4)),
                  bid_ask_spread: Number((ask - bid).toFixed(2)),
                  bid_ask_spread_pct: Number(((ask - bid) / bid * 100).toFixed(2)),
                  moneyness: underlyingPrice > strike ? 'itm' : (Math.abs(underlyingPrice - strike) / underlyingPrice < 0.01 ? 'atm' : 'otm'),
                  underlying_price: underlyingPrice
                });
              }
            }
          }

          // Generate Put
          if (!filters.option_types || filters.option_types.includes('put')) {
            const greeks = calculateMockGreeks('put', underlyingPrice, strike, t, iv);

            // Filter by Delta
            // Note: Put delta is negative, so min/max logic can be tricky if not careful.
            // Usually screeners filter by absolute delta or raw delta.
            // The store passes raw numbers.
            // If filter is min_delta=-0.3, max_delta=-0.1, we check that.

            // Simple range check
            if ((filters.min_delta === undefined || greeks.delta >= filters.min_delta) &&
              (filters.max_delta === undefined || greeks.delta <= filters.max_delta)) {

              const intrinsicValue = Math.max(0, strike - underlyingPrice);
              const timeValue = underlyingPrice * 0.05 * Math.sqrt(t);
              const theoreticalPrice = intrinsicValue + timeValue;

              const bid = theoreticalPrice * 0.98;
              const ask = theoreticalPrice * 1.02;
              const mid = (bid + ask) / 2;

              const volume = Math.floor(random(10, 10000) * Math.exp(-Math.abs(i) / 3));
              const oi = Math.floor(volume * random(2, 10));

              if (volume >= filters.min_volume && oi >= filters.min_open_interest) {
                results.push({
                  symbol: `${symbol}${formatDate(expirationDate).replace(/-/g, '').slice(2)}P${Math.floor(strike * 1000).toString().padStart(8, '0')}`,
                  underlying_symbol: symbol,
                  option_type: 'put',
                  strike_price: strike,
                  expiration_date: expStr,
                  days_to_expiration: exp.days,
                  bid: Number(bid.toFixed(2)),
                  ask: Number(ask.toFixed(2)),
                  last_price: Number(mid.toFixed(2)),
                  volume: volume,
                  open_interest: oi,
                  delta: Number(greeks.delta.toFixed(4)),
                  gamma: Number(greeks.gamma.toFixed(4)),
                  theta: Number(greeks.theta.toFixed(4)),
                  vega: Number(greeks.vega.toFixed(4)),
                  implied_volatility: Number(iv.toFixed(4)),
                  bid_ask_spread: Number((ask - bid).toFixed(2)),
                  bid_ask_spread_pct: Number(((ask - bid) / bid * 100).toFixed(2)),
                  moneyness: underlyingPrice < strike ? 'itm' : (Math.abs(underlyingPrice - strike) / underlyingPrice < 0.01 ? 'atm' : 'otm'),
                  underlying_price: underlyingPrice
                });
              }
            }
          }
        }
      }
    }

    // Apply strict limit
    const slicedResults = results.slice(0, filters.limit || 100);

    return NextResponse.json({
      contracts: slicedResults,
      total_count: results.length, // Show authentic total match count
      filters_applied: filters
    } as ScreenerResponse);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
