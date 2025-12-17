'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Brain, ExternalLink, Loader2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { useMarketSummary } from '@/lib/stores/perplexity-finance-store';
import { Button } from '@/components/ui/button';

/**
 * MarketSummaryWidget - AI-powered market intelligence widget
 *
 * Features:
 * - Fetches AI-synthesized market summary from Perplexity Finance
 * - Shows key market insights with citations
 * - Auto-refreshes every 15 minutes
 * - Indicates mock data when API not configured
 * - Height: ~200px
 *
 * Usage:
 * <MarketSummaryWidget />
 */

interface MarketSummaryWidgetProps {
  className?: string;
  topics?: string[];
}

// Auto-refresh interval: 15 minutes
const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000;

export function MarketSummaryWidget({
  className,
  topics,
}: MarketSummaryWidgetProps) {
  const {
    marketSummary,
    marketSummaryLoading,
    marketSummaryError,
    getMarketSummary,
  } = useMarketSummary();

  // Fetch on mount and set up auto-refresh
  useEffect(() => {
    if (!marketSummary) {
      getMarketSummary(topics);
    }

    const interval = setInterval(() => {
      getMarketSummary(topics);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [topics, getMarketSummary, marketSummary]);

  // Format time since generation
  const getTimeSince = (isoDate?: string) => {
    if (!isoDate) return '';
    try {
      const now = new Date();
      const generated = new Date(isoDate);
      const diffMs = now.getTime() - generated.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours}h ago`;
    } catch {
      return '';
    }
  };

  // Truncate content for widget view
  const truncateContent = (content: string, maxLength = 300) => {
    if (content.length <= maxLength) return content;
    const truncated = content.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.slice(0, lastSpace) + '...';
  };

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-3 flex flex-col gap-2',
        className
      )}
      style={{ minHeight: '200px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            AI Market Intelligence
          </span>
          {marketSummary?.mock && (
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
              Mock
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {marketSummary?.generatedAt && (
            <span className="text-[10px] text-muted-foreground">
              {getTimeSince(marketSummary.generatedAt)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => getMarketSummary(topics)}
            disabled={marketSummaryLoading}
          >
            {marketSummaryLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {marketSummaryLoading && !marketSummary ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Generating insights...</span>
            </div>
          </div>
        ) : marketSummaryError ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">{marketSummaryError}</span>
            </div>
          </div>
        ) : marketSummary ? (
          <div className="space-y-2">
            <div className="text-xs text-foreground leading-relaxed">
              {truncateContent(marketSummary.content)}
            </div>

            {/* Citations */}
            {marketSummary.citations && marketSummary.citations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {marketSummary.citations.slice(0, 3).map((citation, idx) => (
                  <a
                    key={idx}
                    href={citation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Source {idx + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs">No market data available</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          Powered by Perplexity AI
        </span>
      </div>
    </div>
  );
}

export default MarketSummaryWidget;
