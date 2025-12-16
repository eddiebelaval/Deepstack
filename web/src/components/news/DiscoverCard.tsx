'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { NewsArticle, NewsSentiment } from '@/lib/stores/news-store';
import {
  Clock,
  Heart,
  MoreHorizontal,
  ExternalLink,
  Bookmark,
  Share2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * DiscoverCard - Perplexity-style news card with large hero image
 *
 * Design inspired by Perplexity Discover:
 * - Large hero image taking most of card space
 * - Bold headline below image (no summary)
 * - Source icon + name + relative time
 * - Like and more options buttons
 */

interface DiscoverCardProps {
  article: NewsArticle;
  isLiked?: boolean;
  onToggleLike?: () => void;
  onSymbolClick?: (symbol: string) => void;
  className?: string;
}

// Source brand colors for fallback gradients and icons
const SOURCE_STYLES: Record<string, { gradient: string; initials: string; color: string }> = {
  bloomberg: { gradient: 'from-orange-500 to-orange-700', initials: 'BB', color: 'bg-orange-500' },
  reuters: { gradient: 'from-orange-600 to-red-600', initials: 'R', color: 'bg-orange-600' },
  wsj: { gradient: 'from-slate-700 to-slate-900', initials: 'WSJ', color: 'bg-slate-700' },
  cnbc: { gradient: 'from-blue-600 to-blue-800', initials: 'CNBC', color: 'bg-blue-600' },
  yahoo: { gradient: 'from-purple-500 to-purple-700', initials: 'Y!', color: 'bg-purple-500' },
  benzinga: { gradient: 'from-blue-500 to-cyan-500', initials: 'BZ', color: 'bg-blue-500' },
  seekingalpha: { gradient: 'from-orange-400 to-orange-600', initials: 'SA', color: 'bg-orange-500' },
  marketwatch: { gradient: 'from-green-600 to-green-800', initials: 'MW', color: 'bg-green-600' },
  finnhub: { gradient: 'from-indigo-500 to-indigo-700', initials: 'FH', color: 'bg-indigo-500' },
  alpaca: { gradient: 'from-yellow-500 to-yellow-700', initials: 'ALP', color: 'bg-yellow-500' },
  stocktwits: { gradient: 'from-blue-400 to-blue-600', initials: 'ST', color: 'bg-blue-500' },
  motleyfool: { gradient: 'from-blue-700 to-indigo-700', initials: 'MF', color: 'bg-blue-700' },
  fortune: { gradient: 'from-red-600 to-red-800', initials: 'F', color: 'bg-red-600' },
  default: { gradient: 'from-slate-500 to-slate-700', initials: '?', color: 'bg-slate-500' },
};

// Sentiment-based gradient overlays
const SENTIMENT_GRADIENTS: Record<NewsSentiment, string> = {
  positive: 'from-green-500/20 via-transparent to-transparent',
  negative: 'from-red-500/20 via-transparent to-transparent',
  neutral: 'from-slate-500/10 via-transparent to-transparent',
  bullish: 'from-emerald-500/20 via-transparent to-transparent',
  bearish: 'from-orange-500/20 via-transparent to-transparent',
};

function getSourceStyle(source: string) {
  const normalized = source.toLowerCase().replace(/[\s-_]/g, '');
  for (const [key, value] of Object.entries(SOURCE_STYLES)) {
    if (normalized.includes(key)) return value;
  }
  return SOURCE_STYLES.default;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export function DiscoverCard({
  article,
  isLiked = false,
  onToggleLike,
  onSymbolClick,
  className,
}: DiscoverCardProps) {
  const [imageError, setImageError] = useState(false);
  const sourceStyle = getSourceStyle(article.source);
  const sentiment = article.sentiment || 'neutral';
  const hasImage = article.imageUrl && !imageError;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block bg-card rounded-2xl overflow-hidden',
        'border border-border/50 shadow-sm',
        'hover:shadow-lg hover:border-border transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        className
      )}
    >
      {/* Hero Image Area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {hasImage ? (
          <>
            <Image
              src={article.imageUrl!}
              alt={article.headline}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Subtle gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        ) : (
          /* Fallback: Gradient with source branding */
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br',
              sourceStyle.gradient
            )}
          >
            {/* Large source initials */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-bold text-white/20">
                {sourceStyle.initials}
              </span>
            </div>
            {/* Sentiment-based subtle overlay */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-br',
                SENTIMENT_GRADIENTS[sentiment]
              )}
            />
          </div>
        )}

        {/* Sentiment indicator pill (top right) */}
        {sentiment !== 'neutral' && (
          <div
            className={cn(
              'absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium',
              'flex items-center gap-1 backdrop-blur-sm',
              sentiment === 'positive' || sentiment === 'bullish'
                ? 'bg-green-500/90 text-white'
                : 'bg-red-500/90 text-white'
            )}
          >
            {sentiment === 'positive' || sentiment === 'bullish' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span className="capitalize">{sentiment}</span>
          </div>
        )}

        {/* Symbol tags (bottom left) */}
        {article.symbols && article.symbols.length > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {article.symbols.slice(0, 2).map((symbol) => (
              <button
                key={symbol}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSymbolClick?.(symbol);
                }}
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-semibold',
                  'bg-black/70 text-white backdrop-blur-sm',
                  'hover:bg-black/90 transition-colors'
                )}
              >
                ${symbol}
              </button>
            ))}
            {article.symbols.length > 2 && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-black/50 text-white/80 backdrop-blur-sm">
                +{article.symbols.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-3">
        {/* Headline */}
        <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {article.headline}
        </h3>

        {/* Meta Row */}
        <div className="flex items-center justify-between">
          {/* Source + Time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {/* Source icon */}
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold',
                sourceStyle.color
              )}
            >
              {sourceStyle.initials.charAt(0)}
            </div>
            <span className="text-sm font-medium text-foreground/80">
              {article.source}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-sm">{formatTimeAgo(article.publishedAt)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Like Button */}
            {onToggleLike && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleLike();
                }}
                className={cn(
                  'p-2 rounded-full transition-colors',
                  isLiked
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
              </button>
            )}

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.preventDefault()}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="More options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(article.url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in new tab
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(article.url);
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike?.();
                  }}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  {isLiked ? 'Remove from saved' : 'Save article'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </a>
  );
}

export default DiscoverCard;
