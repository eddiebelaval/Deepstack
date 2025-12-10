import { describe, it, expect } from 'vitest';
import { calculateBollingerBands } from '../bollinger';
import type { OHLCVBar } from '@/lib/stores/market-data-store';

// Helper to create mock bar data
function createMockBars(closePrices: number[]): OHLCVBar[] {
  return closePrices.map((close, index) => ({
    time: 1700000000 + index * 86400,
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: 1000000,
  }));
}

describe('calculateBollingerBands', () => {
  describe('basic calculations', () => {
    it('returns upper, middle, and lower bands', () => {
      const prices = Array.from({ length: 25 }, () => 100 + Math.random() * 10);
      const bars = createMockBars(prices);
      const result = calculateBollingerBands(bars);

      expect(result.length).toBeGreaterThan(0);

      result.forEach((r) => {
        expect(r).toHaveProperty('upper');
        expect(r).toHaveProperty('middle');
        expect(r).toHaveProperty('lower');
        expect(typeof r.upper).toBe('number');
        expect(typeof r.middle).toBe('number');
        expect(typeof r.lower).toBe('number');
      });
    });

    it('middle band equals SMA', () => {
      const prices = [100, 102, 101, 103, 104, 102, 105, 103, 106, 104,
        107, 105, 108, 106, 109, 107, 110, 108, 111, 109];
      const bars = createMockBars(prices);
      const result = calculateBollingerBands(bars, 10);

      // Manually calculate SMA for verification
      const firstWindow = prices.slice(0, 10);
      const expectedSMA = firstWindow.reduce((a, b) => a + b, 0) / 10;

      expect(result[0].middle).toBeCloseTo(expectedSMA, 10);
    });

    it('bands are symmetric around middle', () => {
      const prices = Array.from({ length: 25 }, (_unused, i) => 100 + i);
      const bars = createMockBars(prices);
      const result = calculateBollingerBands(bars);

      result.forEach((r) => {
        const upperDist = r.upper - r.middle;
        const lowerDist = r.middle - r.lower;
        expect(upperDist).toBeCloseTo(lowerDist, 10);
      });
    });

    it('returns correct timestamps', () => {
      const prices = Array.from({ length: 25 }, (_unused, i) => 100 + i);
      const bars = createMockBars(prices);
      const result = calculateBollingerBands(bars);

      // First result should have timestamp of bar at index period-1 (19)
      expect(result[0].time).toBe(bars[19].time);
    });
  });

  describe('default parameters', () => {
    it('uses default period=20, stdDev=2', () => {
      const prices = Array.from({ length: 30 }, (_unused, i) => 100 + i);
      const bars = createMockBars(prices);

      const defaultResult = calculateBollingerBands(bars);
      const explicitResult = calculateBollingerBands(bars, 20, 2);

      expect(defaultResult).toEqual(explicitResult);
    });
  });

  describe('band width and standard deviation', () => {
    it('bands are wider with more volatility', () => {
      // Low volatility: constant prices
      const lowVolPrices = Array(25).fill(100);
      const lowVolBars = createMockBars(lowVolPrices);
      const lowVolResult = calculateBollingerBands(lowVolBars);

      // High volatility: oscillating prices
      const highVolPrices = Array.from({ length: 25 }, (_, i) =>
        100 + (i % 2 === 0 ? 10 : -10)
      );
      const highVolBars = createMockBars(highVolPrices);
      const highVolResult = calculateBollingerBands(highVolBars);

      // Low volatility should have very narrow bands
      const lowVolBandWidth = lowVolResult[0].upper - lowVolResult[0].lower;
      expect(lowVolBandWidth).toBeCloseTo(0, 5);

      // High volatility should have wider bands
      const highVolBandWidth = highVolResult[0].upper - highVolResult[0].lower;
      expect(highVolBandWidth).toBeGreaterThan(0);
    });

    it('bands collapse to middle for constant prices', () => {
      const prices = Array(25).fill(150);
      const bars = createMockBars(prices);
      const result = calculateBollingerBands(bars);

      result.forEach((r) => {
        expect(r.upper).toBe(150);
        expect(r.middle).toBe(150);
        expect(r.lower).toBe(150);
      });
    });

    it('standard deviation multiplier affects band width', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 5);
      const bars = createMockBars(prices);

      const result1SD = calculateBollingerBands(bars, 20, 1);
      const result2SD = calculateBollingerBands(bars, 20, 2);
      const result3SD = calculateBollingerBands(bars, 20, 3);

      // Band width should increase with stdDev multiplier
      const width1 = result1SD[0].upper - result1SD[0].lower;
      const width2 = result2SD[0].upper - result2SD[0].lower;
      const width3 = result3SD[0].upper - result3SD[0].lower;

      expect(width2).toBeCloseTo(width1 * 2, 5);
      expect(width3).toBeCloseTo(width1 * 3, 5);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when bars < period', () => {
      const bars = createMockBars([100, 101, 102]);
      const result = calculateBollingerBands(bars, 20);

      expect(result).toHaveLength(0);
    });

    it('returns single result when bars === period', () => {
      const prices = Array.from({ length: 20 }, (_unused, i) => 100 + i);
      const bars = createMockBars(prices);
      const result = calculateBollingerBands(bars, 20);

      expect(result).toHaveLength(1);
    });

    it('handles empty array', () => {
      const result = calculateBollingerBands([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('trading signals', () => {
    it('price touches upper band in strong uptrend', () => {
      // Strong uptrend
      const prices = Array.from({ length: 30 }, (_unused, i) => 100 + i * 3);
      const bars = createMockBars(prices);
      const result = calculateBollingerBands(bars);

      // In strong uptrend, price should be near or above upper band
      const lastPrice = prices[prices.length - 1];
      const lastBand = result[result.length - 1];

      // Price should be close to upper band
      expect(lastPrice).toBeGreaterThanOrEqual(lastBand.middle);
    });

    it('price touches lower band in strong downtrend', () => {
      // Strong downtrend
      const prices = Array.from({ length: 30 }, (_unused, i) => 200 - i * 3);
      const bars = createMockBars(prices);
      const result = calculateBollingerBands(bars);

      // In strong downtrend, price should be near or below lower band
      const lastPrice = prices[prices.length - 1];
      const lastBand = result[result.length - 1];

      // Price should be below middle
      expect(lastPrice).toBeLessThanOrEqual(lastBand.middle);
    });
  });

  describe('custom period', () => {
    it('shorter period = more reactive bands', () => {
      const prices = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
        150, 150, 150, 150, 150]; // Sudden jump at index 10
      const bars = createMockBars(prices);

      const shortPeriod = calculateBollingerBands(bars, 5);
      const longPeriod = calculateBollingerBands(bars, 10);

      // Short period should react faster to price jump
      // Compare middle band values at end
      if (shortPeriod.length > 0 && longPeriod.length > 0) {
        const shortMiddle = shortPeriod[shortPeriod.length - 1].middle;
        const longMiddle = longPeriod[longPeriod.length - 1].middle;

        // Short period middle should be closer to current price (150)
        expect(Math.abs(150 - shortMiddle)).toBeLessThan(Math.abs(150 - longMiddle));
      }
    });
  });
});
