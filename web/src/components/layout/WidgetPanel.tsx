'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUIStore } from '@/lib/stores/ui-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';
import {
    X,
    GripVertical,
    List,
    BarChart3,
    Activity,
    TrendingUp,
    TrendingDown,
    Settings2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ui/error-boundary';

type WidgetType = 'watchlist' | 'quickStats' | 'marketStatus' | 'positions';

type WidgetConfig = {
    id: string;
    type: WidgetType;
    title: string;
    icon: React.ElementType;
    isCollapsed: boolean;
};

const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: '1', type: 'watchlist', title: 'Watchlist', icon: List, isCollapsed: false },
    { id: '2', type: 'quickStats', title: 'Quick Stats', icon: BarChart3, isCollapsed: false },
    { id: '3', type: 'marketStatus', title: 'Market Status', icon: Activity, isCollapsed: false },
];

// Watchlist Widget Component
function WatchlistWidget() {
    const { quotes } = useMarketDataStore();
    const { getActiveWatchlist } = useWatchlistStore();
    const watchlist = getActiveWatchlist();

    const symbols = watchlist?.items ?? [
        { symbol: 'SPY' }, { symbol: 'QQQ' }, { symbol: 'AAPL' },
        { symbol: 'NVDA' }, { symbol: 'TSLA' }, { symbol: 'AMD' }
    ];

    return (
        <div className="space-y-1">
            {symbols.slice(0, 8).map((item) => {
                const quote = quotes[item.symbol];
                const isPositive = (quote?.changePercent ?? 0) >= 0;

                return (
                    <div
                        key={item.symbol}
                        className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                        <span className="font-medium text-sm">{item.symbol}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">
                                ${quote?.last?.toFixed(2) ?? "—"}
                            </span>
                            {quote?.changePercent !== undefined && (
                                <span
                                    className={cn(
                                        "flex items-center gap-0.5 text-xs font-medium",
                                        isPositive ? "text-profit" : "text-loss"
                                    )}
                                >
                                    {isPositive ? (
                                        <TrendingUp className="h-3 w-3" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3" />
                                    )}
                                    {isPositive ? "+" : ""}
                                    {quote.changePercent.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Quick Stats Widget Component
function QuickStatsWidget() {
    return (
        <div className="space-y-2">
            <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">Portfolio</span>
                <span className="text-sm font-mono">$104,230</span>
            </div>
            <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">Day P&L</span>
                <span className="text-sm font-mono text-profit">+$1,240</span>
            </div>
            <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">Open Positions</span>
                <span className="text-sm font-mono">5</span>
            </div>
            <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">Buying Power</span>
                <span className="text-sm font-mono">$42,850</span>
            </div>
        </div>
    );
}

// Market Status Widget Component
function MarketStatusWidget() {
    const { wsConnected } = useMarketDataStore();

    // Simple market hours check
    const now = new Date();
    const etHour = now.getUTCHours() - 5;
    const isWeekday = now.getDay() > 0 && now.getDay() < 6;
    const isMarketHours = etHour >= 9.5 && etHour < 16;
    const isMarketOpen = isWeekday && isMarketHours;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div
                    className={cn(
                        "h-2 w-2 rounded-full",
                        isMarketOpen ? "bg-profit" : "bg-muted-foreground"
                    )}
                />
                <span className="text-sm font-medium">
                    {isMarketOpen ? "Market Open" : "Market Closed"}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <div
                    className={cn(
                        "h-2 w-2 rounded-full",
                        wsConnected ? "bg-profit" : "bg-loss"
                    )}
                />
                <span className="text-sm text-muted-foreground">
                    {wsConnected ? "Live Data" : "Disconnected"}
                </span>
            </div>
        </div>
    );
}

// Single Widget Card
function WidgetCard({
    config,
    onRemove,
    isCollapsed,
    onToggleCollapse
}: {
    config: WidgetConfig;
    onRemove: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}) {
    const renderContent = () => {
        switch (config.type) {
            case 'watchlist':
                return <WatchlistWidget />;
            case 'quickStats':
                return <QuickStatsWidget />;
            case 'marketStatus':
                return <MarketStatusWidget />;
            default:
                return <div className="text-muted-foreground text-sm">Widget not found</div>;
        }
    };

    return (
        <Card className="glass-surface rounded-2xl overflow-hidden transition-all duration-200">
            <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <config.icon className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium flex-1">{config.title}</CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md"
                    onClick={onToggleCollapse}
                >
                    {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md"
                    onClick={onRemove}
                >
                    <X className="h-3 w-3" />
                </Button>
            </CardHeader>
            {!isCollapsed && (
                <CardContent className="p-3 pt-0">
                    <ErrorBoundary variant="inline">
                        {renderContent()}
                    </ErrorBoundary>
                </CardContent>
            )}
        </Card>
    );
}

export function WidgetPanel() {
    const { rightSidebarOpen, setRightSidebarOpen } = useUIStore();
    const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
    const widgetScrollRef = useRef<HTMLDivElement>(null);

    const removeWidget = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
    };

    const toggleCollapse = (id: string) => {
        setWidgets(widgets.map(w =>
            w.id === id ? { ...w, isCollapsed: !w.isCollapsed } : w
        ));
    };

    if (!rightSidebarOpen) return null;

    return (
        <TooltipProvider>
            <aside className="flex flex-col w-72 bg-sidebar/50 backdrop-blur-sm border-l border-sidebar-border h-screen fixed right-12 top-0 z-30">
                {/* Header */}
                <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
                    <span className="font-semibold text-sm">Widgets</span>
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
                                    <Settings2 className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Customize Widgets</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md"
                                    onClick={() => setRightSidebarOpen(false)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Close Panel</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Widget Slots */}
                <div className="flex-1 relative overflow-hidden">
                    <ScrollArea className="h-full p-3" viewportRef={widgetScrollRef} hideScrollbar>
                        <div className="space-y-3">
                            {widgets.map((widget) => (
                                <WidgetCard
                                    key={widget.id}
                                    config={widget}
                                    onRemove={() => removeWidget(widget.id)}
                                    isCollapsed={widget.isCollapsed}
                                    onToggleCollapse={() => toggleCollapse(widget.id)}
                                />
                            ))}

                            {/* Empty slot hint */}
                            {widgets.length < 3 && (
                                <div className="border-2 border-dashed border-muted rounded-2xl p-4 text-center text-muted-foreground text-sm">
                                    <p>Drop widget here</p>
                                    <p className="text-xs mt-1">or click + to add</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DotScrollIndicator
                        scrollRef={widgetScrollRef}
                        maxDots={5}
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        minHeightGrowth={0}
                    />
                </div>

                {/* Add Widget Button */}
                <div className="p-3 border-t border-sidebar-border">
                    <Button variant="outline" className="w-full rounded-xl text-sm">
                        + Add Widget
                    </Button>
                </div>
            </aside>
        </TooltipProvider>
    );
}
