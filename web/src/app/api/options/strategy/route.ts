import { NextRequest, NextResponse } from 'next/server';
import { StrategyCalculationRequest, StrategyCalculation, PnLPoint } from '@/lib/types/options';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Calculate mock P&L for a single leg
function calculateLegPnl(
  leg: { strike: number; option_type: string; action: string; quantity: number; premium: number },
  underlyingPrice: number,
  atExpiration: boolean
): number {
  const isCall = leg.option_type === 'call';
  const isBuy = leg.action === 'buy';
  const multiplier = leg.quantity * 100; // Options are for 100 shares

  let intrinsicValue: number;
  if (isCall) {
    intrinsicValue = Math.max(0, underlyingPrice - leg.strike);
  } else {
    intrinsicValue = Math.max(0, leg.strike - underlyingPrice);
  }

  // At expiration, value = intrinsic value only
  // Before expiration, add some time value
  let optionValue = intrinsicValue;
  if (!atExpiration) {
    const timeValue = leg.premium * 0.3; // Rough time value approximation
    optionValue += timeValue;
  }

  const cost = leg.premium * multiplier;
  const currentValue = optionValue * multiplier;

  if (isBuy) {
    return currentValue - cost;
  } else {
    return cost - currentValue;
  }
}

// Generate mock strategy calculation
function generateMockCalculation(request: StrategyCalculationRequest): StrategyCalculation {
  const { underlying_price, legs, price_range_pct = 0.20, num_points = 100 } = request;

  const minPrice = underlying_price * (1 - price_range_pct);
  const maxPrice = underlying_price * (1 + price_range_pct);
  const priceStep = (maxPrice - minPrice) / num_points;

  const pnl_at_expiration: PnLPoint[] = [];
  const pnl_current: PnLPoint[] = [];
  const greeks_over_price: Array<{ price: number; delta: number; gamma: number; theta: number; vega: number }> = [];

  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  const breakevens: number[] = [];
  let lastPnl = 0;

  for (let i = 0; i <= num_points; i++) {
    const price = minPrice + i * priceStep;

    // Calculate P&L for all legs
    let totalPnlExp = 0;
    let totalPnlCurrent = 0;
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;

    for (const leg of legs) {
      totalPnlExp += calculateLegPnl(leg, price, true);
      totalPnlCurrent += calculateLegPnl(leg, price, false);

      // Rough Greeks approximation
      const direction = leg.action === 'buy' ? 1 : -1;
      const callPutSign = leg.option_type === 'call' ? 1 : -1;
      totalDelta += direction * callPutSign * 0.5 * leg.quantity;
      totalGamma += direction * 0.02 * leg.quantity;
      totalTheta += -direction * 0.03 * leg.quantity;
      totalVega += direction * 0.10 * leg.quantity;
    }

    pnl_at_expiration.push({ price: Math.round(price * 100) / 100, pnl: Math.round(totalPnlExp * 100) / 100 });
    pnl_current.push({ price: Math.round(price * 100) / 100, pnl: Math.round(totalPnlCurrent * 100) / 100 });

    if (i % 5 === 0) {
      greeks_over_price.push({
        price: Math.round(price * 100) / 100,
        delta: Math.round(totalDelta * 1000) / 1000,
        gamma: Math.round(totalGamma * 1000) / 1000,
        theta: Math.round(totalTheta * 1000) / 1000,
        vega: Math.round(totalVega * 1000) / 1000,
      });
    }

    // Track max/min
    if (totalPnlExp > maxProfit) maxProfit = totalPnlExp;
    if (totalPnlExp < maxLoss) maxLoss = totalPnlExp;

    // Find breakevens (where P&L crosses zero)
    if (i > 0 && lastPnl * totalPnlExp < 0) {
      breakevens.push(Math.round(price * 100) / 100);
    }
    lastPnl = totalPnlExp;
  }

  // Calculate net debit/credit
  const netDebitCredit = legs.reduce((sum, leg) => {
    const cost = leg.premium * leg.quantity * 100;
    return leg.action === 'buy' ? sum - cost : sum + cost;
  }, 0);

  // Infer strategy name
  let strategyName = 'Custom Strategy';
  if (legs.length === 1) {
    const action = legs[0].action === 'buy' ? 'Long' : 'Short';
    const type = legs[0].option_type === 'call' ? 'Call' : 'Put';
    strategyName = `${action} ${type}`;
  } else if (legs.length === 2) {
    const types = new Set(legs.map(l => l.option_type));
    const actions = new Set(legs.map(l => l.action));
    if (types.size === 1 && actions.size === 2) {
      strategyName = legs[0].option_type === 'call' ? 'Call Spread' : 'Put Spread';
    } else if (types.size === 2) {
      strategyName = legs[0].strike === legs[1].strike ? 'Straddle' : 'Strangle';
    }
  } else if (legs.length === 4) {
    strategyName = 'Iron Condor';
  }

  return {
    pnl_at_expiration,
    pnl_current,
    greeks: {
      delta: greeks_over_price[Math.floor(greeks_over_price.length / 2)]?.delta || 0,
      gamma: greeks_over_price[Math.floor(greeks_over_price.length / 2)]?.gamma || 0,
      theta: greeks_over_price[Math.floor(greeks_over_price.length / 2)]?.theta || 0,
      vega: greeks_over_price[Math.floor(greeks_over_price.length / 2)]?.vega || 0,
    },
    greeks_over_price,
    max_profit: maxProfit === -Infinity ? 0 : Math.round(maxProfit * 100) / 100,
    max_loss: maxLoss === Infinity ? 0 : Math.abs(Math.round(maxLoss * 100) / 100),
    breakeven_points: breakevens,
    risk_reward_ratio: maxLoss !== 0 ? Math.round((maxProfit / Math.abs(maxLoss)) * 100) / 100 : 0,
    net_debit_credit: Math.round(netDebitCredit * 100) / 100,
    strategy_name: strategyName,
  };
}

export async function POST(request: NextRequest) {
  try {
    const calcRequest: StrategyCalculationRequest = await request.json();

    if (!calcRequest.legs || calcRequest.legs.length === 0) {
      return NextResponse.json(
        { error: 'At least one leg is required' },
        { status: 400 }
      );
    }

    if (!calcRequest.underlying_price || calcRequest.underlying_price <= 0) {
      return NextResponse.json(
        { error: 'Valid underlying price is required' },
        { status: 400 }
      );
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/options/strategy/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calcRequest),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.warn('Backend unavailable for strategy calculation, returning mock data:', error);

      const mockCalc = generateMockCalculation(calcRequest);
      return NextResponse.json({
        ...mockCalc,
        mock: true,
        warning: 'Using simulated data - backend unavailable',
      });
    }
  } catch (error) {
    console.error('Error in strategy calculation:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
