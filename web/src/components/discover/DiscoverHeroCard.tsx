'use client';

import { useState } from 'react';
// Using regular img for external news images - more reliable than next/image for third-party URLs
import { cn } from '@/lib/utils';
import type { NewsArticle, NewsSentiment } from '@/lib/stores/news-store';
import {
  Clock,
  Heart,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from 'lucide-react';

/**
 * DiscoverHeroCard - Large featured article card
 *
 * Design:
 * - Full-width with large hero image (aspect-[21/9])
 * - Headline overlay at bottom with gradient
 * - Source icon + time + sentiment badge
 */

interface DiscoverHeroCardProps {
  article: NewsArticle;
  onSymbolClick?: (symbol: string) => void;
  className?: string;
}

// Source brand colors
const SOURCE_COLORS: Record<string, string> = {
  bloomberg: 'bg-orange-500',
  reuters: 'bg-orange-600',
  wsj: 'bg-slate-700',
  cnbc: 'bg-blue-600',
  yahoo: 'bg-purple-500',
  benzinga: 'bg-blue-500',
  seekingalpha: 'bg-orange-500',
  marketwatch: 'bg-green-600',
  finnhub: 'bg-indigo-500',
  alpaca: 'bg-yellow-500',
  default: 'bg-slate-500',
};

function getSourceColor(source: string): string {
  const normalized = source.toLowerCase().replace(/[\s-_]/g, '');
  for (const [key, value] of Object.entries(SOURCE_COLORS)) {
    if (normalized.includes(key)) return value;
  }
  return SOURCE_COLORS.default;
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

export function DiscoverHeroCard({
  article,
  onSymbolClick,
  className,
}: DiscoverHeroCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasImage = article.imageUrl && !imageError;
  const sentiment = article.sentiment || 'neutral';
  const sourceColor = getSourceColor(article.source);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block relative rounded-2xl overflow-hidden',
        'bg-card border border-border/50',
        'hover:shadow-xl hover:border-border transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        className
      )}
    >
      {/* Hero Image */}
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
        {hasImage ? (
          <img
            src={article.imageUrl!}
            alt={article.headline}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            onError={() => setImageError(true)}
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-6xl font-bold text-primary/10">
              {article.source.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Sentiment badge (top right) */}
        {sentiment !== 'neutral' && (
          <div
            className={cn(
              'absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold',
              'flex items-center gap-1.5 backdrop-blur-sm',
              sentiment === 'positive' || sentiment === 'bullish'
                ? 'bg-green-500/90 text-white'
                : 'bg-red-500/90 text-white'
            )}
          >
            {sentiment === 'positive' || sentiment === 'bullish' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span className="capitalize">{sentiment}</span>
          </div>
        )}

        {/* Content overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {/* Symbol tags */}
          {article.symbols && article.symbols.length > 0 && (
            <div className="flex gap-2 mb-3">
              {article.symbols.slice(0, 3).map((symbol) => (
                <button
                  key={symbol}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSymbolClick?.(symbol);
                  }}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-semibold',
                    'bg-white/20 text-white backdrop-blur-sm',
                    'hover:bg-white/30 transition-colors'
                  )}
                >
                  ${symbol}
                </button>
              ))}
            </div>
          )}

          {/* Headline */}
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2 mb-3 group-hover:underline decoration-2 underline-offset-4">
            {article.headline}
          </h2>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-white/80">
            {/* Source */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold',
                  sourceColor
                )}
              >
                {article.source.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{article.source}</span>
            </div>

            <span className="text-white/50">·</span>

            {/* Time */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatTimeAgo(article.publishedAt)}</span>
            </div>

            <span className="text-white/50">·</span>

            {/* External link indicator */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="h-4 w-4" />
              <span>Read article</span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}

export default DiscoverHeroCard;
