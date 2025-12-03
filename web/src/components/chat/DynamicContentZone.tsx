'use client';

import React from 'react';
import { useUIStore } from '@/lib/stores/ui-store';
import { TradingChart } from '@/components/charts/TradingChart';
import { OrderPanel } from '@/components/trading/OrderPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function DynamicContentZone() {
    const { activeContent, activeSymbol } = useUIStore();

    if (activeContent === 'none') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[400px]">
                <div className="bg-primary/10 p-4 rounded-full">
                    <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">How can I help you trade today?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mt-8">
                    {[
                        "Analyze my portfolio",
                        "Show me SPY chart",
                        "What's moving today?",
                        "Find asymmetric setups"
                    ].map((prompt) => (
                        <Card key={prompt} className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <CardContent className="p-4 text-sm font-medium text-center">
                                {prompt}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 min-h-[500px] flex flex-col">
            {activeContent === 'chart' && (
                <div className="flex-1 border rounded-lg overflow-hidden bg-card shadow-sm">
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
                <div className="flex-1 border rounded-lg overflow-hidden bg-card shadow-sm">
                    <PositionsList />
                </div>
            )}

            {/* Add other content types here */}
        </div>
    );
}
