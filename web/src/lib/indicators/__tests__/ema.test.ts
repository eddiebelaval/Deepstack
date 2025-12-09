import { describe, it, expect } from 'vitest';
import { calculateEMA, calculateEMAFromValues } from '../ema';
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

describe('calculateEMA', () => {
  describe('basic calculations', () => {
    it('calculates correct EMA', () => {
      const bars = createMockBars([10, 20, 30, 40, 50, 60]);
      const result = calculateEMA(bars, 3);

      // First EMA = SMA of first 3 values = (10+20+30)/3 = 20
      expect(result[0].value).toBeCloseTo(20, 10);

      // Multiplier = 2/(3+1) = 0.5
      // EMA[1] = (40 - 20) * 0.5 + 20 = 30
      expect(result[1].value).toBeCloseTo(30, 10);

      // EMA[2] = (50 - 30) * 0.5 + 30 = 40
      expect(result[2].value).toBeCloseTo(40, 10);

      // EMA[3] = (60 - 40) * 0.5 + 40 = 50
      expect(result[3].value).toBeCloseTo(50, 10);
    });

    it('returns correct timestamps', () => {
      const bars = createMockBars([10, 20, 30, 40, 50]);
      const result = calculateEMA(bars, 3);

      // First EMA should have timestamp of 3rd bar (index 2)
      expect(result[0].time).toBe(bars[2].time);
      expect(result[1].time).toBe(bars[3].time);
    });

    it('uses default period of 12', () => {
      const bars = createMockBars(Array(15).fill(100));
      const result = calculateEMA(bars);

      expect(result).toHaveLength(4); // 15 - 12 + 1
    });
  });

  describe('EMA vs SMA behavior', () => {
    it('EMA reacts faster to price changes than SMA', () => {
      // Stable prices then sudden jump
      const prices = [100, 100, 100, 100, 100, 150];
      const bars = createMockBars(prices);
      const emaResult = calculateEMA(bars, 5);

      // EMA multiplier = 2/(5+1) = 0.333
      // First EMA = 100 (SMA)
      // Second EMA = (150 - 100) * 0.333 + 100 = 116.67

      // EMA should react to the jump
      expect(emaResult[0].value).toBe(100);
      expect(emaResult[1].value).toBeGreaterThan(100);
      // EMA gives more weight to recent prices
      expect(emaResult[1].value).toBeCloseTo(116.67, 1);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when bars < period', () => {
      const bars = createMockBars([10, 20, 30]);
      const result = calculateEMA(bars, 5);

      expect(result).toHaveLength(0);
    });

    it('returns single value when bars === period', () => {
      const bars = createMockBars([10, 20, 30, 40, 50]);
      const result = calculateEMA(bars, 5);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(30); // SMA of first 5
    });

    it('handles constant prices', () => {
      const bars = createMockBars(Array(10).fill(100));
      const result = calculateEMA(bars, 5);

      // All EMAs should be 100 for constant price
      result.forEach((r) => {
        expect(r.value).toBe(100);
      });
    });
  });

  describe('multiplier calculation', () => {
    it('uses correct multiplier formula 2/(period+1)', () => {
      // For period 12: multiplier = 2/13 = 0.1538
      const bars = createMockBars([...Array(12).fill(100), 200]);
      const result = calculateEMA(bars, 12);

      // First EMA = 100
      // Second EMA = (200 - 100) * 0.1538 + 100 = 115.38
      expect(result[1].value).toBeCloseTo(115.38, 1);
    });
  });
});

describe('calculateEMAFromValues', () => {
  describe('basic calculations', () => {
    it('calculates EMA from raw values', () => {
      const values = [10, 20, 30, 40, 50];
      const result = calculateEMAFromValues(values, 3);

      // First EMA = SMA = (10+20+30)/3 = 20
      expect(result[0]).toBeCloseTo(20, 10);

      // Multiplier = 2/(3+1) = 0.5
      // EMA[1] = (40 - 20) * 0.5 + 20 = 30
      expect(result[1]).toBeCloseTo(30, 10);
    });

    it('returns raw numbers without timestamps', () => {
      const values = [10, 20, 30, 40];
      const result = calculateEMAFromValues(values, 2);

      expect(typeof result[0]).toBe('number');
      expect(result).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when values < period', () => {
      const result = calculateEMAFromValues([10, 20], 5);
      expect(result).toHaveLength(0);
    });

    it('returns single value when values === period', () => {
      const result = calculateEMAFromValues([10, 20, 30], 3);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(20);
    });
  });

  describe('used for MACD calculation', () => {
    it('can calculate signal line from MACD values', () => {
      // Simulate MACD values
      const macdValues = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4];
      const signalPeriod = 9;
      const signal = calculateEMAFromValues(macdValues, signalPeriod);

      expect(signal).toHaveLength(2);
      // First signal = SMA of first 9 MACD values
      const expectedFirstSignal = macdValues.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
      expect(signal[0]).toBeCloseTo(expectedFirstSignal, 10);
    });
  });
});
