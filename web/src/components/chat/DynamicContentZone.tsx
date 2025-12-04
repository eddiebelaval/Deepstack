'use client';

import React from 'react';
import { useUIStore } from '@/lib/stores/ui-store';
import { TradingChart } from '@/components/charts/TradingChart';
import { OrderPanel } from '@/components/trading/OrderPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { OptionsScreenerPanel, OptionsStrategyBuilder } from '@/components/options';

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
                    {/* Assuming TradingChart takes symbol prop or gets it from store */}
                    <TradingChart />
                </div>
            )}

            {activeContent === 'orders' && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-md">
                        <OrderPanel />
                    </div>
                </div>
            )}

            {activeContent === 'portfolio' && (
                <div className="flex-1 border rounded-lg overflow-hidden bg-card">
                    <PositionsList />
                </div>
            )}

            {activeContent === 'options-screener' && (
                <div className="flex-1 border rounded-lg overflow-hidden bg-card">
                    <OptionsScreenerPanel />
                </div>
            )}

            {activeContent === 'options-builder' && (
                <div className="flex-1 border rounded-lg overflow-hidden bg-card">
                    <OptionsStrategyBuilder />
                </div>
            )}
        </div>
    );
}
