import { describe, it, expect } from 'vitest';
import { calculateSMA } from '../sma';
import type { OHLCVBar } from '@/lib/stores/market-data-store';

// Helper to create mock bar data
function createMockBars(closePrices: number[]): OHLCVBar[] {
  return closePrices.map((close, index) => ({
    time: 1700000000 + index * 86400, // Daily bars
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: 1000000,
  }));
}

describe('calculateSMA', () => {
  describe('basic calculations', () => {
    it('calculates correct SMA for simple data', () => {
      const bars = createMockBars([10, 20, 30, 40, 50]);
      const result = calculateSMA(bars, 3);

      // SMA(3) for [10,20,30,40,50]
      // First: (10+20+30)/3 = 20
      // Second: (20+30+40)/3 = 30
      // Third: (30+40+50)/3 = 40
      expect(result).toHaveLength(3);
      expect(result[0].value).toBeCloseTo(20, 10);
      expect(result[1].value).toBeCloseTo(30, 10);
      expect(result[2].value).toBeCloseTo(40, 10);
    });

    it('returns correct timestamps', () => {
      const bars = createMockBars([10, 20, 30, 40, 50]);
      const result = calculateSMA(bars, 3);

      // First SMA value should have timestamp of the 3rd bar (index 2)
      expect(result[0].time).toBe(bars[2].time);
      expect(result[1].time).toBe(bars[3].time);
      expect(result[2].time).toBe(bars[4].time);
    });

    it('uses default period of 20', () => {
      const bars = createMockBars(Array(25).fill(100)); // 25 bars at $100
      const result = calculateSMA(bars);

      // Should have 6 results (25 - 20 + 1)
      expect(result).toHaveLength(6);
      // All values should be 100 (constant price)
      result.forEach((r) => {
        expect(r.value).toBe(100);
      });
    });
  });

  describe('edge cases', () => {
    it('returns empty array when bars < period', () => {
      const bars = createMockBars([10, 20, 30]);
      const result = calculateSMA(bars, 5);

      expect(result).toHaveLength(0);
    });

    it('returns single value when bars === period', () => {
      const bars = createMockBars([10, 20, 30, 40, 50]);
      const result = calculateSMA(bars, 5);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(30); // (10+20+30+40+50)/5
    });

    it('handles single bar data', () => {
      const bars = createMockBars([100]);
      const result = calculateSMA(bars, 1);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(100);
    });

    it('handles empty array', () => {
      const result = calculateSMA([], 5);
      expect(result).toHaveLength(0);
    });
  });

  describe('accuracy with real-world-like data', () => {
    it('calculates SMA correctly for typical stock prices', () => {
      // Simulating a stock price around $150
      const prices = [148.5, 149.2, 150.1, 149.8, 151.3, 152.0, 151.5, 150.9, 152.4, 153.1];
      const bars = createMockBars(prices);
      const result = calculateSMA(bars, 5);

      // Verify first SMA: (148.5+149.2+150.1+149.8+151.3)/5 = 149.78
      expect(result[0].value).toBeCloseTo(149.78, 2);

      // Verify last SMA: (152.0+151.5+150.9+152.4+153.1)/5 = 151.98
      expect(result[result.length - 1].value).toBeCloseTo(151.98, 2);
    });

    it('shows lagging behavior (SMA follows price trend)', () => {
      // Consistently rising prices
      const prices = [100, 102, 104, 106, 108, 110, 112, 114];
      const bars = createMockBars(prices);
      const result = calculateSMA(bars, 4);

      // SMA should always be below current price in uptrend
      for (let i = 0; i < result.length; i++) {
        const currentPriceIndex = i + 3; // SMA starts at index 3
        expect(result[i].value).toBeLessThan(prices[currentPriceIndex]);
      }
    });
  });

  describe('sliding window optimization', () => {
    it('produces consistent results with sliding window', () => {
      const prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 10) * 10);
      const bars = createMockBars(prices);
      const result = calculateSMA(bars, 10);

      // Manually calculate a few SMAs to verify sliding window accuracy
      for (let i = 0; i < 5; i++) {
        const manualSum = prices.slice(i, i + 10).reduce((a, b) => a + b, 0);
        const manualSMA = manualSum / 10;
        expect(result[i].value).toBeCloseTo(manualSMA, 10);
      }
    });
  });
});
