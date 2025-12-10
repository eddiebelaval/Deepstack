'use client';

import React from 'react';
import { useUIStore } from '@/lib/stores/ui-store';
import { ChartPanel } from '@/components/trading/ChartPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { LazyOptionsStrategyBuilder, LazyOptionsScreenerPanel } from '@/components/lazy';

export function DynamicContentZone() {
    const { activeContent } = useUIStore();

    // When no active content, render nothing - let MessageList handle the home state
    if (activeContent === 'none') {
        return null;
    }

    return (
        <div className="flex-1 p-3 min-h-[400px] flex flex-col">
            {activeContent === 'chart' && (
                <div className="flex-1 border rounded-lg overflow-hidden bg-card">
                    {/* Full ChartPanel with toolbar, timeframes, indicators */}
                    <ChartPanel />
                </div>
            )}

            {activeContent === 'portfolio' && (
                <div className="flex-1 border rounded-lg overflow-hidden bg-card">
                    <PositionsList />
                </div>
            )}

            {activeContent === 'options-screener' && (
                <div className="flex-1 border rounded-lg overflow-hidden bg-card">
                    <LazyOptionsScreenerPanel />
                </div>
            )}

            {activeContent === 'options-builder' && (
                <div className="flex-1 border rounded-lg overflow-hidden bg-card">
                    <LazyOptionsStrategyBuilder />
                </div>
            )}
        </div>
    );
}
