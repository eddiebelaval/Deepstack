"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';
import { MultiSeriesChart, type SeriesData } from '@/components/charts/MultiSeriesChart';
import { Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// DeepStack Brand Palette for Series
// Derived from globals.css variables (--primary, --ds-deepseek, --ds-perplexity, etc.)
const SERIES_COLORS = [
    '#F59E0B', // Brand Amber (matches --primary/--ds-claude)
    '#3B82F6', // DeepSeek Blue (matches --ds-deepseek approx)
    '#A855F7', // Perplexity Purple (matches --ds-perplexity approx)
    '#10B981', // Profit Green (Emerald-500)
    '#EC4899', // Pink (High contrast accent)
    '#06B6D4', // Cyan (Blue-light)
    '#F97316', // Orange
    '#6366F1', // Indigo
];

// Display names for indices
const INDEX_NAMES: Record<string, string> = {
    'SPY': 'S&P 500',
    'QQQ': 'NASDAQ 100',
    'DIA': 'Dow Jones',
    'IWM': 'Russell 2000',
    'BTC/USD': 'Bitcoin',
    'ETH/USD': 'Ethereum',
    'DOGE/USD': 'Dogecoin',
    'XRP/USD': 'XRP',
};

const MARKET_INDICES = ['SPY', 'QQQ', 'DIA', 'IWM'];
const CRYPTO_SYMBOLS = ['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD'];
const TIMEFRAMES = ['1H', '4H', '1D', '1W', '1M'];

// Compact Legend Card Component (Webull-style)
interface LegendCardProps {
    symbol: string;
    displayName: string;
    price: number;
    percentChange: number;
    color: string;
    isVisible: boolean;
    onClick: () => void;
    isCrypto?: boolean;
}

function LegendCard({ symbol, displayName, price, percentChange, color, isVisible, onClick, isCrypto }: LegendCardProps) {
    const isPositive = percentChange >= 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-stretch min-w-[140px] rounded-lg transition-all duration-200 text-left overflow-hidden",
                "border border-border/40 hover:border-border/60",
                isVisible
                    ? "bg-card/60 opacity-100 shadow-sm"
                    : "bg-muted/20 opacity-40 grayscale"
            )}
        >
            {/* Color bar on left side */}
            <div
                className="w-1.5 shrink-0"
                style={{ backgroundColor: color }}
            />

            {/* Content */}
            <div className="flex flex-col justify-center py-2 px-3 flex-1 min-w-0">
                {/* Symbol/Name */}
                <div className="text-[10px] text-muted-foreground font-medium truncate leading-none mb-1.5 uppercase tracking-wider">
                    {displayName}
                </div>

                {/* Price */}
                <div className="text-base font-bold tracking-tight text-foreground leading-none mb-1">
                    {isCrypto
                        ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : price.toFixed(2)
                    }
                </div>

                {/* Percentage Change */}
                <div className={cn(
                    "text-xs font-semibold leading-none",
                    isPositive ? "text-green-500" : "text-red-500"
                )}>
                    {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
                </div>
            </div>
        </button>
    );
}

// Format relative time (e.g., "8:17 ago")
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

export function HomeWidgets() {
    const [activeTab, setActiveTab] = useState<'market' | 'watchlist' | 'crypto'>('market');
    const [timeframe, setTimeframe] = useState('1D');
    const [isLogScale, setIsLogScale] = useState(false);
    const [displayMode, setDisplayMode] = useState<'$' | '%'>('%'); // Default to % like Webull
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isMockData, setIsMockData] = useState(false);

    // State for series data
    const [seriesData, setSeriesData] = useState<SeriesData[]>([]);
    const [visibleSymbols, setVisibleSymbols] = useState<Set<string>>(new Set());

    const { getActiveWatchlist } = useWatchlistStore();
    const activeWatchlist = getActiveWatchlist();

    // Determine symbols based on tab
    const symbols = useMemo(() => {
        if (activeTab === 'market') return MARKET_INDICES;
        if (activeTab === 'crypto') return CRYPTO_SYMBOLS;
        return activeWatchlist?.items.map(i => i.symbol).slice(0, 8) || [];
    }, [activeTab, activeWatchlist]);

    const isCrypto = activeTab === 'crypto';

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
                    let apiTimeframe = '1d';
                    if (timeframe === '1H') apiTimeframe = '1h';
                    if (timeframe === '4H') apiTimeframe = '4h';
                    if (timeframe === '1D') apiTimeframe = '1d';
                    if (timeframe === '1W') apiTimeframe = '1w';
                    if (timeframe === '1M') apiTimeframe = '1mo';

                    const response = await fetch(`/api/market/bars?symbol=${encodeURIComponent(symbol)}&timeframe=${apiTimeframe}&limit=100`);
                    if (!response.ok) return null;

                    const data = await response.json();
                    const bars = data.bars || [];

                    if (bars.length === 0) {
                        console.warn(`No bars data for ${symbol}`);
                        return null;
                    }

                    return {
                        series: {
                            symbol,
                            data: bars.map((d: any) => ({
                                time: Math.floor(new Date(d.t || d.time).getTime() / 1000),
                                value: d.c ?? d.close ?? 0
                            })),
                            color: SERIES_COLORS[index % SERIES_COLORS.length],
                            visible: true
                        },
                        isMock: !!data.mock
                    };
                });

                const results = await Promise.all(promises);
                const validResults = results.filter(Boolean);

                setIsMockData(validResults.some(r => r?.isMock));
                setSeriesData(validResults.map(r => r!.series));
                setLastUpdated(new Date());
            } catch (error) {
                console.error("Failed to fetch chart data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [symbols, timeframe]);

    // Calculate metrics for each series
    const seriesMetrics = useMemo(() => {
        return seriesData.map(s => {
            const firstBar = s.data[0];
            const lastBar = s.data[s.data.length - 1];

            if (!firstBar || !lastBar) return null;

            const open = firstBar.value;
            const close = lastBar.value;
            const change = close - open;
            const percentChange = (change / open) * 100;

            return {
                symbol: s.symbol,
                displayName: INDEX_NAMES[s.symbol] || s.symbol,
                price: close,
                percentChange,
                color: s.color,
                isPositive: percentChange >= 0
            };
        }).filter(Boolean);
    }, [seriesData]);

    // Filter series based on visibility and apply % normalization
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

    const tabTitle = activeTab === 'market' ? 'United States' :
        activeTab === 'crypto' ? 'Cryptocurrency' : 'Watchlist';

    return (
        <div className="w-full max-w-5xl mx-auto mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="p-4 bg-card/80 border-border/50 backdrop-blur-sm overflow-hidden">
                {/* Header with Title and Tabs */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">{tabTitle}</h2>

                    {/* Compact Tab Pills */}
                    <div className="flex bg-muted/40 p-0.5 rounded-lg">
                        {[
                            { key: 'market', label: 'Indices' },
                            { key: 'crypto', label: 'Crypto' },
                            { key: 'watchlist', label: 'Watchlist' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                    activeTab === tab.key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart Area with Percentage Labels Overlay */}
                <div className="relative h-[280px] w-full rounded-lg bg-background/40 border border-border/20 overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-[1px]">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}

                    {seriesData.length > 0 ? (
                        <>
                            <MultiSeriesChart
                                series={displaySeries}
                                logScale={isLogScale}
                            />
                            {/* Removed misaligned static labels overlay. Values are best shown on axis or via legend. */}
                        </>
                    ) : (
                        !isLoading && (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No data available
                            </div>
                        )
                    )}
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                    {/* Timeframe Pills */}
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

                    {/* Display Mode & Log Scale */}
                    <div className="flex items-center gap-3">
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

                {/* Webull-Style Legend Cards */}
                <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                        {seriesMetrics.map((metric) => metric && (
                            <LegendCard
                                key={metric.symbol}
                                symbol={metric.symbol}
                                displayName={metric.displayName}
                                price={metric.price}
                                percentChange={metric.percentChange}
                                color={metric.color}
                                isVisible={visibleSymbols.has(metric.symbol)}
                                onClick={() => toggleSymbol(metric.symbol)}
                                isCrypto={isCrypto}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer with timestamp and See All */}
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn("h-2 w-2 rounded-full", isMockData ? "bg-yellow-500" : "bg-green-500")}
                            title={isMockData ? "Using simulated data" : "Live data connection"}
                        />
                        <span>
                            {lastUpdated ? formatTimeAgo(lastUpdated) : 'Loading...'}
                        </span>
                    </div>
                    <button className="flex items-center gap-0.5 hover:text-foreground transition-colors">
                        See All <ChevronRight className="h-3 w-3" />
                    </button>
                </div>
            </Card>
        </div>
    );
}
