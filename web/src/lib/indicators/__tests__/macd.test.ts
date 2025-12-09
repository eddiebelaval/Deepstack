import { describe, it, expect } from 'vitest';
import { calculateMACD } from '../macd';
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

describe('calculateMACD', () => {
  describe('basic calculations', () => {
    it('returns MACD, signal, and histogram values', () => {
      // Need at least 26 + 9 - 1 = 34 bars for default MACD
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i);
      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      expect(result.length).toBeGreaterThan(0);

      // Each result should have all three components
      result.forEach((r) => {
        expect(r).toHaveProperty('macd');
        expect(r).toHaveProperty('signal');
        expect(r).toHaveProperty('histogram');
        expect(typeof r.macd).toBe('number');
        expect(typeof r.signal).toBe('number');
        expect(typeof r.histogram).toBe('number');
      });
    });

    it('histogram equals MACD minus Signal', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10);
      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      result.forEach((r) => {
        expect(r.histogram).toBeCloseTo(r.macd - r.signal, 10);
      });
    });

    it('returns correct timestamps', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i);
      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      // Timestamps should be in chronological order
      for (let i = 1; i < result.length; i++) {
        expect(result[i].time).toBeGreaterThan(result[i - 1].time);
      }
    });
  });

  describe('default parameters (12, 26, 9)', () => {
    it('uses default fast=12, slow=26, signal=9', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const bars = createMockBars(prices);

      const defaultResult = calculateMACD(bars);
      const explicitResult = calculateMACD(bars, 12, 26, 9);

      expect(defaultResult).toEqual(explicitResult);
    });
  });

  describe('custom parameters', () => {
    it('accepts custom period values', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const bars = createMockBars(prices);

      // Shorter periods = more results
      const result = calculateMACD(bars, 5, 10, 3);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when bars < minBars', () => {
      const bars = createMockBars([100, 101, 102, 103, 104]);
      const result = calculateMACD(bars);

      expect(result).toHaveLength(0);
    });

    it('handles exactly minimum required bars', () => {
      // Need slowPeriod + signalPeriod - 1 = 26 + 9 - 1 = 34 bars
      const prices = Array.from({ length: 34 }, (_, i) => 100 + i);
      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('handles empty array', () => {
      const result = calculateMACD([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('trend detection', () => {
    it('MACD is positive in strong uptrend', () => {
      // Strong consistent uptrend
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      // In uptrend, fast EMA > slow EMA, so MACD should be positive
      result.forEach((r) => {
        expect(r.macd).toBeGreaterThan(0);
      });
    });

    it('MACD is negative in strong downtrend', () => {
      // Strong consistent downtrend
      const prices = Array.from({ length: 50 }, (_, i) => 200 - i * 2);
      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      // In downtrend, fast EMA < slow EMA, so MACD should be negative
      result.forEach((r) => {
        expect(r.macd).toBeLessThan(0);
      });
    });

    it('MACD approaches zero in sideways market', () => {
      // Oscillating around same price
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 2);
      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      // MACD should stay relatively close to zero
      result.forEach((r) => {
        expect(Math.abs(r.macd)).toBeLessThan(5);
      });
    });
  });

  describe('signal crossovers', () => {
    it('can detect histogram sign changes (crossovers)', () => {
      // Create oscillating prices that should generate crossovers
      const prices: number[] = [];
      for (let i = 0; i < 60; i++) {
        // Create a wave pattern
        prices.push(100 + Math.sin(i / 8) * 15);
      }

      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      // Should have both positive and negative histogram values
      const positiveHistograms = result.filter((r) => r.histogram > 0);
      const negativeHistograms = result.filter((r) => r.histogram < 0);

      // In oscillating market, should see both
      expect(positiveHistograms.length).toBeGreaterThan(0);
      expect(negativeHistograms.length).toBeGreaterThan(0);
    });
  });

  describe('EMA calculation accuracy', () => {
    it('MACD line tracks fast EMA minus slow EMA', () => {
      // For constant prices, both EMAs should equal the price
      // so MACD should be 0
      const prices = Array(50).fill(100);
      const bars = createMockBars(prices);
      const result = calculateMACD(bars);

      result.forEach((r) => {
        expect(r.macd).toBeCloseTo(0, 10);
        expect(r.signal).toBeCloseTo(0, 10);
        expect(r.histogram).toBeCloseTo(0, 10);
      });
    });
  });
});
