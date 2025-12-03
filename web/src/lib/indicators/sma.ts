/**
 * Simple Moving Average (SMA) calculation
 * SMA = (Sum of closing prices over n periods) / n
 */

import type { OHLCVBar } from '@/lib/stores/market-data-store';

export type SMAResult = {
  time: number;
  value: number;
};

/**
 * Calculate Simple Moving Average
 * @param bars - OHLCV bar data
 * @param period - Number of periods for the average (default: 20)
 * @returns Array of SMA values with timestamps
 */
export function calculateSMA(bars: OHLCVBar[], period: number = 20): SMAResult[] {
  if (bars.length < period) {
    return [];
  }

  const result: SMAResult[] = [];
  let sum = 0;

  // Calculate initial sum for first period
  for (let i = 0; i < period; i++) {
    sum += bars[i].close;
  }

  // First SMA value
  result.push({
    time: bars[period - 1].time,
    value: sum / period,
  });

  // Calculate rest using sliding window
  for (let i = period; i < bars.length; i++) {
    sum = sum - bars[i - period].close + bars[i].close;
    result.push({
      time: bars[i].time,
      value: sum / period,
    });
  }

  return result;
}
