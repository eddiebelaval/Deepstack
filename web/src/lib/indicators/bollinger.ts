/**
 * Bollinger Bands calculation
 * Middle Band = 20-period SMA
 * Upper Band = Middle Band + (2 * Standard Deviation)
 * Lower Band = Middle Band - (2 * Standard Deviation)
 */

import type { OHLCVBar } from '@/lib/stores/market-data-store';

export type BollingerBandsResult = {
  time: number;
  upper: number;  // Upper band
  middle: number; // Middle band (SMA)
  lower: number;  // Lower band
};

/**
 * Calculate Bollinger Bands
 * @param bars - OHLCV bar data
 * @param period - Number of periods for the SMA (default: 20)
 * @param stdDev - Number of standard deviations (default: 2)
 * @returns Array of Bollinger Bands values with timestamps
 */
export function calculateBollingerBands(
  bars: OHLCVBar[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult[] {
  if (bars.length < period) {
    return [];
  }

  const result: BollingerBandsResult[] = [];

  for (let i = period - 1; i < bars.length; i++) {
    // Calculate SMA for this window
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += bars[j].close;
    }
    const sma = sum / period;

    // Calculate standard deviation
    let squaredDiffSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = bars[j].close - sma;
      squaredDiffSum += diff * diff;
    }
    const standardDeviation = Math.sqrt(squaredDiffSum / period);

    // Calculate bands
    const upperBand = sma + stdDev * standardDeviation;
    const lowerBand = sma - stdDev * standardDeviation;

    result.push({
      time: bars[i].time,
      upper: upperBand,
      middle: sma,
      lower: lowerBand,
    });
  }

  return result;
}
