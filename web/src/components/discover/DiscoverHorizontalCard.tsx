'use client';

import { useState } from 'react';
// Using regular img for external news images - more reliable than next/image for third-party URLs
import { cn } from '@/lib/utils';
import type { NewsArticle } from '@/lib/stores/news-store';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * DiscoverHorizontalCard - Wide card with image on left
 *
 * Design:
 * - Image on left (fixed width)
 * - Content on right with headline + summary
 * - Good for longer form content
 */

interface DiscoverHorizontalCardProps {
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

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export function DiscoverHorizontalCard({
  article,
  onSymbolClick,
  className,
}: DiscoverHorizontalCardProps) {
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
        'group flex rounded-xl overflow-hidden',
        'bg-card border border-border/50',
        'hover:shadow-lg hover:border-border transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        className
      )}
    >
      {/* Image (left side) */}
      <div className="relative w-48 flex-shrink-0 overflow-hidden bg-muted">
        {hasImage ? (
          <img
            src={article.imageUrl!}
            alt={article.headline}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground/20">
              {article.source.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Sentiment indicator */}
        {sentiment !== 'neutral' && (
          <div
            className={cn(
              'absolute top-2 left-2 p-1.5 rounded-full',
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
      </div>

      {/* Content (right side) */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div className="space-y-2">
          {/* Title */}
          <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {article.headline}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {article.summary}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {/* Source */}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold',
                  sourceColor
                )}
              >
                {article.source.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{article.source}</span>
            </div>

            <span className="text-muted-foreground/50">·</span>

            {/* Time */}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTimeAgo(article.publishedAt)}</span>
            </div>
          </div>

          {/* Symbol tags */}
          {article.symbols && article.symbols.length > 0 && (
            <div className="flex gap-1">
              {article.symbols.slice(0, 2).map((symbol) => (
                <Badge
                  key={symbol}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary/10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSymbolClick?.(symbol);
                  }}
                >
                  {symbol}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export default DiscoverHorizontalCard;
