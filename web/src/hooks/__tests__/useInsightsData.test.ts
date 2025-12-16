// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInsightsData } from '../useInsightsData';
import type { JournalEntry } from '@/lib/stores/journal-store';
import type { Thesis } from '@/lib/types/thesis';

// Mock dependencies - using mutable state objects
let mockEntries: JournalEntry[] = [];
let mockTheses: Thesis[] = [];
let mockIsJournalLoading = false;
let mockIsThesisLoading = false;

const mockGetActiveTheses = vi.fn(() => mockTheses.filter((t) => t.status === 'active'));

vi.mock('../useJournalSync', () => ({
  useJournalSync: () => ({
    get entries() { return mockEntries; },
    get isLoading() { return mockIsJournalLoading; },
  }),
}));

vi.mock('../useThesisSync', () => ({
  useThesisSync: () => ({
    get theses() { return mockTheses; },
    getActiveTheses: mockGetActiveTheses,
    get isLoading() { return mockIsThesisLoading; },
  }),
}));

// Test data factory
function createJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: `entry-${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    symbol: 'AAPL',
    tradeDate: new Date('2024-01-01T10:00:00Z').toISOString(),
    direction: 'long',
    entryPrice: 150,
    exitPrice: 155,
    quantity: 100,
    pnl: 500,
    pnlPercent: 3.33,
    emotionAtEntry: 'confident',
    emotionAtExit: 'relief',
    notes: 'Test trade',
    ...overrides,
  };
}

function createThesis(overrides: Partial<Thesis> = {}): Thesis {
  return {
    id: `thesis-${Date.now()}-${Math.random()}`,
    title: 'Test Thesis',
    content: 'Test content',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Thesis;
}

describe('useInsightsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEntries = [];
    mockTheses = [];
    mockIsJournalLoading = false;
    mockIsThesisLoading = false;
  });

  describe('Loading States', () => {
    it('returns loading state when journal is loading', () => {
      mockIsJournalLoading = true;
      const { result } = renderHook(() => useInsightsData());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns loading state when thesis is loading', () => {
      mockIsThesisLoading = true;
      const { result } = renderHook(() => useInsightsData());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns not loading when both stores are ready', () => {
      mockIsJournalLoading = false;
      mockIsThesisLoading = false;
      const { result } = renderHook(() => useInsightsData());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Stats - No Data', () => {
    it('returns empty stats when no entries', () => {
      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats).toEqual({
        winRate: 0,
        totalPnL: 0,
        totalTrades: 0,
        activeTheses: 0,
        topSymbols: [],
        emotionalEdge: {},
      });
    });

    it('returns hasData as false when no entries', () => {
      const { result } = renderHook(() => useInsightsData());

      expect(result.current.hasData).toBe(false);
    });

    it('returns hasData as true when entries exist', () => {
      mockEntries.push(createJournalEntry());
      const { result } = renderHook(() => useInsightsData());

      expect(result.current.hasData).toBe(true);
    });
  });

  describe('Stats - Basic Calculations', () => {
    it('calculates win rate correctly', () => {
      mockEntries.push(
        createJournalEntry({ pnl: 100 }), // Win
        createJournalEntry({ pnl: -50 }), // Loss
        createJournalEntry({ pnl: 200 }), // Win
        createJournalEntry({ pnl: 150 })  // Win
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.winRate).toBe(75); // 3 wins out of 4
      expect(result.current.stats.totalTrades).toBe(4);
    });

    it('calculates total PnL correctly', () => {
      mockEntries.push(
        createJournalEntry({ pnl: 100 }),
        createJournalEntry({ pnl: -50 }),
        createJournalEntry({ pnl: 200 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.totalPnL).toBe(250);
    });

    it('only counts closed trades (with exitPrice)', () => {
      mockEntries.push(
        createJournalEntry({ exitPrice: 155, pnl: 100 }), // Closed
        createJournalEntry({ exitPrice: undefined, pnl: undefined }), // Open
        createJournalEntry({ exitPrice: 145, pnl: -50 }) // Closed
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.totalTrades).toBe(2); // Only closed trades
    });

    it('counts active theses', () => {
      mockTheses.push(
        createThesis({ status: 'active' }),
        createThesis({ status: 'active' }),
        createThesis({ status: 'validated' }),
        createThesis({ status: 'invalidated' })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.activeTheses).toBe(2);
    });
  });

  describe('Stats - Symbol Analysis', () => {
    it('identifies top symbols by trade count', () => {
      mockEntries.push(
        createJournalEntry({ symbol: 'AAPL', pnl: 100 }),
        createJournalEntry({ symbol: 'AAPL', pnl: 50 }),
        createJournalEntry({ symbol: 'AAPL', pnl: -25 }),
        createJournalEntry({ symbol: 'MSFT', pnl: 100 }),
        createJournalEntry({ symbol: 'MSFT', pnl: 100 }),
        createJournalEntry({ symbol: 'TSLA', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.topSymbols).toHaveLength(3);
      expect(result.current.stats.topSymbols[0]).toEqual({
        symbol: 'AAPL',
        count: 3,
        winRate: expect.closeTo(66.67, 0.01),
      });
      expect(result.current.stats.topSymbols[1].symbol).toBe('MSFT');
      expect(result.current.stats.topSymbols[1].count).toBe(2);
    });

    it('limits top symbols to 3', () => {
      mockEntries.push(
        createJournalEntry({ symbol: 'AAPL', pnl: 100 }),
        createJournalEntry({ symbol: 'AAPL', pnl: 100 }),
        createJournalEntry({ symbol: 'MSFT', pnl: 100 }),
        createJournalEntry({ symbol: 'MSFT', pnl: 100 }),
        createJournalEntry({ symbol: 'TSLA', pnl: 100 }),
        createJournalEntry({ symbol: 'GOOGL', pnl: 100 }),
        createJournalEntry({ symbol: 'AMZN', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.topSymbols).toHaveLength(3);
    });

    it('normalizes symbols to uppercase', () => {
      mockEntries.push(
        createJournalEntry({ symbol: 'aapl', pnl: 100 }),
        createJournalEntry({ symbol: 'AAPL', pnl: 100 }),
        createJournalEntry({ symbol: 'Aapl', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.topSymbols).toHaveLength(1);
      expect(result.current.stats.topSymbols[0].symbol).toBe('AAPL');
      expect(result.current.stats.topSymbols[0].count).toBe(3);
    });
  });

  describe('Stats - Emotional Edge', () => {
    it('identifies best and worst emotions with minimum sample size', () => {
      mockEntries.push(
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: -50 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: -50 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.emotionalEdge.bestEmotion).toEqual({
        emotion: 'confident',
        winRate: 100,
        count: 2,
      });
      expect(result.current.stats.emotionalEdge.worstEmotion).toEqual({
        emotion: 'anxious',
        winRate: 0,
        count: 2,
      });
    });

    it('requires minimum 2 trades per emotion', () => {
      mockEntries.push(
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }), // Only 1 trade
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.emotionalEdge.bestEmotion?.emotion).toBe('anxious');
      expect(result.current.stats.emotionalEdge.worstEmotion?.emotion).toBe('anxious');
    });

    it('handles no emotions meeting minimum sample size', () => {
      mockEntries.push(
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'greedy', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.stats.emotionalEdge.bestEmotion).toBeUndefined();
      expect(result.current.stats.emotionalEdge.worstEmotion).toBeUndefined();
    });
  });

  describe('Patterns - Day of Week Analysis', () => {
    it('analyzes performance by day of week', () => {
      mockEntries.push(
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: 100 }), // Monday
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: 100 }), // Monday
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: -50 }), // Tuesday
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: -50 })  // Tuesday
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.dayOfWeek.allDays.length).toBeGreaterThan(0);
      expect(result.current.patterns.dayOfWeek.best).toBeTruthy();
      expect(result.current.patterns.dayOfWeek.worst).toBeTruthy();
    });

    it('requires minimum 2 trades per day for best/worst', () => {
      mockEntries.push(
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: 100 }), // Only 1 trade
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: 100 }), // Only 1 trade
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.dayOfWeek.best).toBeNull();
      expect(result.current.patterns.dayOfWeek.worst).toBeNull();
    });

    it('returns default patterns when less than 2 trades', () => {
      mockEntries.push(createJournalEntry({ pnl: 100 }));

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.dayOfWeek.best).toBeNull();
      expect(result.current.patterns.dayOfWeek.worst).toBeNull();
      expect(result.current.patterns.dayOfWeek.allDays).toEqual([]);
    });
  });

  describe('Patterns - Time of Day Analysis', () => {
    it('categorizes trades by time period', () => {
      mockEntries.push(
        createJournalEntry({ createdAt: '2024-01-01T05:00:00Z', pnl: 100 }), // Pre-market (hour 5 UTC)
        createJournalEntry({ createdAt: '2024-01-01T05:00:00Z', pnl: 100 }), // Pre-market
        createJournalEntry({ createdAt: '2024-01-01T10:00:00Z', pnl: -50 }), // Morning (hour 10 UTC)
        createJournalEntry({ createdAt: '2024-01-01T10:00:00Z', pnl: -50 })  // Morning
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.timeOfDay.allPeriods.length).toBeGreaterThan(0);
      // Just check that best and worst exist, time periods may vary by timezone
      expect(result.current.patterns.timeOfDay.best).toBeTruthy();
      expect(result.current.patterns.timeOfDay.worst).toBeTruthy();
      expect(result.current.patterns.timeOfDay.best?.winRate).toBeGreaterThan(
        result.current.patterns.timeOfDay.worst?.winRate
      );
    });

    it('requires minimum 2 trades per period', () => {
      mockEntries.push(
        createJournalEntry({ createdAt: '2024-01-01T05:00:00Z', pnl: 100 }),
        createJournalEntry({ createdAt: '2024-01-01T10:00:00Z', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.timeOfDay.best).toBeNull();
      expect(result.current.patterns.timeOfDay.worst).toBeNull();
    });
  });

  describe('Patterns - Emotion Correlations', () => {
    it('calculates detailed emotion statistics', () => {
      mockEntries.push(
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'confident', pnl: -50 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: -50 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: -50 })
      );

      const { result } = renderHook(() => useInsightsData());

      const confidentCorr = result.current.patterns.emotionCorrelations.find(
        (e) => e.emotion === 'confident'
      );
      expect(confidentCorr).toBeDefined();
      expect(confidentCorr?.totalTrades).toBe(3);
      expect(confidentCorr?.winRate).toBeCloseTo(66.67, 0.01);
      expect(confidentCorr?.avgWinPnL).toBe(100);
    });

    it('requires minimum 2 trades per emotion', () => {
      mockEntries.push(
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.emotionCorrelations).toHaveLength(1);
      expect(result.current.patterns.emotionCorrelations[0].emotion).toBe('anxious');
    });

    it('sorts emotions by win rate descending', () => {
      mockEntries.push(
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: -50 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.emotionCorrelations[0].winRate).toBeGreaterThan(
        result.current.patterns.emotionCorrelations[1].winRate
      );
    });
  });

  describe('Patterns - Streak Analysis', () => {
    it('calculates current winning streak', () => {
      mockEntries.push(
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: 100 }),
        createJournalEntry({ tradeDate: '2024-01-03T10:00:00Z', pnl: 100 }),
        createJournalEntry({ tradeDate: '2024-01-04T10:00:00Z', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.streaks.currentStreak).toBe(3);
      expect(result.current.patterns.streaks.streakType).toBe('wins');
    });

    it('calculates current losing streak', () => {
      mockEntries.push(
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: 100 }),
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-03T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-04T10:00:00Z', pnl: -50 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.streaks.currentStreak).toBe(3);
      expect(result.current.patterns.streaks.streakType).toBe('losses');
    });

    it('tracks longest win and loss streaks', () => {
      mockEntries.push(
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: 100 }),
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: 100 }),
        createJournalEntry({ tradeDate: '2024-01-03T10:00:00Z', pnl: 100 }),
        createJournalEntry({ tradeDate: '2024-01-04T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-05T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-06T10:00:00Z', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.streaks.longestWinStreak).toBe(3);
      expect(result.current.patterns.streaks.longestLossStreak).toBe(2);
    });
  });

  describe('Patterns - Hold Time Analysis', () => {
    it('calculates average hold time for winners and losers', () => {
      const now = new Date('2024-01-10T10:00:00Z');
      mockEntries.push(
        createJournalEntry({
          tradeDate: '2024-01-01T10:00:00Z',
          updatedAt: now.toISOString(),
          pnl: 100,
        }),
        createJournalEntry({
          tradeDate: '2024-01-05T10:00:00Z',
          updatedAt: now.toISOString(),
          pnl: -50,
        })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.holdTime.avgWinnerHoldDays).toBeCloseTo(9, 0);
      expect(result.current.patterns.holdTime.avgLoserHoldDays).toBeCloseTo(5, 0);
    });

    it('generates insight when winners held longer', () => {
      const now = new Date('2024-01-10T10:00:00Z');
      mockEntries.push(
        createJournalEntry({
          tradeDate: '2024-01-01T10:00:00Z',
          updatedAt: now.toISOString(),
          pnl: 100,
        }),
        createJournalEntry({
          tradeDate: '2024-01-08T10:00:00Z',
          updatedAt: now.toISOString(),
          pnl: -50,
        })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.holdTime.holdTimeInsight).toContain('hold winners longer');
    });

    it('generates insight when losers held longer', () => {
      const now = new Date('2024-01-10T10:00:00Z');
      mockEntries.push(
        createJournalEntry({
          tradeDate: '2024-01-08T10:00:00Z',
          updatedAt: now.toISOString(),
          pnl: 100,
        }),
        createJournalEntry({
          tradeDate: '2024-01-01T10:00:00Z',
          updatedAt: now.toISOString(),
          pnl: -50,
        })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.holdTime.holdTimeInsight).toContain('hold losers longer');
    });
  });

  describe('Patterns - Thesis Validation', () => {
    it('calculates thesis validation rate', () => {
      mockTheses.push(
        createThesis({ status: 'validated' }),
        createThesis({ status: 'validated' }),
        createThesis({ status: 'validated' }),
        createThesis({ status: 'invalidated' })
      );
      mockEntries.push(createJournalEntry(), createJournalEntry());

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.thesisValidationRate).toBe(75);
    });

    it('returns null when no resolved theses', () => {
      mockTheses.push(
        createThesis({ status: 'active' }),
        createThesis({ status: 'active' })
      );
      mockEntries.push(createJournalEntry(), createJournalEntry());

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.patterns.thesisValidationRate).toBeNull();
    });
  });

  describe('Recommendations', () => {
    it('returns empty recommendations with less than 3 trades', () => {
      mockEntries.push(
        createJournalEntry({ pnl: 100 }),
        createJournalEntry({ pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      expect(result.current.recommendations).toEqual([]);
    });

    it('recommends avoiding worst emotion when win rate < 40%', () => {
      mockEntries.push(
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: -50 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: -50 }),
        createJournalEntry({ emotionAtEntry: 'anxious', pnl: -50 })
      );

      const { result } = renderHook(() => useInsightsData());

      const emotionRec = result.current.recommendations.find((r) => r.type === 'emotion');
      expect(emotionRec).toBeDefined();
      expect(emotionRec?.priority).toBe('high');
      expect(emotionRec?.message).toContain('anxious');
    });

    it('highlights best emotion when win rate > 65%', () => {
      mockEntries.push(
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 }),
        createJournalEntry({ emotionAtEntry: 'confident', pnl: -50 })
      );

      const { result } = renderHook(() => useInsightsData());

      const emotionRec = result.current.recommendations.find(
        (r) => r.type === 'emotion' && r.priority === 'low'
      );
      expect(emotionRec).toBeDefined();
      expect(emotionRec?.message).toContain('perform best');
    });

    it('warns about losing streaks >= 3', () => {
      mockEntries.push(
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-03T10:00:00Z', pnl: -50 })
      );

      const { result } = renderHook(() => useInsightsData());

      const streakRec = result.current.recommendations.find((r) => r.type === 'streak');
      expect(streakRec).toBeDefined();
      expect(streakRec?.priority).toBe('high');
      expect(streakRec?.message).toContain('losing streak');
    });

    it('acknowledges winning streaks >= 3', () => {
      mockEntries.push(
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: 100 }),
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: 100 }),
        createJournalEntry({ tradeDate: '2024-01-03T10:00:00Z', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      const streakRec = result.current.recommendations.find((r) => r.type === 'streak');
      expect(streakRec).toBeDefined();
      expect(streakRec?.priority).toBe('low');
      expect(streakRec?.message).toContain('wins');
    });

    it('sorts recommendations by priority (high, medium, low)', () => {
      mockEntries.push(
        createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: -50 }),
        createJournalEntry({ tradeDate: '2024-01-03T10:00:00Z', pnl: -50 }),
        createJournalEntry({ emotionAtEntry: 'confident', pnl: 100 })
      );

      const { result } = renderHook(() => useInsightsData());

      const priorities = result.current.recommendations.map((r) => r.priority);
      const highIndex = priorities.indexOf('high');
      const lowIndex = priorities.indexOf('low');

      if (highIndex !== -1 && lowIndex !== -1) {
        expect(highIndex).toBeLessThan(lowIndex);
      }
    });
  });

  describe('Memoization', () => {
    it('memoizes stats calculation', () => {
      mockEntries.push(createJournalEntry({ pnl: 100 }));
      const { result, rerender } = renderHook(() => useInsightsData());

      const firstStats = result.current.stats;
      rerender();
      const secondStats = result.current.stats;

      // Should return same object reference when entries haven't changed
      expect(firstStats).toBe(secondStats);
    });

    it('recalculates stats when entries array identity changes', () => {
      const entry1 = createJournalEntry({ pnl: 100 });
      mockEntries = [entry1];

      const { result, rerender } = renderHook(() => useInsightsData());
      expect(result.current.stats.totalTrades).toBe(1);

      // Change entries array identity
      const entry2 = createJournalEntry({ pnl: 100 });
      mockEntries = [entry1, entry2];
      rerender();

      expect(result.current.stats.totalTrades).toBe(2);
    });

    it('recalculates patterns when entries array identity changes', () => {
      // Start with 2 entries to meet minimum for patterns
      const entry1 = createJournalEntry({ tradeDate: '2024-01-01T10:00:00Z', pnl: 100 });
      const entry2 = createJournalEntry({ tradeDate: '2024-01-02T10:00:00Z', pnl: 100 });
      mockEntries = [entry1, entry2];

      const { result, rerender } = renderHook(() => useInsightsData());
      expect(result.current.patterns.streaks.currentStreak).toBe(2);

      // Change entries array identity with 3rd entry
      const entry3 = createJournalEntry({ tradeDate: '2024-01-03T10:00:00Z', pnl: 100 });
      mockEntries = [entry1, entry2, entry3];
      rerender();

      expect(result.current.patterns.streaks.currentStreak).toBe(3);
    });
  });
});
