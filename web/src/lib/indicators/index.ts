/**
 * Technical Indicators Library
 * Pure TypeScript implementations for trading chart overlays
 */

export { calculateSMA, type SMAResult } from './sma';
export { calculateEMA, calculateEMAFromValues, type EMAResult } from './ema';
export { calculateRSI, type RSIResult } from './rsi';
export { calculateMACD, type MACDResult } from './macd';
export { calculateBollingerBands, type BollingerBandsResult } from './bollinger';

import type { OHLCVBar } from '@/lib/stores/market-data-store';
import type { IndicatorConfig } from '@/lib/stores/trading-store';
import { calculateSMA } from './sma';
import { calculateEMA } from './ema';
import { calculateRSI } from './rsi';
import { calculateMACD } from './macd';
import { calculateBollingerBands } from './bollinger';

/**
 * Generic indicator result for line overlays
 */
export type LineIndicatorData = {
  time: number;
  value: number;
};

/**
 * Calculate all active indicators for given bars
 * Returns data formatted for lightweight-charts
 */
export function calculateIndicators(
  bars: OHLCVBar[],
  indicators: IndicatorConfig[]
): Map<string, LineIndicatorData[] | { macd: LineIndicatorData[]; signal: LineIndicatorData[]; histogram: LineIndicatorData[] } | { upper: LineIndicatorData[]; middle: LineIndicatorData[]; lower: LineIndicatorData[] }> {
  const results = new Map();

  for (const indicator of indicators) {
    if (!indicator.visible) continue;

    switch (indicator.type) {
      case 'SMA': {
        const smaData = calculateSMA(bars, indicator.params.period || 20);
        results.set(indicator.id, smaData);
        break;
      }
      case 'EMA': {
        const emaData = calculateEMA(bars, indicator.params.period || 12);
        results.set(indicator.id, emaData);
        break;
      }
      case 'RSI': {
        const rsiData = calculateRSI(bars, indicator.params.period || 14);
        results.set(indicator.id, rsiData);
        break;
      }
      case 'MACD': {
        const macdData = calculateMACD(
          bars,
          indicator.params.fast || 12,
          indicator.params.slow || 26,
          indicator.params.signal || 9
        );
        // Transform for chart usage
        results.set(indicator.id, {
          macd: macdData.map((d) => ({ time: d.time, value: d.macd })),
          signal: macdData.map((d) => ({ time: d.time, value: d.signal })),
          histogram: macdData.map((d) => ({ time: d.time, value: d.histogram })),
        });
        break;
      }
      case 'BOLLINGER': {
        const bbData = calculateBollingerBands(
          bars,
          indicator.params.period || 20,
          indicator.params.stdDev || 2
        );
        // Transform for chart usage
        results.set(indicator.id, {
          upper: bbData.map((d) => ({ time: d.time, value: d.upper })),
          middle: bbData.map((d) => ({ time: d.time, value: d.middle })),
          lower: bbData.map((d) => ({ time: d.time, value: d.lower })),
        });
        break;
      }
    }
  }

  return results;
}
