/**
 * Moving Average Convergence Divergence (MACD) calculation
 * MACD Line = 12-period EMA - 26-period EMA
 * Signal Line = 9-period EMA of MACD Line
 * Histogram = MACD Line - Signal Line
 */

import type { OHLCVBar } from '@/lib/stores/market-data-store';
import { calculateEMAFromValues } from './ema';

export type MACDResult = {
  time: number;
  macd: number;      // MACD line value
  signal: number;    // Signal line value
  histogram: number; // Histogram value (MACD - Signal)
};

/**
 * Calculate MACD
 * @param bars - OHLCV bar data
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line EMA period (default: 9)
 * @returns Array of MACD values with timestamps
 */
export function calculateMACD(
  bars: OHLCVBar[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult[] {
  // Need at least slowPeriod + signalPeriod - 1 bars
  const minBars = slowPeriod + signalPeriod - 1;
  if (bars.length < minBars) {
    return [];
  }

  const closePrices = bars.map((bar) => bar.close);

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMAFromValues(closePrices, fastPeriod);
  const slowEMA = calculateEMAFromValues(closePrices, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  // Align arrays: slow EMA starts at index slowPeriod - 1
  // fast EMA starts at index fastPeriod - 1
  const macdValues: number[] = [];
  const macdStartIndex = slowPeriod - 1; // Where slow EMA starts in original data

  for (let i = 0; i < slowEMA.length; i++) {
    // Fast EMA at corresponding position
    const fastIndex = i + (slowPeriod - fastPeriod);
    if (fastIndex >= 0 && fastIndex < fastEMA.length) {
      macdValues.push(fastEMA[fastIndex] - slowEMA[i]);
    }
  }

  // Calculate signal line (EMA of MACD)
  const signalLine = calculateEMAFromValues(macdValues, signalPeriod);

  // Build result array
  const result: MACDResult[] = [];
  const signalStartOffset = signalPeriod - 1;

  for (let i = 0; i < signalLine.length; i++) {
    const macdIndex = i + signalStartOffset;
    const barIndex = macdStartIndex + macdIndex;

    if (barIndex < bars.length) {
      result.push({
        time: bars[barIndex].time,
        macd: macdValues[macdIndex],
        signal: signalLine[i],
        histogram: macdValues[macdIndex] - signalLine[i],
      });
    }
  }

  return result;
}
