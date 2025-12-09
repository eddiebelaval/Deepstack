'use client';

/**
 * PredictionMarketsPanel - Full prediction markets experience
 *
 * Features:
 * - Platform filters (All/Kalshi/Polymarket)
 * - Category tabs
 * - Search functionality
 * - Market grid with probability bars
 * - Selected market detail view
 * - Watchlist integration
 * - "Link to Thesis" action
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePredictionMarkets, type FeedType } from '@/hooks/usePredictionMarkets';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import type { PredictionMarket } from '@/lib/types/prediction-markets';
import { Card } from '@/components/ui/card';
import {
    SquareCard,
    SquareCardHeader,
    SquareCardContent,
    SquareCardFooter,
    SquareCardTitle,
    SquareCardActionButton,
} from '@/components/ui/square-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformBadge } from './PlatformBadge';
import { ProbabilityBar } from './ProbabilityBar';
import { cn } from '@/lib/utils';
import {
    Search,
    TrendingUp,
    Sparkles,
    ExternalLink,
    Eye,
    EyeOff,
    Link2,
    RefreshCw,
    AlertCircle,
    WifiOff,
} from 'lucide-react';

type PlatformFilter = 'all' | 'kalshi' | 'polymarket';
type CategoryFilter = 'all' | 'Economics' | 'Crypto' | 'Politics' | 'Stocks' | 'Sports';

const CATEGORIES: CategoryFilter[] = ['all', 'Economics', 'Crypto', 'Politics', 'Stocks', 'Sports'];

export function PredictionMarketsPanel() {
    const {
        markets,
        watchlist,
        filters,
        isLoading,
        error,
        isUnavailable,
        feedType,
        loadMarkets,
        searchMarkets,
        setFilters,
        setFeedType,
        toggleWatchlist,
        isInWatchlist,
    } = usePredictionMarkets();

    // Use Zustand store for selectedMarket (allows external components to pre-select)
    const { selectedMarket, setSelectedMarket } = usePredictionMarketsStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

    // Load markets on mount and when filters/feed type change
    useEffect(() => {
        loadMarkets(feedType);
    }, [platformFilter, feedType, loadMarkets]);

    // Handle feed type change
    const handleFeedChange = useCallback((newFeed: FeedType) => {
        setFeedType(newFeed);
        loadMarkets(newFeed);
    }, [setFeedType, loadMarkets]);

    // Apply filters to store
    useEffect(() => {
        setFilters({
            source: platformFilter,
            category: categoryFilter === 'all' ? null : categoryFilter,
        });
    }, [platformFilter, categoryFilter, setFilters]);

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            searchMarkets(searchQuery);
        } else {
            loadMarkets();
        }
    }, [searchQuery, searchMarkets, loadMarkets]);

    const handleRefresh = useCallback(() => {
        loadMarkets();
    }, [loadMarkets]);

    // Filter markets by category on frontend (since backend may not support all categories)
    const filteredMarkets = categoryFilter === 'all'
        ? markets
        : markets.filter(m => m.category?.toLowerCase().includes(categoryFilter.toLowerCase()));

    return (
        <div className="h-full flex flex-col">
            {/* Header with filters */}
            <div className="flex-shrink-0 p-4 border-b border-border/50 space-y-3">
                {/* Top row: Title + Status + Refresh */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Prediction Markets
                        </h2>
                        {/* Connection status - only show when unavailable */}
                        {isUnavailable && (
                            <Badge variant="destructive" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                                <WifiOff className="h-3 w-3 mr-1" />
                                Service Unavailable
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {watchlist.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                {watchlist.length} watching
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleRefresh}
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                        </Button>
                    </div>
                </div>

                {/* Feed type tabs (Trending / New) */}
                <div className="flex items-center gap-4">
                    <Tabs value={feedType} onValueChange={(v) => handleFeedChange(v as FeedType)}>
                        <TabsList className="grid grid-cols-2 w-fit">
                            <TabsTrigger value="trending" className="text-xs px-4 gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Trending
                            </TabsTrigger>
                            <TabsTrigger value="new" className="text-xs px-4 gap-1.5">
                                <Sparkles className="h-3.5 w-3.5" />
                                New
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Platform filter */}
                    <Tabs value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
                        <TabsList className="grid grid-cols-3 w-fit">
                            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                            <TabsTrigger value="kalshi" className="text-xs px-3">Kalshi</TabsTrigger>
                            <TabsTrigger value="polymarket" className="text-xs px-3">Polymarket</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Search and Categories */}
                <div className="flex gap-2 flex-wrap">
                    <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search markets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <Button type="submit" size="sm" variant="secondary">
                            Search
                        </Button>
                    </form>

                    {/* Category pills */}
                    <div className="flex gap-1 flex-wrap">
                        {CATEGORIES.map((cat) => (
                            <Button
                                key={cat}
                                variant={categoryFilter === cat ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setCategoryFilter(cat)}
                            >
                                {cat === 'all' ? 'All Categories' : cat}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 min-h-0 flex">
                {/* Market grid */}
                <div className={cn(
                    'flex-1 min-w-0 border-r border-border/30',
                    selectedMarket ? 'w-2/3' : 'w-full'
                )}>
                    <ScrollArea className="h-full">
                        <div className="p-4">
                            {isLoading && filteredMarkets.length === 0 ? (
                                // Loading skeletons - grid layout matching cards
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                                    {[...Array(8)].map((_, i) => (
                                        <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : error ? (
                                // Error state
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                                        Retry
                                    </Button>
                                </div>
                            ) : filteredMarkets.length === 0 ? (
                                // Empty state
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <TrendingUp className="h-10 w-10 text-muted-foreground/50 mb-3" />
                                    <p className="text-sm text-muted-foreground">No markets found</p>
                                    {searchQuery && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => {
                                                setSearchQuery('');
                                                loadMarkets();
                                            }}
                                        >
                                            Clear search
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                // Market cards - grid layout
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                                    {filteredMarkets.map((market) => (
                                        <MarketCard
                                            key={`${market.platform}-${market.id}`}
                                            market={market}
                                            isSelected={selectedMarket?.id === market.id}
                                            isWatched={isInWatchlist(market.platform, market.id)}
                                            onSelect={() => setSelectedMarket(market)}
                                            onToggleWatch={() => toggleWatchlist(market)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Detail panel (when market selected) */}
                {selectedMarket && (
                    <div className="w-1/3 min-w-[280px] max-w-[400px]">
                        <MarketDetailPanel
                            market={selectedMarket}
                            isWatched={isInWatchlist(selectedMarket.platform, selectedMarket.id)}
                            onToggleWatch={() => toggleWatchlist(selectedMarket)}
                            onClose={() => setSelectedMarket(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ============ Market Card Component ============

function MarketCard({
    market,
    isSelected,
    isWatched,
    onSelect,
    onToggleWatch,
}: {
    market: PredictionMarket;
    isSelected: boolean;
    isWatched: boolean;
    onSelect: () => void;
    onToggleWatch: () => void;
}) {
    const probability = Math.round(market.yesPrice * 100);

    return (
        <SquareCard
            onClick={onSelect}
            isHighlighted={isWatched}
            isSelected={isSelected}
        >
            {/* Header: Platform badge + Watch toggle */}
            <SquareCardHeader>
                <PlatformBadge platform={market.platform} size="sm" />
                <SquareCardActionButton
                    onClick={() => onToggleWatch()}
                    isActive={isWatched}
                    activeClassName="text-primary hover:text-primary/80"
                    title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                    {isWatched ? (
                        <Eye className="h-3.5 w-3.5" />
                    ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                    )}
                </SquareCardActionButton>
            </SquareCardHeader>

            {/* Title */}
            <SquareCardTitle className="mb-2">{market.title}</SquareCardTitle>

            {/* Probability bar in content area */}
            <SquareCardContent className="mb-2">
                <div className="h-full flex flex-col justify-center">
                    <ProbabilityBar yesPrice={market.yesPrice} />
                    {market.category && (
                        <Badge variant="outline" className="text-[10px] mt-2 w-fit">
                            {market.category}
                        </Badge>
                    )}
                </div>
            </SquareCardContent>

            {/* Footer: Price + Volume */}
            <SquareCardFooter>
                {/* Left: Probability */}
                <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                        <span
                            className={cn(
                                'text-xl font-bold tabular-nums leading-none',
                                probability >= 50 ? 'text-green-500' : 'text-red-500'
                            )}
                        >
                            {probability}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">YES</span>
                    </div>
                </div>

                {/* Right: Volume */}
                <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-foreground leading-none">
                        ${formatVolume(market.volume)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">vol</span>
                </div>
            </SquareCardFooter>
        </SquareCard>
    );
}

// ============ Market Detail Panel ============

function MarketDetailPanel({
    market,
    isWatched,
    onToggleWatch,
    onClose,
}: {
    market: PredictionMarket;
    isWatched: boolean;
    onToggleWatch: () => void;
    onClose: () => void;
}) {
    const probability = Math.round(market.yesPrice * 100);

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <PlatformBadge platform={market.platform} />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                        ×
                    </Button>
                </div>

                {/* Title and probability */}
                <div>
                    <h3 className="font-semibold text-lg leading-tight mb-2">{market.title}</h3>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className={cn(
                                'text-3xl font-bold',
                                probability >= 70 ? 'text-green-500' :
                                    probability <= 30 ? 'text-red-500' : 'text-amber-500'
                            )}>
                                {probability}%
                            </div>
                            <span className="text-xs text-muted-foreground">YES</span>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-muted-foreground">
                                {100 - probability}%
                            </div>
                            <span className="text-xs text-muted-foreground">NO</span>
                        </div>
                    </div>
                </div>

                <ProbabilityBar yesPrice={market.yesPrice} />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Volume</div>
                        <div className="font-semibold">${formatVolume(market.volume)}</div>
                    </div>
                    {market.volume24h && (
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">24h Volume</div>
                            <div className="font-semibold">${formatVolume(market.volume24h)}</div>
                        </div>
                    )}
                    {market.endDate && (
                        <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                            <div className="text-xs text-muted-foreground mb-1">Ends</div>
                            <div className="font-semibold">
                                {new Date(market.endDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                {market.description && (
                    <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Description</h4>
                        <p className="text-sm text-muted-foreground line-clamp-4">{market.description}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                    <Button
                        className="w-full"
                        onClick={() => window.open(market.url, '_blank')}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Trade on {market.platform === 'kalshi' ? 'Kalshi' : 'Polymarket'}
                    </Button>

                    <Button
                        variant={isWatched ? 'secondary' : 'outline'}
                        className="w-full"
                        onClick={onToggleWatch}
                    >
                        {isWatched ? (
                            <>
                                <Eye className="h-4 w-4 mr-2" />
                                Watching
                            </>
                        ) : (
                            <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Add to Watchlist
                            </>
                        )}
                    </Button>

                    <Button variant="outline" className="w-full">
                        <Link2 className="h-4 w-4 mr-2" />
                        Link to Thesis
                    </Button>
                </div>
            </div>
        </ScrollArea>
    );
}

// ============ Helpers ============

function formatVolume(volume: number): string {
    if (volume >= 1_000_000) {
        return `${(volume / 1_000_000).toFixed(1)}M`;
    }
    if (volume >= 1_000) {
        return `${(volume / 1_000).toFixed(1)}K`;
    }
    return volume.toFixed(0);
}
