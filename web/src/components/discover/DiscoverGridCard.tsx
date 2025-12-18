'use client';

import { useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { cn } from '@/lib/utils';
import type { NewsArticle } from '@/lib/stores/news-store';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { DiscoverTextCard } from './DiscoverTextCard';

/**
 * DiscoverGridCard - Square card for 3-column grid layout
 *
 * Design:
 * - Image (aspect-[4/3])
 * - Title below image
 * - Source + time meta
 * - Falls back to text-only card when no image available
 */

interface DiscoverGridCardProps {
  article: NewsArticle;
  onSymbolClick?: (symbol: string) => void;
  className?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  bloomberg: 'bg-orange-500',
  reuters: 'bg-orange-600',
  wsj: 'bg-slate-700',
  cnbc: 'bg-blue-600',
  yahoo: 'bg-purple-500',
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

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

export function DiscoverGridCard({
  article,
  onSymbolClick,
  className,
}: DiscoverGridCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasImage = article.imageUrl && !imageError;
  const sentiment = article.sentiment || 'neutral';
  const sourceColor = getSourceColor(article.source);

  // Use text-only card when no image is available
  if (!article.imageUrl) {
    return (
      <DiscoverTextCard
        article={article}
        onSymbolClick={onSymbolClick}
        variant="grid"
        className={className}
      />
    );
  }

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block rounded-xl overflow-hidden',
        'bg-card border border-border/50',
        'hover:shadow-lg hover:border-border transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <OptimizedImage
          src={article.imageUrl || ''}
          alt={article.headline}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="group-hover:scale-105 transition-transform duration-500"
          fallbackChar={article.source.charAt(0).toUpperCase()}
          onError={() => setImageError(true)}
        />

        {/* Sentiment indicator (small, top right) */}
        {sentiment !== 'neutral' && (
          <div
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-full',
              sentiment === 'positive' || sentiment === 'bullish'
                ? 'bg-green-500/90'
                : 'bg-red-500/90'
            )}
          >
            {sentiment === 'positive' || sentiment === 'bullish' ? (
              <TrendingUp className="h-3 w-3 text-white" />
            ) : (
              <TrendingDown className="h-3 w-3 text-white" />
            )}
          </div>
        )}

        {/* Symbol tag (bottom left, first one only) */}
        {article.symbols && article.symbols.length > 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSymbolClick?.(article.symbols![0]);
            }}
            className={cn(
              'absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-semibold',
              'bg-black/70 text-white backdrop-blur-sm',
              'hover:bg-black/90 transition-colors'
            )}
          >
            ${article.symbols[0]}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {article.headline}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Source icon + name */}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold',
                sourceColor
              )}
            >
              {article.source.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium truncate max-w-[80px]">
              {article.source}
            </span>
          </div>

          <span className="text-muted-foreground/50">·</span>

          {/* Time */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(article.publishedAt)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

export default DiscoverGridCard;
