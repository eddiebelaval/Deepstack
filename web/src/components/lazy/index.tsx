'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/loading-states';

/**
 * Lazy-loaded heavy components to reduce initial bundle size
 * These components use browser APIs or have large dependencies
 */

// Chart component - lightweight-charts is ~200kb
export const LazyMultiSeriesChart = dynamic(
    () => import('@/components/charts/MultiSeriesChart').then(mod => ({ default: mod.MultiSeriesChart })),
    {
        loading: () => <ChartSkeleton className="h-full" />,
        ssr: false, // lightweight-charts requires browser APIs
    }
);

// Options Strategy Builder - complex component with calculations
export const LazyOptionsStrategyBuilder = dynamic(
    () => import('@/components/options/OptionsStrategyBuilder').then(mod => ({ default: mod.OptionsStrategyBuilder })),
    {
        loading: () => (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Loading options builder...</div>
            </div>
        ),
        ssr: false,
    }
);

// Payoff Diagram - canvas-based rendering
export const LazyPayoffDiagram = dynamic(
    () => import('@/components/options/PayoffDiagram').then(mod => ({ default: mod.PayoffDiagram })),
    {
        loading: () => <ChartSkeleton className="h-[200px]" />,
        ssr: false,
    }
);

// Rich Text Editor - TipTap with extensions (~150kb)
export const LazyRichTextEditor = dynamic(
    () => import('@/components/journal/RichTextEditor').then(mod => ({ default: mod.RichTextEditor })),
    {
        loading: () => (
            <div className="border border-border rounded-lg p-4 min-h-[120px] animate-pulse bg-muted/20">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
            </div>
        ),
        ssr: false, // TipTap uses browser APIs
    }
);

// Options Screener Panel - heavy data processing
export const LazyOptionsScreenerPanel = dynamic(
    () => import('@/components/options/OptionsScreenerPanel').then(mod => ({ default: mod.OptionsScreenerPanel })),
    {
        loading: () => (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Loading screener...</div>
            </div>
        ),
    }
);

// Thesis Dashboard - complex state with charts
export const LazyThesisDashboard = dynamic(
    () => import('@/components/thesis/ThesisDashboard').then(mod => ({ default: mod.ThesisDashboard })),
    {
        loading: () => (
            <div className="space-y-4 p-4">
                <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            </div>
        ),
    }
);

// Insights Panel - AI processing heavy
export const LazyInsightsPanel = dynamic(
    () => import('@/components/insights/InsightsPanel').then(mod => ({ default: mod.InsightsPanel })),
    {
        loading: () => (
            <div className="space-y-4 p-4">
                <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
                <div className="h-32 bg-muted rounded animate-pulse" />
            </div>
        ),
    }
);
