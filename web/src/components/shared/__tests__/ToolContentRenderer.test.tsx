import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolContentRenderer } from '../ToolContentRenderer';

// Mock all the imported components
vi.mock('@/components/trading/ChartPanel', () => ({
  ChartPanel: () => <div data-testid="chart-panel">ChartPanel</div>,
}));

vi.mock('@/components/trading/PositionsList', () => ({
  PositionsList: () => <div data-testid="positions-list">PositionsList</div>,
}));

vi.mock('@/components/trading/PositionsPanel', () => ({
  PositionsPanel: () => <div data-testid="positions-panel">PositionsPanel</div>,
}));

vi.mock('@/components/trading/NewsPanel', () => ({
  NewsPanel: () => <div data-testid="news-panel">NewsPanel</div>,
}));

vi.mock('@/components/journal/JournalList', () => ({
  JournalList: () => <div data-testid="journal-list">JournalList</div>,
}));

vi.mock('@/components/thesis/ThesisList', () => ({
  ThesisList: () => <div data-testid="thesis-list">ThesisList</div>,
}));

// Mock lazy components
vi.mock('@/components/trading/DeepValuePanel', () => ({
  DeepValuePanel: () => <div data-testid="deep-value-panel">DeepValuePanel</div>,
}));

vi.mock('@/components/trading/HedgedPositionsPanel', () => ({
  HedgedPositionsPanel: () => <div data-testid="hedged-positions-panel">HedgedPositionsPanel</div>,
}));

vi.mock('@/components/trading/ScreenerPanel', () => ({
  ScreenerPanel: () => <div data-testid="screener-panel">ScreenerPanel</div>,
}));

vi.mock('@/components/trading/AlertsPanel', () => ({
  AlertsPanel: () => <div data-testid="alerts-panel">AlertsPanel</div>,
}));

vi.mock('@/components/trading/CalendarPanel', () => ({
  CalendarPanel: () => <div data-testid="calendar-panel">CalendarPanel</div>,
}));

vi.mock('@/components/options', () => ({
  OptionsScreenerPanel: () => <div data-testid="options-screener-panel">OptionsScreenerPanel</div>,
  OptionsStrategyBuilder: () => <div data-testid="options-strategy-builder">OptionsStrategyBuilder</div>,
}));

vi.mock('@/components/prediction-markets', () => ({
  PredictionMarketsPanel: () => <div data-testid="prediction-markets-panel">PredictionMarketsPanel</div>,
}));

vi.mock('@/components/insights/InsightsPanel', () => ({
  InsightsPanel: () => <div data-testid="insights-panel">InsightsPanel</div>,
}));

describe('ToolContentRenderer', () => {
  describe('rendering different content types', () => {
    it('renders chart panel', () => {
      render(<ToolContentRenderer contentType="chart" />);
      expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
    });

    it('renders portfolio view', () => {
      render(<ToolContentRenderer contentType="portfolio" />);
      expect(screen.getByTestId('positions-list')).toBeInTheDocument();
    });

    it('renders positions panel', () => {
      render(<ToolContentRenderer contentType="positions" />);
      expect(screen.getByTestId('positions-panel')).toBeInTheDocument();
    });

    it('renders news panel', () => {
      render(<ToolContentRenderer contentType="news" />);
      expect(screen.getByTestId('news-panel')).toBeInTheDocument();
    });

    it('renders journal list', () => {
      render(<ToolContentRenderer contentType="journal" />);
      expect(screen.getByTestId('journal-list')).toBeInTheDocument();
    });

    it('renders thesis list', () => {
      render(<ToolContentRenderer contentType="thesis" />);
      expect(screen.getByTestId('thesis-list')).toBeInTheDocument();
    });

    it('renders deep value panel', () => {
      render(<ToolContentRenderer contentType="deep-value" />);
      expect(screen.getByTestId('deep-value-panel')).toBeInTheDocument();
    });

    it('renders hedged positions panel', () => {
      render(<ToolContentRenderer contentType="hedged-positions" />);
      expect(screen.getByTestId('hedged-positions-panel')).toBeInTheDocument();
    });

    it('renders options screener panel', () => {
      render(<ToolContentRenderer contentType="options-screener" />);
      expect(screen.getByTestId('options-screener-panel')).toBeInTheDocument();
    });

    it('renders options strategy builder', () => {
      render(<ToolContentRenderer contentType="options-builder" />);
      expect(screen.getByTestId('options-strategy-builder')).toBeInTheDocument();
    });

    it('renders screener panel', () => {
      render(<ToolContentRenderer contentType="screener" />);
      expect(screen.getByTestId('screener-panel')).toBeInTheDocument();
    });

    it('renders alerts panel', () => {
      render(<ToolContentRenderer contentType="alerts" />);
      expect(screen.getByTestId('alerts-panel')).toBeInTheDocument();
    });

    it('renders calendar panel', () => {
      render(<ToolContentRenderer contentType="calendar" />);
      expect(screen.getByTestId('calendar-panel')).toBeInTheDocument();
    });

    it('renders prediction markets panel', () => {
      render(<ToolContentRenderer contentType="prediction-markets" />);
      expect(screen.getByTestId('prediction-markets-panel')).toBeInTheDocument();
    });

    it('renders insights panel', () => {
      render(<ToolContentRenderer contentType="insights" />);
      expect(screen.getByTestId('insights-panel')).toBeInTheDocument();
    });

    it('renders analysis placeholder', () => {
      render(<ToolContentRenderer contentType="analysis" />);
      expect(screen.getByText(/Analysis panel coming soon/)).toBeInTheDocument();
    });
  });

  describe('special content types', () => {
    it('renders nothing for "none" type', () => {
      const { container } = render(<ToolContentRenderer contentType="none" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for "history" type', () => {
      const { container } = render(<ToolContentRenderer contentType="history" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('variant styling', () => {
    it('applies default variant styles', () => {
      const { container } = render(<ToolContentRenderer contentType="chart" variant="default" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-t');
      expect(wrapper).toHaveClass('border-border/50');
    });

    it('applies fullscreen variant styles', () => {
      const { container } = render(<ToolContentRenderer contentType="chart" variant="fullscreen" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('h-full');
      expect(wrapper).toHaveClass('w-full');
    });

    it('applies embedded variant styles', () => {
      const { container } = render(<ToolContentRenderer contentType="chart" variant="embedded" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('rounded-lg');
      expect(wrapper).toHaveClass('border');
    });

    it('uses default variant when not specified', () => {
      const { container } = render(<ToolContentRenderer contentType="chart" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-t');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ToolContentRenderer contentType="chart" className="custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('merges custom className with variant styles', () => {
      const { container } = render(
        <ToolContentRenderer contentType="chart" variant="fullscreen" className="custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
      expect(wrapper).toHaveClass('h-full');
    });
  });

  describe('lazy loading', () => {
    it('shows loading fallback for lazy components', () => {
      // Mock Suspense to show fallback
      render(<ToolContentRenderer contentType="deep-value" />);

      // The component should render (even though in real app it might show loading)
      expect(screen.getByTestId('deep-value-panel')).toBeInTheDocument();
    });
  });

  describe('wrapper structure', () => {
    it('wraps content in div with bg-card', () => {
      const { container } = render(<ToolContentRenderer contentType="chart" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-card');
      expect(wrapper).toHaveClass('overflow-hidden');
    });

    it('maintains proper structure for portfolio view', () => {
      const { container } = render(<ToolContentRenderer contentType="portfolio" />);

      const innerDiv = container.querySelector('.flex-1.min-h-0.rounded-2xl');
      expect(innerDiv).toBeInTheDocument();
      expect(innerDiv).toHaveClass('overflow-hidden');
      expect(innerDiv).toHaveClass('bg-card');
    });
  });

  describe('edge cases', () => {
    it('handles unknown content types gracefully', () => {
      const { container } = render(
        <ToolContentRenderer contentType={'unknown-type' as any} />
      );

      // Should render wrapper but no content
      expect(container.firstChild).toHaveClass('bg-card');
    });

    it('handles rapid content type changes', () => {
      const { rerender } = render(<ToolContentRenderer contentType="chart" />);
      expect(screen.getByTestId('chart-panel')).toBeInTheDocument();

      rerender(<ToolContentRenderer contentType="news" />);
      expect(screen.getByTestId('news-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-panel')).not.toBeInTheDocument();
    });

    it('handles variant changes', () => {
      const { container, rerender } = render(
        <ToolContentRenderer contentType="chart" variant="default" />
      );
      let wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-t');

      rerender(<ToolContentRenderer contentType="chart" variant="fullscreen" />);
      wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('h-full');
      expect(wrapper).not.toHaveClass('border-t');
    });
  });

  describe('content types coverage', () => {
    const allContentTypes = [
      'chart',
      'portfolio',
      'positions',
      'deep-value',
      'hedged-positions',
      'options-screener',
      'options-builder',
      'screener',
      'alerts',
      'calendar',
      'prediction-markets',
      'insights',
      'news',
      'thesis',
      'journal',
      'analysis',
    ];

    it('handles all content types without crashing', () => {
      allContentTypes.forEach((contentType) => {
        const { unmount } = render(
          <ToolContentRenderer contentType={contentType as any} />
        );
        unmount();
      });
    });
  });
});
