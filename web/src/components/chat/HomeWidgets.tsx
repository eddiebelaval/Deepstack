"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';
import { LazyMultiSeriesChart } from '@/components/lazy';
import { type SeriesData } from '@/components/charts/MultiSeriesChart';
import { Loader2, ChevronRight, Plus, X, Search } from 'lucide-react';
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
const TIMEFRAMES = ['1H', '4H', '1D', '1W', '1MO'];

// Compact Legend Card Component (Webull-style)
interface LegendCardProps {
    symbol: string;
    displayName: string;
    price: number;
    percentChange: number;
    color: string;
    isVisible: boolean;
    onClick: () => void;
    onRemove?: () => void;
    isCrypto?: boolean;
}

function LegendCard({ displayName, price, percentChange, color, isVisible, onClick, onRemove, isCrypto }: LegendCardProps) {
    const isPositive = percentChange >= 0;

    return (
        <div className="relative group">
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
            {/* Remove button - shown on hover when onRemove provided */}
            {onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
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
    const [activeTab, setActiveTab] = useState<'market' | 'watchlist' | 'crypto' | 'custom'>('market');
    const [timeframe, setTimeframe] = useState('1D');
    const [isLogScale, setIsLogScale] = useState(false);
    const [displayMode, setDisplayMode] = useState<'$' | '%'>('%'); // Default to % like Webull
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isMockData, setIsMockData] = useState(false);

    // Custom symbols state
    const [customSymbols, setCustomSymbols] = useState<string[]>(['SPY', 'AAPL']);
    const [isAddingSymbol, setIsAddingSymbol] = useState(false);
    const [newSymbolInput, setNewSymbolInput] = useState('');
    const symbolInputRef = useRef<HTMLInputElement>(null);

    // State for series data
    const [seriesData, setSeriesData] = useState<SeriesData[]>([]);
    const [visibleSymbols, setVisibleSymbols] = useState<Set<string>>(new Set());

    const { getActiveWatchlist } = useWatchlistStore();
    const activeWatchlist = getActiveWatchlist();

    // Focus input when adding symbol
    useEffect(() => {
        if (isAddingSymbol && symbolInputRef.current) {
            symbolInputRef.current.focus();
        }
    }, [isAddingSymbol]);

    // Add custom symbol
    const handleAddSymbol = () => {
        const symbol = newSymbolInput.trim().toUpperCase();
        if (symbol && !customSymbols.includes(symbol) && customSymbols.length < 8) {
            setCustomSymbols([...customSymbols, symbol]);
        }
        setNewSymbolInput('');
        setIsAddingSymbol(false);
    };

    // Remove custom symbol
    const removeCustomSymbol = (symbol: string) => {
        setCustomSymbols(customSymbols.filter(s => s !== symbol));
    };

    // Determine symbols based on tab
    const symbols = useMemo(() => {
        if (activeTab === 'market') return MARKET_INDICES;
        if (activeTab === 'crypto') return CRYPTO_SYMBOLS;
        if (activeTab === 'custom') return customSymbols;
        return activeWatchlist?.items.map(i => i.symbol).slice(0, 8) || [];
    }, [activeTab, activeWatchlist, customSymbols]);

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
                    // Map UI timeframe to API timeframe
                    const timeframeMap: Record<string, string> = {
                        '1H': '1h',
                        '4H': '4h',
                        '1D': '1d',
                        '1W': '1w',
                        '1MO': '1mo'
                    };
                    const apiTimeframe = timeframeMap[timeframe] || '1d';

                    const response = await fetch(`/api/market/bars?symbol=${encodeURIComponent(symbol)}&timeframe=${apiTimeframe}&limit=100`);
                    if (!response.ok) return null;

                    const json = await response.json();
                    // Handle standardized API response format: { success, data: { bars }, meta }
                    const responseData = json.data || json;
                    const bars = responseData.bars || [];

                    if (bars.length === 0) {
                        console.warn(`No bars data for ${symbol}`);
                        return null;
                    }

                    return {
                        series: {
                            symbol,
                            data: bars.map((d: any) => {
                                // Handle both formats:
                                // - ISO string (d.t like "2024-01-15T00:00:00Z")
                                // - Unix timestamp in seconds (d.time like 1607403600)
                                let timestamp: number;
                                if (d.t && typeof d.t === 'string') {
                                    timestamp = Math.floor(new Date(d.t).getTime() / 1000);
                                } else {
                                    // time is already Unix timestamp in seconds
                                    timestamp = d.time;
                                }
                                return {
                                    time: timestamp,
                                    value: d.c ?? d.close ?? 0
                                };
                            }),
                            color: SERIES_COLORS[index % SERIES_COLORS.length],
                            visible: true
                        },
                        isMock: json.meta?.isMock || false
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
        activeTab === 'crypto' ? 'Cryptocurrency' :
            activeTab === 'custom' ? 'Custom Comparison' : 'Watchlist';

    return (
        <div className="w-full max-w-5xl mx-auto mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="p-4 bg-card/80 border-border/50 backdrop-blur-sm overflow-hidden">
                {/* Header with Title and Tabs */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">{tabTitle}</h2>
                        {/* Add Symbol button - only show on custom tab */}
                        {activeTab === 'custom' && (
                            isAddingSymbol ? (
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleAddSymbol(); }}
                                    className="flex items-center gap-1"
                                >
                                    <Input
                                        ref={symbolInputRef}
                                        type="text"
                                        value={newSymbolInput}
                                        onChange={(e) => setNewSymbolInput(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Escape' && setIsAddingSymbol(false)}
                                        placeholder="SYMBOL"
                                        className="h-7 w-20 text-xs uppercase px-2"
                                        maxLength={10}
                                    />
                                    <Button type="submit" size="icon" variant="ghost" className="h-7 w-7">
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => { setNewSymbolInput(''); setIsAddingSymbol(false); }}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </form>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1"
                                    onClick={() => setIsAddingSymbol(true)}
                                    disabled={customSymbols.length >= 8}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add
                                </Button>
                            )
                        )}
                    </div>

                    {/* Compact Tab Pills */}
                    <div className="flex bg-muted/40 p-0.5 rounded-lg">
                        {[
                            { key: 'market', label: 'Indices' },
                            { key: 'crypto', label: 'Crypto' },
                            { key: 'watchlist', label: 'Watchlist' },
                            { key: 'custom', label: 'Custom' }
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
                            <LazyMultiSeriesChart
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
                                onRemove={activeTab === 'custom' ? () => removeCustomSymbol(metric.symbol) : undefined}
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
