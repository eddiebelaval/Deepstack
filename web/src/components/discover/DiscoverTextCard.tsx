'use client';

import { cn } from '@/lib/utils';
import type { NewsArticle } from '@/lib/stores/news-store';
import { Clock, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * DiscoverTextCard - Text-only card for articles without images
 *
 * Design:
 * - Clean text-focused layout
 * - Larger headline with optional summary
 * - Source branding with color accent
 * - Matches height of grid cards for consistent layout
 */

interface DiscoverTextCardProps {
  article: NewsArticle;
  onSymbolClick?: (symbol: string) => void;
  className?: string;
  variant?: 'grid' | 'horizontal' | 'compact';
}

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  benzinga: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  bloomberg: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  reuters: { bg: 'bg-orange-600/10', text: 'text-orange-600' },
  wsj: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
  cnbc: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  yahoo: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  thestreet: { bg: 'bg-green-500/10', text: 'text-green-500' },
  fortune: { bg: 'bg-red-500/10', text: 'text-red-500' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

function getSourceColors(source: string): { bg: string; text: string } {
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

export function DiscoverTextCard({
  article,
  onSymbolClick,
  className,
  variant = 'grid',
}: DiscoverTextCardProps) {
  const sourceColors = getSourceColors(article.source);

  // Compact variant for horizontal sections
  if (variant === 'compact') {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex items-start gap-3 p-3 rounded-lg',
          'bg-card/50 border border-border/30',
          'hover:bg-card hover:border-border/50 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          className
        )}
      >
        {/* Source badge */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            'text-sm font-bold',
            sourceColors.bg,
            sourceColors.text
          )}
        >
          {article.source.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {article.headline}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="font-medium">{article.source}</span>
            <span>·</span>
            <span>{formatTimeAgo(article.publishedAt)}</span>
          </div>
        </div>

        {/* Symbol tags */}
        {article.symbols && article.symbols.length > 0 && (
          <div className="flex-shrink-0">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSymbolClick?.(article.symbols![0]);
              }}
            >
              {article.symbols[0]}
            </Badge>
          </div>
        )}
      </a>
    );
  }

  // Grid variant - matches DiscoverGridCard dimensions
  if (variant === 'grid') {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex flex-col rounded-xl overflow-hidden',
          'bg-card border border-border/50',
          'hover:shadow-lg hover:border-border transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          // Match the aspect ratio of image cards
          'min-h-[280px]',
          className
        )}
      >
        {/* Colored header band with source branding */}
        <div
          className={cn(
            'px-4 py-3 border-b border-border/30',
            sourceColors.bg
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn('text-lg font-bold', sourceColors.text)}>
                {article.source.charAt(0).toUpperCase()}
              </span>
              <span className={cn('text-sm font-medium', sourceColors.text)}>
                {article.source}
              </span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Symbol tags at top */}
          {article.symbols && article.symbols.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {article.symbols.slice(0, 3).map((symbol) => (
                <button
                  key={symbol}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSymbolClick?.(symbol);
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-semibold',
                    'bg-primary/10 text-primary',
                    'hover:bg-primary/20 transition-colors'
                  )}
                >
                  ${symbol}
                </button>
              ))}
            </div>
          )}

          {/* Headline */}
          <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-3 group-hover:text-primary transition-colors flex-1">
            {article.headline}
          </h3>

          {/* Summary if available */}
          {article.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
              {article.summary}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/30 mt-auto">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(article.publishedAt)}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>Read article</span>
          </div>
        </div>
      </a>
    );
  }

  // Horizontal variant - for horizontal card sections
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
      {/* Left accent bar with source color */}
      <div
        className={cn(
          'w-1.5 flex-shrink-0',
          sourceColors.bg.replace('/10', '')
        )}
      />

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div className="space-y-2">
          {/* Source + symbols row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                  sourceColors.bg,
                  sourceColors.text
                )}
              >
                {article.source.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {article.source}
              </span>
            </div>

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

          {/* Headline */}
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
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTimeAgo(article.publishedAt)}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>Read article</span>
        </div>
      </div>
    </a>
  );
}

export default DiscoverTextCard;
