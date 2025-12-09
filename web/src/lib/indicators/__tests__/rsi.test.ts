import { describe, it, expect } from 'vitest';
import { calculateRSI } from '../rsi';
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

describe('calculateRSI', () => {
  describe('basic calculations', () => {
    it('calculates RSI correctly', () => {
      // Create a series with known gains and losses
      // Starting at 100, alternating +5 and -2
      const prices = [100];
      for (let i = 0; i < 20; i++) {
        const lastPrice = prices[prices.length - 1];
        prices.push(i % 2 === 0 ? lastPrice + 5 : lastPrice - 2);
      }

      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      // RSI should be between 0 and 100
      result.forEach((r) => {
        expect(r.value).toBeGreaterThanOrEqual(0);
        expect(r.value).toBeLessThanOrEqual(100);
      });

      // With more gains than losses, RSI should be > 50
      expect(result[0].value).toBeGreaterThan(50);
    });

    it('returns correct timestamps', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      // First RSI should have timestamp of bar at index period (14)
      expect(result[0].time).toBe(bars[14].time);
    });

    it('uses default period of 14', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const bars = createMockBars(prices);
      const result = calculateRSI(bars);

      // Should have 25 - 14 - 1 + 1 = 11 results
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('extreme conditions', () => {
    it('returns 100 for consistently rising prices (no losses)', () => {
      // All gains, no losses
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      // RSI = 100 when avgLoss = 0
      result.forEach((r) => {
        expect(r.value).toBe(100);
      });
    });

    it('returns low RSI for consistently falling prices', () => {
      // All losses, no gains
      const prices = Array.from({ length: 20 }, (_, i) => 200 - i * 2);
      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      // RSI should be close to 0 for all losses
      result.forEach((r) => {
        expect(r.value).toBeLessThan(5);
      });
    });

    it('returns ~50 for equal gains and losses', () => {
      // Alternating equal gains and losses
      const prices = [100];
      for (let i = 0; i < 30; i++) {
        const lastPrice = prices[prices.length - 1];
        prices.push(i % 2 === 0 ? lastPrice + 5 : lastPrice - 5);
      }

      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      // RSI should be around 50 for equal gains/losses
      // Due to Wilder's smoothing, it may not be exactly 50
      expect(result[result.length - 1].value).toBeGreaterThan(40);
      expect(result[result.length - 1].value).toBeLessThan(60);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when bars < period + 1', () => {
      const bars = createMockBars([100, 101, 102, 103, 104]);
      const result = calculateRSI(bars, 14);

      expect(result).toHaveLength(0);
    });

    it('handles single price change after period', () => {
      const prices = Array(16).fill(100);
      prices[15] = 110; // Single gain at the end

      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      expect(result.length).toBeGreaterThan(0);
    });

    it('handles empty array', () => {
      const result = calculateRSI([], 14);
      expect(result).toHaveLength(0);
    });
  });

  describe('Wilder smoothing', () => {
    it('uses Wilder smoothing for subsequent values', () => {
      const prices = [100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107, 106, 108, 107, 109];
      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      // With Wilder smoothing, values should change gradually
      // and not jump dramatically between periods
      if (result.length > 1) {
        const diff = Math.abs(result[1].value - result[0].value);
        expect(diff).toBeLessThan(20); // Reasonable smoothing
      }
    });
  });

  describe('trading signals', () => {
    it('detects oversold conditions (RSI < 30)', () => {
      // Consistently falling with occasional small rises
      const prices = [200];
      for (let i = 0; i < 25; i++) {
        const lastPrice = prices[prices.length - 1];
        // 90% of moves are down
        prices.push(lastPrice + (i % 10 === 0 ? 1 : -2));
      }

      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      // Should have some oversold readings
      const oversoldReadings = result.filter((r) => r.value < 30);
      expect(oversoldReadings.length).toBeGreaterThan(0);
    });

    it('detects overbought conditions (RSI > 70)', () => {
      // Consistently rising with occasional small drops
      const prices = [100];
      for (let i = 0; i < 25; i++) {
        const lastPrice = prices[prices.length - 1];
        // 90% of moves are up
        prices.push(lastPrice + (i % 10 === 0 ? -1 : 2));
      }

      const bars = createMockBars(prices);
      const result = calculateRSI(bars, 14);

      // Should have some overbought readings
      const overboughtReadings = result.filter((r) => r.value > 70);
      expect(overboughtReadings.length).toBeGreaterThan(0);
    });
  });
});
