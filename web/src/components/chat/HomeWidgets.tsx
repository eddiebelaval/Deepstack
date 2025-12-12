"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';
import { useMarketWatchStore, getSymbolDisplayName } from '@/lib/stores/market-watch-store';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { usePositionsStore } from '@/lib/stores/positions-store';
import { LazyMultiSeriesChart } from '@/components/lazy';
import { type SeriesData } from '@/components/charts/MultiSeriesChart';
import { Loader2, ChevronRight, Plus, X, Pencil, RotateCcw, Settings, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BetsCarousel } from '@/components/prediction-markets';
import { WatchlistManagementDialog } from '@/components/trading/WatchlistManagementDialog';
import { SymbolSearchDialog } from '@/components/trading/SymbolSearchDialog';
import { PositionsPanel } from '@/components/trading/PositionsPanel';
import { PositionEntryForm } from '@/components/trading/PositionEntryForm';
import { IndexControlPanel, AVAILABLE_INDICES } from '@/components/ui/index-control-panel';

// deepstack Brand Palette for Series
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

const TIMEFRAMES = ['1H', '4H', '1D', '1W', '1MO'];

// Glass Asset Card Component - Color-coded edge glow effect
// Creates optical projection by placing colored element behind frosted glass button
interface GlassAssetCardProps {
    symbol: string;
    displayName: string;
    price: number;
    percentChange: number;
    color: string;
    isVisible: boolean;
    onClick: () => void;
    onRemove?: () => void;
    isCrypto?: boolean;
    showRemoveAlways?: boolean; // Show remove button always (not just on hover)
}

function GlassAssetCard({ displayName, price, percentChange, color, isVisible, onClick, onRemove, isCrypto, showRemoveAlways }: GlassAssetCardProps) {
    const isPositive = percentChange >= 0;

    return (
        <div className="relative group">
            {/* Colored glow element - sits behind the glass button */}
            <div
                className={cn(
                    "absolute inset-0 rounded-xl transition-all duration-300",
                    isVisible ? "opacity-100" : "opacity-0"
                )}
                style={{
                    background: `radial-gradient(ellipse at center, ${color}40 0%, ${color}20 40%, transparent 70%)`,
                    filter: 'blur(8px)',
                    transform: 'scale(1.15)',
                }}
            />

            {/* Secondary edge glow - creates the optical projection effect */}
            <div
                className={cn(
                    "absolute inset-0 rounded-xl transition-all duration-300",
                    isVisible ? "opacity-100" : "opacity-0"
                )}
                style={{
                    boxShadow: `0 0 20px ${color}30, inset 0 0 20px ${color}10`,
                    border: `1px solid ${color}25`,
                }}
            />

            {/* Glass button - frosted surface */}
            <button
                onClick={onClick}
                className={cn(
                    "relative flex flex-col min-w-[130px] rounded-xl transition-all duration-200 text-left overflow-hidden z-10",
                    "backdrop-blur-md",
                    isVisible
                        ? "bg-background/60 shadow-lg hover:bg-background/70 hover:scale-[1.02]"
                        : "bg-muted/30 opacity-50 grayscale hover:opacity-70"
                )}
                style={{
                    // Subtle colored border that refracts the glow
                    border: isVisible ? `1px solid ${color}30` : '1px solid transparent',
                }}
            >
                {/* Top accent line - subtle color indicator */}
                <div
                    className={cn(
                        "h-0.5 w-full transition-opacity duration-200",
                        isVisible ? "opacity-80" : "opacity-30"
                    )}
                    style={{
                        background: `linear-gradient(90deg, transparent, ${color}, transparent)`
                    }}
                />

                {/* Content - Compact horizontal layout */}
                <div className="flex items-center gap-2 py-2 px-2.5 flex-1 min-w-0">
                    {/* Color dot */}
                    <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{
                            backgroundColor: color,
                            boxShadow: isVisible ? `0 0 6px ${color}80` : 'none'
                        }}
                    />

                    {/* Text content */}
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-muted-foreground font-medium truncate leading-tight uppercase tracking-wider">
                            {displayName}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-bold tracking-tight text-foreground leading-tight">
                                {isCrypto
                                    ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : price.toFixed(2)
                                }
                            </span>
                            <span className={cn(
                                "text-[10px] font-semibold leading-tight",
                                isPositive ? "text-green-500" : "text-red-500"
                            )}>
                                {isPositive ? '▲' : '▼'}{Math.abs(percentChange).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            </button>

            {/* Remove button - shown on hover or always when showRemoveAlways is true */}
            {onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className={cn(
                        "absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center transition-opacity shadow-md z-20",
                        showRemoveAlways ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
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
    const [activeTab, setActiveTab] = useState<'market' | 'watchlist' | 'crypto' | 'custom' | 'predictions' | 'positions'>('market');
    const [timeframe, setTimeframe] = useState('1D');
    const [isLogScale, setIsLogScale] = useState(false);
    const [displayMode, setDisplayMode] = useState<'$' | '%'>('%'); // Default to % like Webull
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isMockData, setIsMockData] = useState(false);

    // Symbol add input state
    const [isAddingSymbol, setIsAddingSymbol] = useState(false);
    const [newSymbolInput, setNewSymbolInput] = useState('');
    const symbolInputRef = useRef<HTMLInputElement>(null);

    // Watchlist dialog state
    const [showWatchlistManagement, setShowWatchlistManagement] = useState(false);
    const [showSymbolSearch, setShowSymbolSearch] = useState(false);

    // Position entry dialog state
    const [showAddPosition, setShowAddPosition] = useState(false);

    // State for series data
    const [seriesData, setSeriesData] = useState<SeriesData[]>([]);
    const [visibleSymbols, setVisibleSymbols] = useState<Set<string>>(new Set());

    // Use market watch store for persisted symbol lists
    const {
        indices,
        crypto,
        custom,
        isEditMode,
        addSymbol,
        removeSymbol,
        toggleEditMode,
        resetIndices,
        resetCrypto,
        resetCustom,
    } = useMarketWatchStore();

    const {
        getActiveWatchlist,
        removeSymbol: removeWatchlistSymbol,
        activeWatchlistId,
    } = useWatchlistStore();
    const activeWatchlist = getActiveWatchlist();

    // Prediction markets store and UI store for navigation
    const { setSelectedMarket } = usePredictionMarketsStore();
    const { setActiveContent } = useUIStore();

    // Positions store
    const addPosition = usePositionsStore((s) => s.addPosition);

    // Focus input when adding symbol
    useEffect(() => {
        if (isAddingSymbol && symbolInputRef.current) {
            symbolInputRef.current.focus();
        }
    }, [isAddingSymbol]);

    // Determine which tab type we're on for store operations
    const currentTabType = activeTab === 'market' ? 'indices' : activeTab === 'crypto' ? 'crypto' : activeTab === 'custom' ? 'custom' : null;
    const canEdit = activeTab !== 'predictions' && activeTab !== 'positions';
    const isWatchlistTab = activeTab === 'watchlist';

    // Add symbol to current tab
    const handleAddSymbol = () => {
        const symbol = newSymbolInput.trim().toUpperCase();
        if (symbol && currentTabType) {
            addSymbol(currentTabType, symbol);
        }
        setNewSymbolInput('');
        setIsAddingSymbol(false);
    };

    // Remove symbol from current tab
    const handleRemoveSymbol = (symbol: string) => {
        if (isWatchlistTab && activeWatchlistId) {
            removeWatchlistSymbol(activeWatchlistId, symbol);
        } else if (currentTabType) {
            removeSymbol(currentTabType, symbol);
        }
    };

    // Reset current tab to defaults
    const handleReset = () => {
        if (activeTab === 'market') resetIndices();
        else if (activeTab === 'crypto') resetCrypto();
        else if (activeTab === 'custom') resetCustom();
    };

    // Determine symbols based on tab - now using store values
    const symbols = useMemo(() => {
        if (activeTab === 'market') return indices;
        if (activeTab === 'crypto') return crypto;
        if (activeTab === 'custom') return custom;
        return activeWatchlist?.items.map(i => i.symbol).slice(0, 8) || [];
    }, [activeTab, activeWatchlist, indices, crypto, custom]);

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
                displayName: getSymbolDisplayName(s.symbol),
                price: close,
                percentChange,
                color: s.color,
                isPositive: percentChange >= 0
            };
        }).filter(Boolean);
    }, [seriesData]);

    // Create symbol to color mapping for the scroll wheel
    const symbolColors = useMemo(() => {
        const colors: Record<string, string> = {};
        // Map from the current symbols list with their assigned colors
        symbols.forEach((symbol, index) => {
            colors[symbol] = SERIES_COLORS[index % SERIES_COLORS.length];
        });
        return colors;
    }, [symbols]);

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
            activeTab === 'custom' ? 'Custom Comparison' :
                activeTab === 'positions' ? 'My Positions' : 'Watchlist';

    return (
        <div className="w-full h-full max-w-5xl mx-auto flex flex-col">
            <Card className="p-3 bg-card/80 border-border/50 backdrop-blur-sm overflow-hidden flex-1 flex flex-col">
                {/* Header with Title and Tabs */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">{tabTitle}</h2>

                        {/* Edit mode controls - show on editable tabs */}
                        {canEdit && (
                            <div className="flex items-center gap-1">
                                {isWatchlistTab ? (
                                    // Watchlist-specific controls
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => setShowWatchlistManagement(true)}
                                            title="Manage watchlists"
                                        >
                                            <Settings className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs gap-1"
                                            onClick={() => setShowSymbolSearch(true)}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add
                                        </Button>
                                    </>
                                ) : (
                                    // Market watch controls (indices, crypto, custom)
                                    <>
                                        {/* Edit toggle button */}
                                        <Button
                                            variant={isEditMode ? "secondary" : "ghost"}
                                            size="icon"
                                            className={cn(
                                                "h-7 w-7 transition-colors",
                                                isEditMode && "bg-primary/10 text-primary"
                                            )}
                                            onClick={toggleEditMode}
                                            title={isEditMode ? "Exit edit mode" : "Edit symbols"}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>

                                        {/* Reset button - only show in edit mode */}
                                        {isEditMode && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                onClick={handleReset}
                                                title="Reset to defaults"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                            </Button>
                                        )}

                                        {/* Add Symbol - show in edit mode or when adding */}
                                        {(isEditMode || isAddingSymbol) && (
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
                                                        placeholder={activeTab === 'crypto' ? "BTC/USD" : "SYMBOL"}
                                                        className="h-7 w-24 text-xs uppercase px-2"
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
                                                    disabled={symbols.length >= 8}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add
                                                </Button>
                                            )
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Compact Tab Pills */}
                    <div className="flex bg-muted/40 p-0.5 rounded-lg">
                        {[
                            { key: 'market', label: 'Indices' },
                            { key: 'crypto', label: 'Crypto' },
                            { key: 'positions', label: 'Positions', icon: Briefcase },
                            { key: 'predictions', label: 'Bets' },
                            { key: 'watchlist', label: 'Watchlist' },
                            { key: 'custom', label: 'Custom' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                                    activeTab === tab.key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area - Chart or Predictions or Positions - flex-1 to fill available space */}
                <div className="relative flex-1 min-h-[320px] w-full rounded-lg bg-background/40 border border-border/20 overflow-hidden">
                    {activeTab === 'predictions' ? (
                        <div className="h-full p-3">
                            <BetsCarousel
                                onMarketSelect={(market) => {
                                    setSelectedMarket(market);
                                    setActiveContent('prediction-markets');
                                }}
                                onViewAll={() => {
                                    setActiveContent('prediction-markets');
                                }}
                            />
                        </div>
                    ) : activeTab === 'positions' ? (
                        <div className="h-full p-3">
                            <PositionsPanel onAddPosition={() => setShowAddPosition(true)} />
                        </div>
                    ) : (
                        <>
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
                                </>
                            ) : (
                                !isLoading && (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        No data available
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>

                {/* Controls Row - Hidden for Predictions and Positions tabs */}
                {activeTab !== 'predictions' && activeTab !== 'positions' && (
                    <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
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
                )}

                {/* Index Control Panel - Unified wheel + grid for Indices tab */}
                {activeTab === 'market' && (
                    <div className="mt-2 pt-2 border-t border-border/30 pb-2">
                        <IndexControlPanel
                            selectedSymbols={indices}
                            activeIndices={seriesMetrics
                                .filter((m): m is NonNullable<typeof m> => m !== null)
                                .map(m => ({
                                    symbol: m.symbol,
                                    name: m.displayName,
                                    price: m.price,
                                    percentChange: m.percentChange,
                                    color: m.color
                                }))}
                            symbolColors={symbolColors}
                            onAdd={(symbol) => addSymbol('indices', symbol)}
                            onRemove={(symbol) => removeSymbol('indices', symbol)}
                            maxSymbols={12}
                        />
                    </div>
                )}

                {/* Glass Asset Cards for other tabs (Crypto, Watchlist, Custom) */}
                {activeTab !== 'predictions' && activeTab !== 'positions' && activeTab !== 'market' && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                        <div className="flex gap-3 items-center pb-3">
                            {/* Asset cards - centered */}
                            <div className="flex gap-3 justify-center flex-wrap flex-1">
                                {seriesMetrics.map((metric) => metric && (
                                    <GlassAssetCard
                                        key={metric.symbol}
                                        symbol={metric.symbol}
                                        displayName={metric.displayName}
                                        price={metric.price}
                                        percentChange={metric.percentChange}
                                        color={metric.color}
                                        isVisible={visibleSymbols.has(metric.symbol)}
                                        onClick={() => toggleSymbol(metric.symbol)}
                                        onRemove={(isEditMode && canEdit) ? () => handleRemoveSymbol(metric.symbol) : undefined}
                                        isCrypto={isCrypto}
                                        showRemoveAlways={isEditMode}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer with timestamp and See All - Hidden for Predictions and Positions tabs */}
                {activeTab !== 'predictions' && activeTab !== 'positions' && (
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
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
                )}
            </Card>

            {/* Watchlist Management Dialogs */}
            <WatchlistManagementDialog
                open={showWatchlistManagement}
                onOpenChange={setShowWatchlistManagement}
            />
            <SymbolSearchDialog
                open={showSymbolSearch}
                onOpenChange={setShowSymbolSearch}
            />

            {/* Position Entry Dialog */}
            <PositionEntryForm
                open={showAddPosition}
                onOpenChange={setShowAddPosition}
                onSave={(pos) => {
                    // Transform the position to match store format
                    addPosition({
                        ...pos,
                        side: pos.side.toLowerCase() as 'long' | 'short',
                    });
                    setShowAddPosition(false);
                }}
            />
        </div>
    );
}
