'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    SquareCard,
    SquareCardHeader,
    SquareCardContent,
    SquareCardFooter,
    SquareCardActionButton,
} from '@/components/ui/square-card';
import type { NewsArticle, NewsSentiment } from '@/lib/stores/news-store';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Clock,
    Bookmark,
    BookmarkCheck,
} from 'lucide-react';

/**
 * NewsFeedCard - News card using unified SquareCard component
 *
 * Now uses unified SquareCard component for consistent 1:1 aspect ratio
 *
 * Features:
 * - Sentiment indicator (bullish/bearish/neutral)
 * - Source badge similar to platform badges
 * - Time ago display
 * - Symbol tags with click-to-filter
 * - Bookmark toggle (like watchlist star)
 */

interface NewsFeedCardProps {
    article: NewsArticle;
    isBookmarked?: boolean;
    onToggleBookmark?: () => void;
    onSymbolClick?: (symbol: string) => void;
    className?: string;
}

// Type-safe sentiment styles including StockTwits bullish/bearish
const SENTIMENT_STYLES: Record<NewsSentiment, {
    icon: typeof TrendingUp;
    color: string;
    bgGradient: string;
}> = {
    positive: {
        icon: TrendingUp,
        color: 'text-green-500',
        bgGradient: 'from-green-500/10 to-transparent',
    },
    negative: {
        icon: TrendingDown,
        color: 'text-red-500',
        bgGradient: 'from-red-500/10 to-transparent',
    },
    neutral: {
        icon: Minus,
        color: 'text-muted-foreground',
        bgGradient: 'from-muted/20 to-transparent',
    },
    // StockTwits sentiment - bullish maps to positive styling
    bullish: {
        icon: TrendingUp,
        color: 'text-emerald-500',
        bgGradient: 'from-emerald-500/10 to-transparent',
    },
    // StockTwits sentiment - bearish maps to negative styling
    bearish: {
        icon: TrendingDown,
        color: 'text-orange-500',
        bgGradient: 'from-orange-500/10 to-transparent',
    },
};

export function NewsFeedCard({
    article,
    isBookmarked = false,
    onToggleBookmark,
    onSymbolClick,
    className,
}: NewsFeedCardProps) {
    const sentiment = article.sentiment || 'neutral';
    const sentimentConfig = SENTIMENT_STYLES[sentiment];
    const SentimentIcon = sentimentConfig.icon;

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays === 1) return '1d';
        return `${diffDays}d`;
    };

    return (
        <SquareCard
            href={article.url}
            isHighlighted={isBookmarked}
            hoverGradient={sentimentConfig.bgGradient}
            className={className}
        >
            {/* Header: Source badge + Sentiment + Time + Bookmark */}
            <SquareCardHeader>
                <div className="flex items-center gap-2">
                    <SourceBadge source={article.source} />
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px]">{formatTimeAgo(article.publishedAt)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Sentiment indicator */}
                    <div
                        className={cn(
                            'p-1 rounded-md transition-all',
                            sentimentConfig.color
                        )}
                        title={`${sentiment} sentiment`}
                    >
                        <SentimentIcon className="h-3.5 w-3.5" />
                    </div>
                    {/* Bookmark toggle */}
                    {onToggleBookmark && (
                        <SquareCardActionButton
                            onClick={() => onToggleBookmark()}
                            isActive={isBookmarked}
                            activeClassName="text-primary hover:text-primary/80"
                            title={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
                        >
                            {isBookmarked ? (
                                <BookmarkCheck className="h-3.5 w-3.5 fill-current" />
                            ) : (
                                <Bookmark className="h-3.5 w-3.5" />
                            )}
                        </SquareCardActionButton>
                    )}
                </div>
            </SquareCardHeader>

            {/* Headline - fills available space */}
            <SquareCardContent>
                <h3
                    className="text-xs font-semibold text-foreground leading-snug line-clamp-3 group-hover:text-primary transition-colors"
                    title={article.headline}
                >
                    {article.headline}
                </h3>
            </SquareCardContent>

            {/* Footer: Symbol tags */}
            <SquareCardFooter>
                {article.symbols && article.symbols.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {article.symbols.slice(0, 3).map((symbol) => (
                            <button
                                key={symbol}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onSymbolClick?.(symbol);
                                }}
                                className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                                    'bg-primary/10 text-primary border border-primary/20',
                                    'hover:bg-primary/20 hover:border-primary/40 transition-all'
                                )}
                            >
                                ${symbol}
                            </button>
                        ))}
                        {article.symbols.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                                +{article.symbols.length - 3}
                            </span>
                        )}
                    </div>
                ) : (
                    <div />
                )}
            </SquareCardFooter>
        </SquareCard>
    );
}

/**
 * SourceBadge - News source badge similar to PlatformBadge
 */
function SourceBadge({ source }: { source: string }) {
    const getShortSource = (src: string) => {
        const words = src.split(/[\s-]+/);
        if (words.length > 1) {
            return words.map((w) => w[0]).join('').toUpperCase().slice(0, 3);
        }
        return src.slice(0, 6);
    };

    const getSourceStyle = (src: string): { bg: string; text: string } => {
        const lower = src.toLowerCase();
        if (lower.includes('bloomberg')) return { bg: 'bg-orange-500/20', text: 'text-orange-400' };
        if (lower.includes('reuters')) return { bg: 'bg-blue-500/20', text: 'text-blue-400' };
        if (lower.includes('wsj') || lower.includes('wall street')) return { bg: 'bg-slate-500/20', text: 'text-slate-300' };
        if (lower.includes('cnbc')) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400' };
        if (lower.includes('yahoo')) return { bg: 'bg-purple-500/20', text: 'text-purple-400' };
        if (lower.includes('benzinga')) return { bg: 'bg-green-500/20', text: 'text-green-400' };
        if (lower.includes('seeking alpha')) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400' };
        if (lower.includes('marketwatch')) return { bg: 'bg-teal-500/20', text: 'text-teal-400' };
        return { bg: 'bg-muted/50', text: 'text-muted-foreground' };
    };

    const style = getSourceStyle(source);

    return (
        <Badge
            variant="secondary"
            className={cn(
                'px-1.5 py-0.5 text-[10px] font-semibold border-0',
                style.bg,
                style.text
            )}
            title={source}
        >
            {getShortSource(source)}
        </Badge>
    );
}

export default NewsFeedCard;
