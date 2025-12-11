'use client';

/**
 * RelatedPredictionMarkets - Show prediction markets related to news content
 *
 * Extracts keywords from news article and finds relevant prediction markets
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProbabilityBar } from '@/components/prediction-markets/ProbabilityBar';
import { PlatformBadge } from '@/components/prediction-markets/PlatformBadge';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';
import { Activity, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

interface RelatedPredictionMarketsProps {
    headline: string;
    summary?: string;
    symbols?: string[];
    maxResults?: number;
}

// Keyword extraction for finding related markets
function extractMarketKeywords(headline: string, summary?: string, symbols?: string[]): string[] {
    const text = `${headline} ${summary || ''}`.toLowerCase();
    const keywords: string[] = [];

    // Financial/economic keywords
    if (text.includes('fed') || text.includes('federal reserve') || text.includes('rate'))
        keywords.push('fed rate');
    if (text.includes('inflation') || text.includes('cpi'))
        keywords.push('inflation');
    if (text.includes('recession') || text.includes('gdp'))
        keywords.push('recession');
    if (text.includes('tariff') || text.includes('trade'))
        keywords.push('tariffs');

    // Crypto keywords
    if (text.includes('bitcoin') || text.includes('btc'))
        keywords.push('bitcoin');
    if (text.includes('ethereum') || text.includes('eth'))
        keywords.push('ethereum');
    if (text.includes('crypto'))
        keywords.push('crypto');

    // Political keywords
    if (text.includes('trump'))
        keywords.push('trump');
    if (text.includes('election'))
        keywords.push('election');

    // Stock-related keywords
    if (text.includes('earnings') || text.includes('revenue') || text.includes('profit'))
        keywords.push('earnings');
    if (text.includes('s&p') || text.includes('s&p 500'))
        keywords.push('S&P 500');

    // Add stock symbols
    if (symbols && symbols.length > 0) {
        keywords.push(...symbols.slice(0, 2));
    }

    return [...new Set(keywords)].slice(0, 3); // Return unique keywords, max 3
}

export function RelatedPredictionMarkets({
    headline,
    summary,
    symbols,
    maxResults = 2,
}: RelatedPredictionMarketsProps) {
    const [markets, setMarkets] = useState<PredictionMarket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const { setActiveContent } = useUIStore();

    const keywords = extractMarketKeywords(headline, summary, symbols);

    const fetchRelatedMarkets = useCallback(async () => {
        if (keywords.length === 0) return;

        setIsLoading(true);
        try {
            // Search for first keyword (most relevant)
            const query = keywords[0];
            const res = await fetch(`/api/prediction-markets/search?q=${encodeURIComponent(query)}&limit=${maxResults}`);

            if (res.ok) {
                const data = await res.json();
                setMarkets(data.markets || []);
            }
        } catch (err) {
            console.error('Failed to fetch related prediction markets:', err);
        } finally {
            setIsLoading(false);
        }
    }, [keywords, maxResults]);

    // Fetch when expanded
    useEffect(() => {
        if (expanded && markets.length === 0 && !isLoading) {
            fetchRelatedMarkets();
        }
    }, [expanded, markets.length, isLoading, fetchRelatedMarkets]);

    // Don't render if no keywords found
    if (keywords.length === 0) return null;

    const handleOpenPredictionsPanel = () => {
        setActiveContent('prediction-markets');
    };

    return (
        <div className="mt-2 pt-2 border-t border-border/30">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
                <Activity className="h-3 w-3 text-primary" />
                <span className="font-medium">Related Markets</span>
                {keywords.length > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                        {keywords[0]}
                    </Badge>
                )}
                <span className="flex-1" />
                {expanded ? (
                    <ChevronUp className="h-3 w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3" />
                )}
            </button>

            {expanded && (
                <div className="mt-2 space-y-2">
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full rounded" />
                        </div>
                    ) : markets.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-2 text-center">
                            No related markets found
                        </div>
                    ) : (
                        <>
                            {markets.map((market) => (
                                <MiniMarketCard key={`${market.platform}-${market.id}`} market={market} />
                            ))}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-7 text-xs"
                                onClick={handleOpenPredictionsPanel}
                            >
                                View all prediction markets
                                <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// Compact market card for inline display
function MiniMarketCard({ market }: { market: PredictionMarket }) {
    const probability = Math.round(market.yesPrice * 100);

    return (
        <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
        >
            <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <PlatformBadge platform={market.platform} className="h-4" />
                    <span className="text-xs font-medium truncate">{market.title}</span>
                </div>
                <span
                    className={cn(
                        'text-sm font-bold flex-shrink-0',
                        probability >= 70 ? 'text-green-500' :
                            probability <= 30 ? 'text-red-500' : 'text-amber-500'
                    )}
                >
                    {probability}%
                </span>
            </div>
            <ProbabilityBar yesPrice={market.yesPrice} className="h-1" />
        </a>
    );
}
