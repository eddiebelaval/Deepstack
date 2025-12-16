import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import { InsightsPanel } from '../InsightsPanel';
import { usePatternStore } from '@/lib/stores/pattern-store';
import { useJournalStore } from '@/lib/stores/journal-store';
import * as useInsightsDataModule from '@/hooks/useInsightsData';

// Mock the stores
vi.mock('@/lib/stores/pattern-store', () => ({
  usePatternStore: vi.fn(),
}));

vi.mock('@/lib/stores/journal-store', () => ({
  useJournalStore: vi.fn(),
}));

// Mock the useInsightsData hook
vi.mock('@/hooks/useInsightsData');

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as any;

describe('InsightsPanel', () => {
  const mockPatternStore = {
    patterns: [],
    privacyConsent: false,
    lastAnalyzed: null,
    analyzeJournalPatterns: vi.fn(),
    clearPatterns: vi.fn(),
    setPrivacyConsent: vi.fn(),
    dismissInsight: vi.fn(),
    getActiveInsights: vi.fn(() => []),
  };

  const mockJournalStore = {
    entries: [],
  };

  const mockInsightsData = {
    stats: {
      winRate: 0,
      totalPnL: 0,
      totalTrades: 0,
      topSymbols: [],
      emotionalEdge: {
        bestEmotion: null,
        worstEmotion: null,
      },
      activeTheses: 0,
    },
    patterns: {
      dayOfWeek: { best: null, worst: null },
      timeOfDay: { best: null, worst: null },
      streaks: {
        currentStreak: 0,
        streakType: 'none' as const,
        longestWinStreak: 0,
        longestLossStreak: 0,
      },
      holdTime: {
        avgWinnerHoldDays: null,
        avgLoserHoldDays: null,
      },
      thesisValidationRate: null,
      emotionCorrelations: [],
    },
    recommendations: [],
    hasData: false,
  };

  beforeEach(() => {
    vi.mocked(usePatternStore).mockReturnValue(mockPatternStore as any);
    vi.mocked(useJournalStore).mockReturnValue(mockJournalStore as any);
    vi.mocked(useInsightsDataModule.useInsightsData).mockReturnValue(mockInsightsData as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the insights panel header', () => {
      render(<InsightsPanel />);
      expect(screen.getByText('Trading Insights')).toBeInTheDocument();
      expect(screen.getByText('Performance analysis and AI pattern recognition')).toBeInTheDocument();
    });

    it('renders back button', () => {
      render(<InsightsPanel />);
      const backButton = screen.getByRole('button', { name: '' });
      expect(backButton).toBeInTheDocument();
    });

    it('shows "No Trading Data Yet" message when no data', () => {
      render(<InsightsPanel />);
      expect(screen.getByText('No Trading Data Yet')).toBeInTheDocument();
      expect(screen.getByText(/Start logging your trades/)).toBeInTheDocument();
    });
  });

  describe('performance overview', () => {
    it('displays performance stats when data is available', () => {
      vi.mocked(useInsightsDataModule.useInsightsData).mockReturnValue({
        ...mockInsightsData,
        hasData: true,
        stats: {
          winRate: 65.5,
          totalPnL: 1250.75,
          totalTrades: 10,
          topSymbols: [
            { symbol: 'AAPL', winRate: 80, count: 5 },
            { symbol: 'MSFT', winRate: 60, count: 3 },
          ],
          emotionalEdge: {
            bestEmotion: { emotion: 'confident', winRate: 75 },
            worstEmotion: { emotion: 'fearful', winRate: 30 },
          },
          activeTheses: 3,
        },
      } as any);

      render(<InsightsPanel />);

      expect(screen.getByText('65.5%')).toBeInTheDocument();
      expect(screen.getByText('+$1250.75 Net P&L')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('Confident')).toBeInTheDocument();
      expect(screen.getByText('Fearful')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays negative P&L with correct color', () => {
      vi.mocked(useInsightsDataModule.useInsightsData).mockReturnValue({
        ...mockInsightsData,
        hasData: true,
        stats: {
          ...mockInsightsData.stats,
          totalPnL: -500.25,
          winRate: 35,
        },
      } as any);

      render(<InsightsPanel />);
      const pnlElement = screen.getByText('-$500.25 Net P&L');
      expect(pnlElement).toBeInTheDocument();
      expect(pnlElement).toHaveClass('text-red-500');
    });

    it('shows "No data yet" for top symbols when empty', () => {
      vi.mocked(useInsightsDataModule.useInsightsData).mockReturnValue({
        ...mockInsightsData,
        hasData: true,
        stats: {
          ...mockInsightsData.stats,
          topSymbols: [],
        },
      } as any);

      render(<InsightsPanel />);
      expect(screen.getByText('No data yet')).toBeInTheDocument();
    });
  });

  describe('personalized recommendations', () => {
    it('displays recommendations when available', () => {
      vi.mocked(useInsightsDataModule.useInsightsData).mockReturnValue({
        ...mockInsightsData,
        hasData: true,
        recommendations: [
          {
            id: 'rec-1',
            type: 'emotion',
            message: 'Avoid trading when fearful',
            actionable: 'Take a break when you feel fear',
            priority: 'high',
          },
          {
            id: 'rec-2',
            type: 'timing',
            message: 'Trade in the morning',
            actionable: 'Focus on morning sessions',
            priority: 'medium',
          },
        ],
      } as any);

      render(<InsightsPanel />);

      expect(screen.getByText('Personalized Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Avoid trading when fearful')).toBeInTheDocument();
      expect(screen.getByText('Take a break when you feel fear')).toBeInTheDocument();
      expect(screen.getByText('Trade in the morning')).toBeInTheDocument();
      expect(screen.getByText('Focus on morning sessions')).toBeInTheDocument();
    });

    it('does not display recommendations section when empty', () => {
      vi.mocked(useInsightsDataModule.useInsightsData).mockReturnValue({
        ...mockInsightsData,
        hasData: true,
        recommendations: [],
      } as any);

      render(<InsightsPanel />);
      expect(screen.queryByText('Personalized Recommendations')).not.toBeInTheDocument();
    });
  });

  describe('pattern analysis', () => {
    it('displays pattern analysis when sufficient data', () => {
      vi.mocked(useInsightsDataModule.useInsightsData).mockReturnValue({
        ...mockInsightsData,
        hasData: true,
        stats: {
          ...mockInsightsData.stats,
          totalTrades: 5,
        },
        patterns: {
          dayOfWeek: {
            best: { day: 'Monday', winRate: 80 },
            worst: { day: 'Friday', winRate: 40 },
          },
          timeOfDay: {
            best: { period: 'Morning', winRate: 75 },
            worst: { period: 'Afternoon', winRate: 45 },
          },
          streaks: {
            currentStreak: 3,
            streakType: 'wins',
            longestWinStreak: 5,
            longestLossStreak: 2,
          },
          holdTime: {
            avgWinnerHoldDays: 2.5,
            avgLoserHoldDays: 1.2,
          },
          thesisValidationRate: 75,
          emotionCorrelations: [
            { emotion: 'confident', winRate: 80, totalTrades: 10 },
            { emotion: 'anxious', winRate: 40, totalTrades: 5 },
          ],
        },
      } as any);

      render(<InsightsPanel />);

      expect(screen.getByText('Pattern Analysis')).toBeInTheDocument();
      expect(screen.getByText('Best: Monday')).toBeInTheDocument();
      expect(screen.getByText('80% WR')).toBeInTheDocument();
      expect(screen.getByText('Worst: Friday')).toBeInTheDocument();
      expect(screen.getByText('3 wins')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('does not show pattern analysis with insufficient data', () => {
      vi.mocked(useInsightsDataModule.useInsightsData).mockReturnValue({
        ...mockInsightsData,
        hasData: true,
        stats: {
          ...mockInsightsData.stats,
          totalTrades: 1,
        },
      } as any);

      render(<InsightsPanel />);
      expect(screen.queryByText('Pattern Analysis')).not.toBeInTheDocument();
    });
  });

  describe('privacy consent', () => {
    it('renders privacy consent section', () => {
      render(<InsightsPanel />);
      expect(screen.getByText('AI Pattern Learning')).toBeInTheDocument();
      expect(screen.getByText(/Enable AI analysis of your journal/)).toBeInTheDocument();
    });

    it('handles privacy consent toggle', async () => {
      const user = userEvent.setup();
      render(<InsightsPanel />);

      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      expect(mockPatternStore.setPrivacyConsent).toHaveBeenCalledWith(true);
    });

    it('shows disabled message when privacy consent is off', () => {
      render(<InsightsPanel />);
      expect(screen.getByText('Enable AI pattern learning above to get advanced behavioral insights')).toBeInTheDocument();
    });
  });

  describe('AI analysis controls', () => {
    beforeEach(() => {
      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
      } as any);
      vi.mocked(useJournalStore).mockReturnValue({
        entries: [
          { id: '1', symbol: 'AAPL' },
          { id: '2', symbol: 'MSFT' },
          { id: '3', symbol: 'GOOGL' },
        ],
      } as any);
    });

    it('shows analyze button when privacy consent is enabled', () => {
      render(<InsightsPanel />);
      expect(screen.getByRole('button', { name: /Analyze My Journal/ })).toBeInTheDocument();
    });

    it('disables analyze button with insufficient entries', () => {
      vi.mocked(useJournalStore).mockReturnValue({
        entries: [{ id: '1', symbol: 'AAPL' }],
      } as any);

      render(<InsightsPanel />);
      const analyzeButton = screen.getByRole('button', { name: /Analyze My Journal/ });
      expect(analyzeButton).toBeDisabled();
    });

    it('shows warning when insufficient entries', () => {
      vi.mocked(useJournalStore).mockReturnValue({
        entries: [{ id: '1', symbol: 'AAPL' }],
      } as any);

      render(<InsightsPanel />);
      expect(screen.getByText('Need more data')).toBeInTheDocument();
      expect(screen.getByText(/Add at least 3 journal entries/)).toBeInTheDocument();
    });

    it('triggers analysis when analyze button is clicked', async () => {
      const user = userEvent.setup();
      const analyzeJournalPatterns = vi.fn().mockResolvedValue(undefined);

      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        analyzeJournalPatterns,
      } as any);

      render(<InsightsPanel />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze My Journal/ });
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(analyzeJournalPatterns).toHaveBeenCalled();
      });
    });

    it('shows loading state during analysis', async () => {
      const user = userEvent.setup();
      let resolveAnalysis: any;
      const analyzePromise = new Promise((resolve) => {
        resolveAnalysis = resolve;
      });

      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        analyzeJournalPatterns: vi.fn(() => analyzePromise),
      } as any);

      render(<InsightsPanel />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze My Journal/ });
      await user.click(analyzeButton);

      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
      expect(screen.getByText('Analyzing patterns...')).toBeInTheDocument();

      act(() => {
        resolveAnalysis();
      });
    });

    it('shows clear button when patterns exist', () => {
      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        patterns: [
          {
            id: 'pattern-1',
            type: 'emotion',
            title: 'Test Pattern',
            description: 'Test',
            confidence: 80,
            occurrences: 5,
            impact: 'positive',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
        ],
      } as any);

      render(<InsightsPanel />);
      expect(screen.getByRole('button', { name: /Clear/ })).toBeInTheDocument();
    });

    it('triggers clear patterns when clear button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        patterns: [
          {
            id: 'pattern-1',
            type: 'emotion',
            title: 'Test Pattern',
            description: 'Test',
            confidence: 80,
            occurrences: 5,
            impact: 'positive',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
        ],
      } as any);

      render(<InsightsPanel />);

      const clearButton = screen.getByRole('button', { name: /Clear/ });
      await user.click(clearButton);

      expect(mockPatternStore.clearPatterns).toHaveBeenCalled();
    });
  });

  describe('AI insights display', () => {
    it('displays active insights', () => {
      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        getActiveInsights: vi.fn(() => [
          {
            id: 'insight-1',
            pattern: {
              id: 'pattern-1',
              type: 'emotion',
              title: 'Fearful Trading Pattern',
              description: 'Test',
              confidence: 80,
              occurrences: 5,
              impact: 'negative',
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            },
            suggestion: 'Avoid trading when fearful',
            dismissed: false,
          },
        ]),
      } as any);

      render(<InsightsPanel />);

      expect(screen.getByText('AI-Detected Patterns')).toBeInTheDocument();
      expect(screen.getByText('Fearful Trading Pattern')).toBeInTheDocument();
      expect(screen.getByText('Avoid trading when fearful')).toBeInTheDocument();
    });

    it('allows dismissing insights', async () => {
      const user = userEvent.setup();
      const dismissInsight = vi.fn();

      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        dismissInsight,
        getActiveInsights: vi.fn(() => [
          {
            id: 'insight-1',
            pattern: {
              id: 'pattern-1',
              type: 'emotion',
              title: 'Test Pattern',
              description: 'Test',
              confidence: 80,
              occurrences: 5,
              impact: 'negative',
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            },
            suggestion: 'Test suggestion',
            dismissed: false,
          },
        ]),
      } as any);

      render(<InsightsPanel />);

      const dismissButtons = screen.getAllByRole('button');
      const dismissButton = dismissButtons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-x')
      );

      if (dismissButton) {
        await user.click(dismissButton);
        expect(dismissInsight).toHaveBeenCalledWith('insight-1');
      }
    });

    it('displays discovered patterns', () => {
      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        patterns: [
          {
            id: 'pattern-1',
            type: 'emotion',
            title: 'Confident Trading',
            description: 'High win rate when confident',
            confidence: 85,
            occurrences: 10,
            impact: 'positive',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
        ],
      } as any);

      render(<InsightsPanel />);

      expect(screen.getByText('Discovered Patterns')).toBeInTheDocument();
      expect(screen.getByText('Confident Trading')).toBeInTheDocument();
      expect(screen.getByText('High win rate when confident')).toBeInTheDocument();
      expect(screen.getByText('85% confident')).toBeInTheDocument();
    });

    it('shows call-to-action when no patterns analyzed', () => {
      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        patterns: [],
      } as any);

      vi.mocked(useJournalStore).mockReturnValue({
        entries: [
          { id: '1' },
          { id: '2' },
          { id: '3' },
        ],
      } as any);

      render(<InsightsPanel />);

      expect(screen.getByText('Click "Analyze My Journal" to discover AI-powered patterns in your trading')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates back when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<InsightsPanel />);

      const backButton = screen.getAllByRole('button')[0];
      await user.click(backButton);

      expect(window.location.href).toBe('/');
    });
  });

  describe('last analyzed timestamp', () => {
    it('displays last analyzed time', () => {
      const lastAnalyzed = new Date('2024-01-15T10:30:00').toISOString();

      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        lastAnalyzed,
      } as any);

      render(<InsightsPanel />);

      expect(screen.getByText(/Last analyzed:/)).toBeInTheDocument();
    });

    it('shows "Not yet analyzed" when no analysis performed', () => {
      vi.mocked(usePatternStore).mockReturnValue({
        ...mockPatternStore,
        privacyConsent: true,
        lastAnalyzed: null,
      } as any);

      render(<InsightsPanel />);

      expect(screen.getByText('Not yet analyzed')).toBeInTheDocument();
    });
  });
});
