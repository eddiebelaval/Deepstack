/**
 * Exponential Moving Average (EMA) calculation
 * EMA = (Close - Previous EMA) * multiplier + Previous EMA
 * Multiplier = 2 / (period + 1)
 */

import type { OHLCVBar } from '@/lib/stores/market-data-store';

export type EMAResult = {
  time: number;
  value: number;
};

/**
 * Calculate Exponential Moving Average
 * @param bars - OHLCV bar data
 * @param period - Number of periods for the average (default: 12)
 * @returns Array of EMA values with timestamps
 */
export function calculateEMA(bars: OHLCVBar[], period: number = 12): EMAResult[] {
  if (bars.length < period) {
    return [];
  }

  const result: EMAResult[] = [];
  const multiplier = 2 / (period + 1);

  // Calculate initial SMA for first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += bars[i].close;
  }
  let ema = sum / period;

  result.push({
    time: bars[period - 1].time,
    value: ema,
  });

  // Calculate EMA for remaining bars
  for (let i = period; i < bars.length; i++) {
    ema = (bars[i].close - ema) * multiplier + ema;
    result.push({
      time: bars[i].time,
      value: ema,
    });
  }

  return result;
}

/**
 * Calculate EMA from an array of values (used internally for MACD)
 */
export function calculateEMAFromValues(values: number[], period: number): number[] {
  if (values.length < period) {
    return [];
  }

  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // Calculate initial SMA for first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let ema = sum / period;
  result.push(ema);

  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}
