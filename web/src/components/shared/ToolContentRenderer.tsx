'use client';

import React, { lazy, Suspense } from 'react';
import { ActiveContentType } from '@/lib/stores/ui-store';
import { ChartPanel } from '@/components/trading/ChartPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { PositionsPanel } from '@/components/trading/PositionsPanel';
import { NewsPanel } from '@/components/trading/NewsPanel';
import { JournalList } from '@/components/journal/JournalList';
import { ThesisList } from '@/components/thesis/ThesisList';
import { cn } from '@/lib/utils';

// Lazy load heavy components for performance
const DeepValuePanel = lazy(() => import('@/components/trading/DeepValuePanel').then(m => ({ default: m.DeepValuePanel })));
const HedgedPositionsPanel = lazy(() => import('@/components/trading/HedgedPositionsPanel').then(m => ({ default: m.HedgedPositionsPanel })));
const ScreenerPanel = lazy(() => import('@/components/trading/ScreenerPanel').then(m => ({ default: m.ScreenerPanel })));
const AlertsPanel = lazy(() => import('@/components/trading/AlertsPanel').then(m => ({ default: m.AlertsPanel })));
const CalendarPanel = lazy(() => import('@/components/trading/CalendarPanel').then(m => ({ default: m.CalendarPanel })));
const OptionsScreenerPanel = lazy(() => import('@/components/options').then(m => ({ default: m.OptionsScreenerPanel })));
const OptionsStrategyBuilder = lazy(() => import('@/components/options').then(m => ({ default: m.OptionsStrategyBuilder })));
const PredictionMarketsPanel = lazy(() => import('@/components/prediction-markets').then(m => ({ default: m.PredictionMarketsPanel })));
const InsightsPanel = lazy(() => import('@/components/insights/InsightsPanel').then(m => ({ default: m.InsightsPanel })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-card/50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Extended type to include 'history' for parent-controlled rendering
type ToolContentType = 'history' | ActiveContentType;

interface ToolContentRendererProps {
  contentType: ToolContentType;
  variant?: 'default' | 'fullscreen' | 'embedded';
  className?: string;
}

/**
 * Shared component for rendering tool content across the application.
 * Supports all tool types defined in ActiveContentType plus 'history'.
 *
 * Usage:
 * ```tsx
 * // In ConversationView
 * <ToolContentRenderer contentType={activeContent} variant="default" />
 *
 * // In Tools Hub (fullscreen mode)
 * <ToolContentRenderer contentType="portfolio" variant="fullscreen" />
 *
 * // Embedded in a card
 * <ToolContentRenderer contentType="chart" variant="embedded" className="h-96" />
 * ```
 */
export function ToolContentRenderer({
  contentType,
  variant = 'default',
  className
}: ToolContentRendererProps) {
  // Return null for 'none' and 'history' - parent handles these cases
  if (contentType === 'none' || contentType === 'history') {
    return null;
  }

  // Base wrapper styles based on variant
  const wrapperStyles = cn(
    'overflow-hidden bg-card',
    variant === 'fullscreen' && 'h-full w-full',
    variant === 'default' && 'h-full border-t border-border/50',
    variant === 'embedded' && 'rounded-lg border border-border/50',
    className
  );

  // Render the appropriate tool panel
  const renderTool = () => {
    switch (contentType) {
      // Chart - Full chart with toolbar, timeframes, indicators
      case 'chart':
        return <ChartPanel />;

      // Portfolio & Positions
      case 'portfolio':
        return (
          <div className="flex-1 min-h-0 rounded-2xl overflow-hidden bg-card border border-border/50">
            <PositionsList />
          </div>
        );

      case 'positions':
        return <PositionsPanel />;

      // Heavy components - lazy loaded
      case 'deep-value':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DeepValuePanel />
          </Suspense>
        );

      case 'hedged-positions':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HedgedPositionsPanel />
          </Suspense>
        );

      case 'options-screener':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <OptionsScreenerPanel />
          </Suspense>
        );

      case 'options-builder':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <OptionsStrategyBuilder />
          </Suspense>
        );

      case 'screener':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ScreenerPanel />
          </Suspense>
        );

      case 'alerts':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AlertsPanel />
          </Suspense>
        );

      case 'calendar':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CalendarPanel />
          </Suspense>
        );

      case 'prediction-markets':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PredictionMarketsPanel />
          </Suspense>
        );

      case 'insights':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <InsightsPanel />
          </Suspense>
        );

      // Lightweight components - loaded directly
      case 'news':
        return <NewsPanel />;

      case 'thesis':
        return <ThesisList />;

      case 'journal':
        return <JournalList />;

      // Analysis - placeholder for future implementation
      case 'analysis':
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Analysis panel coming soon</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={wrapperStyles}>
      {renderTool()}
    </div>
  );
}

// Export type for use in other components
export type { ToolContentType };
