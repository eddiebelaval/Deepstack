'use client';

import React, { lazy, Suspense } from 'react';
import { type WidgetType } from '@/lib/stores/widget-store';
import { Loader2 } from 'lucide-react';

// Lazy load all widgets
const MiniChartWidget = lazy(() => import('./MiniChartWidget'));
const WatchlistWidget = lazy(() => import('./WatchlistWidget'));
const MarketStatusWidget = lazy(() => import('./MarketStatusWidget'));
const PositionsSummaryWidget = lazy(() => import('./PositionsSummaryWidget'));
const QuickStatsWidget = lazy(() => import('./QuickStatsWidget'));
const NewsHeadlinesWidget = lazy(() => import('./NewsHeadlinesWidget'));
const CalendarEventsWidget = lazy(() => import('./CalendarEventsWidget'));
const ScreenerPicksWidget = lazy(() => import('./ScreenerPicksWidget'));
const AlertsActiveWidget = lazy(() => import('./AlertsActiveWidget'));
const DeepValuePicksWidget = lazy(() => import('./DeepValuePicksWidget'));
const HedgedSummaryWidget = lazy(() => import('./HedgedSummaryWidget'));
const OptionsOpportunitiesWidget = lazy(() => import('./OptionsOpportunitiesWidget'));
const PredictionMarketsWidget = lazy(() => import('./PredictionMarketsWidget'));
const ThesisActiveWidget = lazy(() => import('./ThesisActiveWidget'));
const JournalRecentWidget = lazy(() => import('./JournalRecentWidget'));
const InsightsLatestWidget = lazy(() => import('./InsightsLatestWidget'));

// Loading fallback
function WidgetLoading() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}

// Fallback for missing widgets
function WidgetNotFound({ type }: { type: string }) {
  return (
    <div className="text-sm text-muted-foreground text-center py-2">
      Widget &quot;{type}&quot; not found
    </div>
  );
}

interface WidgetRendererProps {
  type: WidgetType;
}

export function WidgetRenderer({ type }: WidgetRendererProps) {
  const renderWidget = () => {
    switch (type) {
      case 'mini-chart':
        return <MiniChartWidget />;
      case 'watchlist':
        return <WatchlistWidget />;
      case 'market-status':
        return <MarketStatusWidget />;
      case 'positions-summary':
        return <PositionsSummaryWidget />;
      case 'quick-stats':
        return <QuickStatsWidget />;
      case 'news-headlines':
        return <NewsHeadlinesWidget />;
      case 'calendar-events':
        return <CalendarEventsWidget />;
      case 'screener-picks':
        return <ScreenerPicksWidget />;
      case 'alerts-active':
        return <AlertsActiveWidget />;
      case 'deep-value-picks':
        return <DeepValuePicksWidget />;
      case 'hedged-summary':
        return <HedgedSummaryWidget />;
      case 'options-opportunities':
        return <OptionsOpportunitiesWidget />;
      case 'prediction-markets':
        return <PredictionMarketsWidget />;
      case 'thesis-active':
        return <ThesisActiveWidget />;
      case 'journal-recent':
        return <JournalRecentWidget />;
      case 'insights-latest':
        return <InsightsLatestWidget />;
      default:
        return <WidgetNotFound type={type} />;
    }
  };

  return (
    <Suspense fallback={<WidgetLoading />}>
      {renderWidget()}
    </Suspense>
  );
}

export default WidgetRenderer;
