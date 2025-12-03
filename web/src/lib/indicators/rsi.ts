/**
 * Relative Strength Index (RSI) calculation
 * RSI = 100 - (100 / (1 + RS))
 * RS = Average Gain / Average Loss
 */

import type { OHLCVBar } from '@/lib/stores/market-data-store';

export type RSIResult = {
  time: number;
  value: number;
};

/**
 * Calculate Relative Strength Index
 * @param bars - OHLCV bar data
 * @param period - Number of periods (default: 14)
 * @returns Array of RSI values (0-100) with timestamps
 */
export function calculateRSI(bars: OHLCVBar[], period: number = 14): RSIResult[] {
  if (bars.length < period + 1) {
    return [];
  }

  const result: RSIResult[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate initial average gain and loss (SMA)
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }

  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  result.push({
    time: bars[period].time,
    value: rsi,
  });

  // Calculate subsequent RSI values using Wilder's smoothing
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    const currentRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const currentRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + currentRs);

    result.push({
      time: bars[i + 1].time,
      value: currentRsi,
    });
  }

  return result;
}
