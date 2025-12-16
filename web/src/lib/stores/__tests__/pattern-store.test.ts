import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePatternStore } from '../pattern-store';
import { useJournalStore } from '../journal-store';
import { act } from '@testing-library/react';

// Mock the journal store
vi.mock('../journal-store', () => ({
  useJournalStore: {
    getState: vi.fn(() => ({ entries: [] })),
  },
}));

describe('usePatternStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      usePatternStore.setState({
        patterns: [],
        insights: [],
        lastAnalyzed: null,
        privacyConsent: false,
      });
    });

    // Reset journal store mock
    vi.mocked(useJournalStore.getState).mockReturnValue({ entries: [] } as any);
  });

  describe('initial state', () => {
    it('has empty patterns array', () => {
      const state = usePatternStore.getState();
      expect(state.patterns).toEqual([]);
    });

    it('has empty insights array', () => {
      const state = usePatternStore.getState();
      expect(state.insights).toEqual([]);
    });

    it('has no last analyzed time', () => {
      const state = usePatternStore.getState();
      expect(state.lastAnalyzed).toBeNull();
    });

    it('has privacy consent disabled by default', () => {
      const state = usePatternStore.getState();
      expect(state.privacyConsent).toBe(false);
    });
  });

  describe('setPrivacyConsent', () => {
    it('enables privacy consent', () => {
      act(() => {
        usePatternStore.getState().setPrivacyConsent(true);
      });

      expect(usePatternStore.getState().privacyConsent).toBe(true);
    });

    it('disables privacy consent', () => {
      act(() => {
        usePatternStore.getState().setPrivacyConsent(true);
        usePatternStore.getState().setPrivacyConsent(false);
      });

      expect(usePatternStore.getState().privacyConsent).toBe(false);
    });
  });

  describe('clearPatterns', () => {
    it('clears all patterns', () => {
      act(() => {
        usePatternStore.setState({
          patterns: [
            {
              id: 'test-pattern',
              type: 'emotion',
              title: 'Test Pattern',
              description: 'Test description',
              confidence: 80,
              occurrences: 5,
              impact: 'negative',
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            },
          ],
        });
        usePatternStore.getState().clearPatterns();
      });

      expect(usePatternStore.getState().patterns).toEqual([]);
    });

    it('clears all insights', () => {
      act(() => {
        usePatternStore.setState({
          insights: [
            {
              id: 'test-insight',
              pattern: {
                id: 'test-pattern',
                type: 'emotion',
                title: 'Test Pattern',
                description: 'Test description',
                confidence: 80,
                occurrences: 5,
                impact: 'negative',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
              },
              suggestion: 'Test suggestion',
              dismissed: false,
            },
          ],
        });
        usePatternStore.getState().clearPatterns();
      });

      expect(usePatternStore.getState().insights).toEqual([]);
    });

    it('clears last analyzed time', () => {
      act(() => {
        usePatternStore.setState({ lastAnalyzed: new Date().toISOString() });
        usePatternStore.getState().clearPatterns();
      });

      expect(usePatternStore.getState().lastAnalyzed).toBeNull();
    });
  });

  describe('dismissInsight', () => {
    it('marks insight as dismissed', () => {
      const insight = {
        id: 'test-insight',
        pattern: {
          id: 'test-pattern',
          type: 'emotion' as const,
          title: 'Test Pattern',
          description: 'Test description',
          confidence: 80,
          occurrences: 5,
          impact: 'negative' as const,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
        suggestion: 'Test suggestion',
        dismissed: false,
      };

      act(() => {
        usePatternStore.setState({ insights: [insight] });
        usePatternStore.getState().dismissInsight('test-insight');
      });

      const dismissedInsight = usePatternStore.getState().insights[0];
      expect(dismissedInsight.dismissed).toBe(true);
    });

    it('only affects target insight', () => {
      const insights = [
        {
          id: 'insight-1',
          pattern: {
            id: 'pattern-1',
            type: 'emotion' as const,
            title: 'Pattern 1',
            description: 'Description 1',
            confidence: 80,
            occurrences: 5,
            impact: 'negative' as const,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
          suggestion: 'Suggestion 1',
          dismissed: false,
        },
        {
          id: 'insight-2',
          pattern: {
            id: 'pattern-2',
            type: 'emotion' as const,
            title: 'Pattern 2',
            description: 'Description 2',
            confidence: 80,
            occurrences: 5,
            impact: 'negative' as const,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
          suggestion: 'Suggestion 2',
          dismissed: false,
        },
      ];

      act(() => {
        usePatternStore.setState({ insights });
        usePatternStore.getState().dismissInsight('insight-1');
      });

      const state = usePatternStore.getState();
      expect(state.insights[0].dismissed).toBe(true);
      expect(state.insights[1].dismissed).toBe(false);
    });
  });

  describe('getActiveInsights', () => {
    it('returns only non-dismissed insights', () => {
      const insights = [
        {
          id: 'insight-1',
          pattern: {
            id: 'pattern-1',
            type: 'emotion' as const,
            title: 'Pattern 1',
            description: 'Description 1',
            confidence: 80,
            occurrences: 5,
            impact: 'negative' as const,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
          suggestion: 'Suggestion 1',
          dismissed: false,
        },
        {
          id: 'insight-2',
          pattern: {
            id: 'pattern-2',
            type: 'emotion' as const,
            title: 'Pattern 2',
            description: 'Description 2',
            confidence: 80,
            occurrences: 5,
            impact: 'negative' as const,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
          suggestion: 'Suggestion 2',
          dismissed: true,
        },
      ];

      act(() => {
        usePatternStore.setState({ insights });
      });

      const activeInsights = usePatternStore.getState().getActiveInsights();
      expect(activeInsights).toHaveLength(1);
      expect(activeInsights[0].id).toBe('insight-1');
    });

    it('returns empty array when no insights exist', () => {
      const activeInsights = usePatternStore.getState().getActiveInsights();
      expect(activeInsights).toEqual([]);
    });

    it('returns empty array when all insights are dismissed', () => {
      const insights = [
        {
          id: 'insight-1',
          pattern: {
            id: 'pattern-1',
            type: 'emotion' as const,
            title: 'Pattern 1',
            description: 'Description 1',
            confidence: 80,
            occurrences: 5,
            impact: 'negative' as const,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
          suggestion: 'Suggestion 1',
          dismissed: true,
        },
      ];

      act(() => {
        usePatternStore.setState({ insights });
      });

      const activeInsights = usePatternStore.getState().getActiveInsights();
      expect(activeInsights).toEqual([]);
    });
  });

  describe('analyzeJournalPatterns', () => {
    it('does nothing when privacy consent is not given', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          {
            id: '1',
            symbol: 'AAPL',
            emotionAtEntry: 'confident',
            pnl: 100,
            pnlPercent: 5,
            createdAt: new Date().toISOString(),
          },
        ],
      } as any);

      act(() => {
        usePatternStore.getState().analyzeJournalPatterns();
      });

      expect(usePatternStore.getState().patterns).toEqual([]);
      expect(usePatternStore.getState().lastAnalyzed).toBeNull();
    });

    it('does nothing when insufficient journal entries', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          {
            id: '1',
            symbol: 'AAPL',
            emotionAtEntry: 'confident',
            pnl: 100,
            pnlPercent: 5,
            createdAt: new Date().toISOString(),
          },
        ],
      } as any);

      act(() => {
        usePatternStore.setState({ privacyConsent: true });
        usePatternStore.getState().analyzeJournalPatterns();
      });

      expect(usePatternStore.getState().patterns).toEqual([]);
    });

    it('detects negative emotion patterns', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          { id: '1', symbol: 'AAPL', emotionAtEntry: 'fearful', pnl: -100, pnlPercent: -5, createdAt: new Date().toISOString() },
          { id: '2', symbol: 'MSFT', emotionAtEntry: 'fearful', pnl: -50, pnlPercent: -3, createdAt: new Date().toISOString() },
          { id: '3', symbol: 'GOOGL', emotionAtEntry: 'fearful', pnl: -75, pnlPercent: -4, createdAt: new Date().toISOString() },
        ],
      } as any);

      act(() => {
        usePatternStore.setState({ privacyConsent: true });
        usePatternStore.getState().analyzeJournalPatterns();
      });

      const patterns = usePatternStore.getState().patterns;
      expect(patterns.length).toBeGreaterThan(0);

      const fearfulPattern = patterns.find(p => p.title.toLowerCase().includes('fearful'));
      expect(fearfulPattern).toBeDefined();
      expect(fearfulPattern?.impact).toBe('negative');
    });

    it('detects positive emotion patterns', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          { id: '1', symbol: 'AAPL', emotionAtEntry: 'confident', pnl: 100, pnlPercent: 5, createdAt: new Date().toISOString() },
          { id: '2', symbol: 'MSFT', emotionAtEntry: 'confident', pnl: 150, pnlPercent: 7, createdAt: new Date().toISOString() },
          { id: '3', symbol: 'GOOGL', emotionAtEntry: 'confident', pnl: 200, pnlPercent: 10, createdAt: new Date().toISOString() },
          { id: '4', symbol: 'TSLA', emotionAtEntry: 'confident', pnl: 50, pnlPercent: 2, createdAt: new Date().toISOString() },
        ],
      } as any);

      act(() => {
        usePatternStore.setState({ privacyConsent: true });
        usePatternStore.getState().analyzeJournalPatterns();
      });

      const patterns = usePatternStore.getState().patterns;
      const confidentPattern = patterns.find(p => p.title.toLowerCase().includes('confident'));
      expect(confidentPattern).toBeDefined();
      expect(confidentPattern?.impact).toBe('positive');
    });

    it('detects symbol winning patterns', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          { id: '1', symbol: 'AAPL', emotionAtEntry: 'confident', pnl: 100, pnlPercent: 5, createdAt: new Date().toISOString() },
          { id: '2', symbol: 'AAPL', emotionAtEntry: 'confident', pnl: 150, pnlPercent: 7, createdAt: new Date().toISOString() },
          { id: '3', symbol: 'AAPL', emotionAtEntry: 'confident', pnl: 200, pnlPercent: 10, createdAt: new Date().toISOString() },
          { id: '4', symbol: 'AAPL', emotionAtEntry: 'confident', pnl: 50, pnlPercent: 2, createdAt: new Date().toISOString() },
        ],
      } as any);

      act(() => {
        usePatternStore.setState({ privacyConsent: true });
        usePatternStore.getState().analyzeJournalPatterns();
      });

      const patterns = usePatternStore.getState().patterns;
      const aaplPattern = patterns.find(p => p.title.includes('AAPL'));
      expect(aaplPattern).toBeDefined();
      expect(aaplPattern?.type).toBe('symbol');
      expect(aaplPattern?.impact).toBe('positive');
    });

    it('detects symbol losing patterns', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          { id: '1', symbol: 'TSLA', emotionAtEntry: 'confident', pnl: -100, pnlPercent: -5, createdAt: new Date().toISOString() },
          { id: '2', symbol: 'TSLA', emotionAtEntry: 'confident', pnl: -150, pnlPercent: -7, createdAt: new Date().toISOString() },
          { id: '3', symbol: 'TSLA', emotionAtEntry: 'confident', pnl: 50, pnlPercent: 2, createdAt: new Date().toISOString() },
        ],
      } as any);

      act(() => {
        usePatternStore.setState({ privacyConsent: true });
        usePatternStore.getState().analyzeJournalPatterns();
      });

      const patterns = usePatternStore.getState().patterns;
      const tslaPattern = patterns.find(p => p.title.includes('TSLA'));
      expect(tslaPattern).toBeDefined();
      expect(tslaPattern?.type).toBe('symbol');
      expect(tslaPattern?.impact).toBe('negative');
    });

    it('detects early exit patterns', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          { id: '1', symbol: 'AAPL', emotionAtEntry: 'confident', emotionAtExit: 'fearful', pnl: 10, pnlPercent: 1, createdAt: new Date().toISOString() },
          { id: '2', symbol: 'MSFT', emotionAtEntry: 'confident', emotionAtExit: 'fearful', pnl: 15, pnlPercent: 2, createdAt: new Date().toISOString() },
          { id: '3', symbol: 'GOOGL', emotionAtEntry: 'confident', emotionAtExit: 'fearful', pnl: 20, pnlPercent: 2.5, createdAt: new Date().toISOString() },
        ],
      } as any);

      act(() => {
        usePatternStore.setState({ privacyConsent: true });
        usePatternStore.getState().analyzeJournalPatterns();
      });

      const patterns = usePatternStore.getState().patterns;
      const earlyExitPattern = patterns.find(p => p.type === 'behavior' && p.title.includes('early exit'));
      expect(earlyExitPattern).toBeDefined();
      expect(earlyExitPattern?.impact).toBe('negative');
    });

    it('updates lastAnalyzed timestamp', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          { id: '1', symbol: 'AAPL', emotionAtEntry: 'confident', pnl: 100, pnlPercent: 5, createdAt: new Date().toISOString() },
          { id: '2', symbol: 'MSFT', emotionAtEntry: 'confident', pnl: 150, pnlPercent: 7, createdAt: new Date().toISOString() },
          { id: '3', symbol: 'GOOGL', emotionAtEntry: 'confident', pnl: 200, pnlPercent: 10, createdAt: new Date().toISOString() },
        ],
      } as any);

      act(() => {
        usePatternStore.setState({ privacyConsent: true });
        usePatternStore.getState().analyzeJournalPatterns();
      });

      expect(usePatternStore.getState().lastAnalyzed).toBeTruthy();
    });

    it('generates insights from negative patterns', () => {
      vi.mocked(useJournalStore.getState).mockReturnValue({
        entries: [
          { id: '1', symbol: 'AAPL', emotionAtEntry: 'fearful', pnl: -100, pnlPercent: -5, createdAt: new Date().toISOString() },
          { id: '2', symbol: 'MSFT', emotionAtEntry: 'fearful', pnl: -50, pnlPercent: -3, createdAt: new Date().toISOString() },
          { id: '3', symbol: 'GOOGL', emotionAtEntry: 'fearful', pnl: -75, pnlPercent: -4, createdAt: new Date().toISOString() },
        ],
      } as any);

      act(() => {
        usePatternStore.setState({ privacyConsent: true });
        usePatternStore.getState().analyzeJournalPatterns();
      });

      const insights = usePatternStore.getState().insights;
      expect(insights.length).toBeGreaterThan(0);
      expect(insights.every(i => !i.dismissed)).toBe(true);
      expect(insights.every(i => i.suggestion)).toBeTruthy();
    });
  });
});
