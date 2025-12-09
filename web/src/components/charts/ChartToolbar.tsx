'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useTradingStore, type Timeframe, type ChartType } from '@/lib/stores/trading-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useSearchPaletteStore } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import {
    Search,
    X,
    ChevronUp,
    ChevronDown,
    CandlestickChart,
    LineChart,
    AreaChart,
    Layers,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: React.ElementType }[] = [
    { value: 'candlestick', label: 'Candles', icon: CandlestickChart },
    { value: 'line', label: 'Line', icon: LineChart },
    { value: 'area', label: 'Area', icon: AreaChart },
];

// Overlay colors matching our brand palette
const OVERLAY_COLORS = [
    '#3B82F6', // Blue
    '#A855F7', // Purple
    '#10B981', // Green
    '#EC4899', // Pink
];

export function ChartToolbar() {
    const {
        activeSymbol,
        overlaySymbols,
        timeframe,
        chartType,
        setTimeframe,
        setChartType,
        removeOverlaySymbol,
    } = useTradingStore();

    const { chartPanelCollapsed, toggleChartCollapsed } = useUIStore();
    const { setSearchOpen } = useSearchPaletteStore();

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-background/50 backdrop-blur-sm">
                {/* Left: Symbol info and overlays */}
                <div className="flex items-center gap-2">
                    {/* Main symbol button - opens search */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group"
                            >
                                <Search className="h-3.5 w-3.5 text-primary opacity-70 group-hover:opacity-100" />
                                <span className="font-semibold text-sm text-primary">{activeSymbol}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Search symbols (⌘K)</TooltipContent>
                    </Tooltip>

                    {/* Overlay symbols pills */}
                    {overlaySymbols.length > 0 && (
                        <div className="flex items-center gap-1 ml-1">
                            <Layers className="h-3 w-3 text-muted-foreground" />
                            {overlaySymbols.map((symbol, index) => (
                                <div
                                    key={symbol}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                                    style={{
                                        backgroundColor: `${OVERLAY_COLORS[index % OVERLAY_COLORS.length]}20`,
                                        color: OVERLAY_COLORS[index % OVERLAY_COLORS.length],
                                    }}
                                >
                                    <span>{symbol}</span>
                                    <button
                                        onClick={() => removeOverlaySymbol(symbol)}
                                        className="hover:opacity-70 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add compare hint when no overlays */}
                    {overlaySymbols.length === 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setSearchOpen(true)}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                >
                                    <Layers className="h-3 w-3" />
                                    <span>Compare</span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Add symbols to compare</TooltipContent>
                        </Tooltip>
                    )}
                </div>

                {/* Center: Timeframe selector */}
                <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/30">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.value}
                            onClick={() => setTimeframe(tf.value)}
                            className={cn(
                                "px-2 py-1 text-xs font-medium rounded-md transition-all",
                                timeframe === tf.value
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                {/* Right: Chart type and collapse */}
                <div className="flex items-center gap-2">
                    {/* Chart type selector */}
                    <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/30">
                        {CHART_TYPES.map((ct) => (
                            <Tooltip key={ct.value}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setChartType(ct.value)}
                                        className={cn(
                                            "p-1.5 rounded-md transition-all",
                                            chartType === ct.value
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <ct.icon className="h-3.5 w-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>{ct.label}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>

                    {/* Collapse/expand button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg"
                                onClick={toggleChartCollapsed}
                            >
                                {chartPanelCollapsed ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronUp className="h-4 w-4" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {chartPanelCollapsed ? 'Expand chart' : 'Collapse chart'}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default ChartToolbar;
