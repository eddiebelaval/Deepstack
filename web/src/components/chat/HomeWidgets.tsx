"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';
import { MultiSeriesChart, type SeriesData } from '@/components/charts/MultiSeriesChart';
import { Loader2, RefreshCw, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Predefined colors for series
const COLORS = [
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
];

const MARKET_INDICES = ['SPY', 'QQQ', 'DIA', 'IWM'];
const CRYPTO_SYMBOLS = ['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD'];
const TIMEFRAMES = ['1H', '4H', '1D', '1W', '1M'];

export function HomeWidgets() {
    const [activeTab, setActiveTab] = useState<'market' | 'watchlist' | 'crypto'>('market');
    const [timeframe, setTimeframe] = useState('1D');
    const [isLogScale, setIsLogScale] = useState(false);
    const [displayMode, setDisplayMode] = useState<'$' | '%'>('$');
    const [isLoading, setIsLoading] = useState(false);

    // State for series data
    const [seriesData, setSeriesData] = useState<SeriesData[]>([]);
    const [visibleSymbols, setVisibleSymbols] = useState<Set<string>>(new Set());

    const { getActiveWatchlist } = useWatchlistStore();
    const activeWatchlist = getActiveWatchlist();

    // Determine symbols based on tab
    const symbols = useMemo(() => {
        if (activeTab === 'market') return MARKET_INDICES;
        if (activeTab === 'crypto') return CRYPTO_SYMBOLS;
        return activeWatchlist?.items.map(i => i.symbol).slice(0, 8) || []; // Limit to 8 for colors
    }, [activeTab, activeWatchlist]);

    // Initialize visibility when symbols change
    useEffect(() => {
        setVisibleSymbols(new Set(symbols));
    }, [symbols]);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (symbols.length === 0) {
                setSeriesData([]);
                return;
            }

            setIsLoading(true);
            try {
                const promises = symbols.map(async (symbol, index) => {
                    // Map UI timeframe to API timeframe
                    let apiTimeframe = '1d';
                    if (timeframe === '1H') apiTimeframe = '1h';
                    if (timeframe === '4H') apiTimeframe = '4h';
                    if (timeframe === '1D') apiTimeframe = '1d';
                    if (timeframe === '1W') apiTimeframe = '1w';
                    if (timeframe === '1M') apiTimeframe = '1mo'; // Assuming API supports 1mo

                    // Using the existing quotes API or bars API
                    // Since we need history, we likely need a bars endpoint.
                    // Assuming /api/market/bars exists or similar.
                    // If not, we might need to use the existing market-data-store logic or a new endpoint.
                    // For now, let's try to fetch from a hypothetical endpoint or use what we have.
                    // The StreamingTicker uses /api/market/quotes which is current data.
                    // We need historical.

                    const response = await fetch(`/api/market/bars?symbol=${symbol}&timeframe=${apiTimeframe}&limit=100`);
                    if (!response.ok) return null;

                    const data = await response.json();
                    // API returns { bars: [...] } with bars having { t, o, h, l, c, v }
                    const bars = data.bars || [];

                    if (bars.length === 0) {
                        console.warn(`No bars data for ${symbol}`);
                        return null;
                    }

                    return {
                        symbol,
                        data: bars.map((d: any) => ({
                            time: Math.floor(new Date(d.t || d.time).getTime() / 1000), // Support both Alpaca (t) and fallback (time) format
                            value: d.c ?? d.close ?? 0 // Support both Alpaca (c) and fallback (close) format
                        })),
                        color: COLORS[index % COLORS.length],
                        visible: true
                    };
                });

                const results = await Promise.all(promises);
                const validResults = results.filter(Boolean) as SeriesData[];
                setSeriesData(validResults);
            } catch (error) {
                console.error("Failed to fetch chart data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [symbols, timeframe]);

    // Filter series based on visibility state and apply % normalization if needed
    const displaySeries = useMemo(() => {
        return seriesData.map(s => {
            const firstValue = s.data[0]?.value || 1;
            return {
                ...s,
                visible: visibleSymbols.has(s.symbol),
                data: displayMode === '%'
                    ? s.data.map(d => ({
                        ...d,
                        value: ((d.value - firstValue) / firstValue) * 100
                    }))
                    : s.data
            };
        });
    }, [seriesData, visibleSymbols, displayMode]);

    const toggleSymbol = (symbol: string) => {
        const newSet = new Set(visibleSymbols);
        if (newSet.has(symbol)) {
            newSet.delete(symbol);
        } else {
            newSet.add(symbol);
        }
        setVisibleSymbols(newSet);
    };

    return (
        <div className="w-full max-w-5xl mx-auto mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="p-4 bg-card/50 border-border/50 backdrop-blur-sm">
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    {/* Tabs */}
                    <div className="flex bg-muted/50 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('market')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                activeTab === 'market'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Market Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('watchlist')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                activeTab === 'watchlist'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Watchlist
                        </button>
                        <button
                            onClick={() => setActiveTab('crypto')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                activeTab === 'crypto'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Crypto
                        </button>
                    </div>

                    {/* Chart Controls */}
                    <div className="flex items-center gap-4">
                        {/* Timeframe */}
                        <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/30">
                            {TIMEFRAMES.map(tf => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] font-medium rounded-md transition-all",
                                        timeframe === tf
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

                        {/* Display Mode Toggle ($ / %) */}
                        <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/30">
                            <button
                                onClick={() => setDisplayMode('$')}
                                className={cn(
                                    "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                                    displayMode === '$'
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                $
                            </button>
                            <button
                                onClick={() => setDisplayMode('%')}
                                className={cn(
                                    "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                                    displayMode === '%'
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                %
                            </button>
                        </div>

                        {/* Log Scale Toggle */}
                        <div className="flex items-center gap-2">
                            <Switch
                                id="log-scale"
                                checked={isLogScale}
                                onCheckedChange={setIsLogScale}
                                className="h-4 w-7"
                            />
                            <Label htmlFor="log-scale" className="text-xs text-muted-foreground cursor-pointer">LOG</Label>
                        </div>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="h-[300px] w-full relative border border-border/30 rounded-lg bg-background/30 overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-[1px]">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}
                    {seriesData.length > 0 ? (
                        <MultiSeriesChart
                            series={displaySeries}
                            logScale={isLogScale}
                        />
                    ) : (
                        !isLoading && (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No data available
                            </div>
                        )
                    )}
                </div>

                {/* Legend / Toggles */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {seriesData.map((s) => (
                        <button
                            key={s.symbol}
                            onClick={() => toggleSymbol(s.symbol)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition-all",
                                visibleSymbols.has(s.symbol)
                                    ? "bg-card border-border/50 opacity-100"
                                    : "bg-muted/20 border-transparent opacity-50 grayscale"
                            )}
                        >
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                            <span className="font-medium">{s.symbol}</span>
                        </button>
                    ))}
                </div>

                {/* Meta Data Cards */}
                <div className="overflow-x-auto mt-6 pt-4 border-t border-border/30">
                    <div className="flex gap-4 pb-2">
                        {seriesData.filter(s => visibleSymbols.has(s.symbol)).map(s => {
                            // Get the last bar for current values
                            const lastBar = s.data[s.data.length - 1];
                            const firstBar = s.data[0];

                            if (!lastBar || !firstBar) return null;

                            // Calculate metrics from bar data
                            const close = lastBar.value;
                            const open = firstBar.value;
                            const change = close - open;
                            const changePercent = (change / open) * 100;
                            const isPositive = change >= 0;

                            // Calculate high/low from all visible data
                            const high = Math.max(...s.data.map(d => d.value));
                            const low = Math.min(...s.data.map(d => d.value));

                            return (
                                <div key={s.symbol} className="min-w-[200px] p-3 rounded-lg bg-muted/20 border border-border/30">
                                    <div className="text-xs text-muted-foreground font-medium mb-2">{s.symbol}</div>

                                    <div className="text-2xl font-bold tracking-tight mb-1">
                                        {displayMode === '$' ? `$${close.toFixed(2)}` : `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`}
                                    </div>

                                    <div className={cn(
                                        "text-sm font-medium mb-3",
                                        isPositive ? "text-green-500" : "text-red-500"
                                    )}>
                                        {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                        <div className="text-muted-foreground">Open</div>
                                        <div className="font-medium text-right">{displayMode === '$' ? `$${open.toFixed(2)}` : '0.00%'}</div>

                                        <div className="text-muted-foreground">High</div>
                                        <div className="font-medium text-right text-green-500">
                                            {displayMode === '$' ? `$${high.toFixed(2)}` : `+${(((high - open) / open) * 100).toFixed(2)}%`}
                                        </div>

                                        <div className="text-muted-foreground">Low</div>
                                        <div className="font-medium text-right text-red-500">
                                            {displayMode === '$' ? `$${low.toFixed(2)}` : `${(((low - open) / open) * 100).toFixed(2)}%`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>
        </div>
    );
}
