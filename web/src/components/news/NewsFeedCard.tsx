'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { NewsArticle } from '@/lib/stores/news-store';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Clock,
    Bookmark,
    BookmarkCheck,
} from 'lucide-react';

/**
 * NewsFeedCard - Modern news card matching BETS card design language
 *
 * Features:
 * - Glass-style card with rounded corners and hover effects
 * - Fixed height for square-ish grid layout (h-[180px])
 * - Sentiment indicator (bullish/bearish/neutral)
 * - Source badge similar to platform badges
 * - Time ago display
 * - Symbol tags with click-to-filter
 * - Bookmark toggle (like watchlist star)
 *
 * Designed to match the visual language of MarketFeedCard/BetsCarouselCard
 */

interface NewsFeedCardProps {
    article: NewsArticle;
    isBookmarked?: boolean;
    onToggleBookmark?: () => void;
    onSymbolClick?: (symbol: string) => void;
    className?: string;
}

const SENTIMENT_STYLES = {
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
        <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                'relative flex flex-col h-[180px] p-3 rounded-xl transition-all duration-200',
                'border border-border/50 hover:border-border/80',
                'bg-card/80 hover:bg-card hover:shadow-lg',
                'cursor-pointer group overflow-hidden',
                isBookmarked && 'ring-2 ring-primary/30',
                className
            )}
        >
            {/* Subtle gradient overlay based on sentiment */}
            <div
                className={cn(
                    'absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
                    sentimentConfig.bgGradient
                )}
            />

            {/* Header: Source badge + Sentiment + Time + Bookmark */}
            <div className="flex items-center justify-between mb-1.5 shrink-0 relative z-10">
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
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleBookmark();
                            }}
                            className={cn(
                                'p-1 rounded-full transition-all',
                                isBookmarked
                                    ? 'text-primary hover:text-primary/80'
                                    : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100'
                            )}
                            title={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
                        >
                            {isBookmarked ? (
                                <BookmarkCheck className="h-3.5 w-3.5 fill-current" />
                            ) : (
                                <Bookmark className="h-3.5 w-3.5" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Headline - fills available space */}
            <h3
                className="text-xs font-semibold text-foreground leading-snug line-clamp-3 flex-1 relative z-10 group-hover:text-primary transition-colors"
                title={article.headline}
            >
                {article.headline}
            </h3>

            {/* Footer: Symbol tags */}
            {article.symbols && article.symbols.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1 shrink-0 relative z-10">
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
            )}
        </a>
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
