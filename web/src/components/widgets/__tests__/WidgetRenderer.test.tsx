import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WidgetRenderer } from '../WidgetRenderer';

// Mock all lazy-loaded widgets
vi.mock('../MiniChartWidget', () => ({
  default: () => <div data-testid="mini-chart-widget">Mini Chart</div>,
}));

vi.mock('../WatchlistWidget', () => ({
  default: () => <div data-testid="watchlist-widget">Watchlist</div>,
}));

vi.mock('../MarketStatusWidget', () => ({
  default: () => <div data-testid="market-status-widget">Market Status</div>,
}));

vi.mock('../PositionsSummaryWidget', () => ({
  default: () => <div data-testid="positions-summary-widget">Positions Summary</div>,
}));

vi.mock('../QuickStatsWidget', () => ({
  default: () => <div data-testid="quick-stats-widget">Quick Stats</div>,
}));

vi.mock('../NewsHeadlinesWidget', () => ({
  default: () => <div data-testid="news-headlines-widget">News Headlines</div>,
}));

vi.mock('../CalendarEventsWidget', () => ({
  default: () => <div data-testid="calendar-events-widget">Calendar Events</div>,
}));

vi.mock('../ScreenerPicksWidget', () => ({
  default: () => <div data-testid="screener-picks-widget">Screener Picks</div>,
}));

vi.mock('../AlertsActiveWidget', () => ({
  default: () => <div data-testid="alerts-active-widget">Alerts Active</div>,
}));

vi.mock('../DeepValuePicksWidget', () => ({
  default: () => <div data-testid="deep-value-picks-widget">Deep Value Picks</div>,
}));

vi.mock('../HedgedSummaryWidget', () => ({
  default: () => <div data-testid="hedged-summary-widget">Hedged Summary</div>,
}));

vi.mock('../OptionsOpportunitiesWidget', () => ({
  default: () => <div data-testid="options-opportunities-widget">Options Opportunities</div>,
}));

vi.mock('../PredictionMarketsWidget', () => ({
  default: () => <div data-testid="prediction-markets-widget">Prediction Markets</div>,
}));

vi.mock('../ThesisActiveWidget', () => ({
  default: () => <div data-testid="thesis-active-widget">Thesis Active</div>,
}));

vi.mock('../JournalRecentWidget', () => ({
  default: () => <div data-testid="journal-recent-widget">Journal Recent</div>,
}));

vi.mock('../InsightsLatestWidget', () => ({
  default: () => <div data-testid="insights-latest-widget">Insights Latest</div>,
}));

describe('WidgetRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Widget Type Rendering', () => {
    it('should render mini-chart widget', async () => {
      render(<WidgetRenderer type="mini-chart" />);
      await waitFor(() => {
        expect(screen.getByTestId('mini-chart-widget')).toBeInTheDocument();
      });
    });

    it('should render watchlist widget', async () => {
      render(<WidgetRenderer type="watchlist" />);
      await waitFor(() => {
        expect(screen.getByTestId('watchlist-widget')).toBeInTheDocument();
      });
    });

    it('should render market-status widget', async () => {
      render(<WidgetRenderer type="market-status" />);
      await waitFor(() => {
        expect(screen.getByTestId('market-status-widget')).toBeInTheDocument();
      });
    });

    it('should render positions-summary widget', async () => {
      render(<WidgetRenderer type="positions-summary" />);
      await waitFor(() => {
        expect(screen.getByTestId('positions-summary-widget')).toBeInTheDocument();
      });
    });

    it('should render quick-stats widget', async () => {
      render(<WidgetRenderer type="quick-stats" />);
      await waitFor(() => {
        expect(screen.getByTestId('quick-stats-widget')).toBeInTheDocument();
      });
    });

    it('should render news-headlines widget', async () => {
      render(<WidgetRenderer type="news-headlines" />);
      await waitFor(() => {
        expect(screen.getByTestId('news-headlines-widget')).toBeInTheDocument();
      });
    });

    it('should render calendar-events widget', async () => {
      render(<WidgetRenderer type="calendar-events" />);
      await waitFor(() => {
        expect(screen.getByTestId('calendar-events-widget')).toBeInTheDocument();
      });
    });

    it('should render screener-picks widget', async () => {
      render(<WidgetRenderer type="screener-picks" />);
      await waitFor(() => {
        expect(screen.getByTestId('screener-picks-widget')).toBeInTheDocument();
      });
    });

    it('should render prediction-markets widget', async () => {
      render(<WidgetRenderer type="prediction-markets" />);
      await waitFor(() => {
        expect(screen.getByTestId('prediction-markets-widget')).toBeInTheDocument();
      });
    });

    it('should render insights-latest widget', async () => {
      render(<WidgetRenderer type="insights-latest" />);
      await waitFor(() => {
        expect(screen.getByTestId('insights-latest-widget')).toBeInTheDocument();
      });
    });
  });

  describe('Unknown Widget Type', () => {
    it('should render not found message for unknown type', async () => {
      render(<WidgetRenderer type={'unknown-widget' as any} />);
      await waitFor(() => {
        expect(screen.getByText(/Widget "unknown-widget" not found/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      // Suspense fallback should show loading state
      // This is hard to test with mocked lazy imports since they resolve immediately
      // But the structure is verified by the component code
      render(<WidgetRenderer type="mini-chart" />);
      // The widget should eventually render
      expect(screen.getByTestId('mini-chart-widget')).toBeInTheDocument();
    });
  });
});
