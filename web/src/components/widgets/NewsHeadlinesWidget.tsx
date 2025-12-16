'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Newspaper, ExternalLink, Loader2 } from 'lucide-react';

/**
 * NewsHeadlinesWidget - Latest news headlines widget
 *
 * Features:
 * - Fetches real news from /api/news (Alpaca News API)
 * - Shows 3-4 latest headlines with source
 * - Clickable links to full articles
 * - Height: ~140px
 *
 * Usage:
 * <NewsHeadlinesWidget />
 */

export interface Headline {
  id: string;
  title: string;
  source: string;
  url: string;
  timeAgo: string;
}

interface NewsHeadlinesWidgetProps {
  className?: string;
}

// Calculate relative time
function getTimeAgo(isoDate: string): string {
  try {
    const now = new Date();
    const time = new Date(isoDate);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  } catch {
    return '';
  }
}

export function NewsHeadlinesWidget({
  className
}: NewsHeadlinesWidgetProps) {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch('/api/news?limit=4');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();

        const mapped: Headline[] = (data.articles || []).slice(0, 4).map((a: any, idx: number) => ({
          id: a.id || `news-${idx}`,
          title: a.headline || a.title || 'News',
          source: a.source || 'News',
          url: a.url || '#',
          timeAgo: getTimeAgo(a.publishedAt || a.created_at),
        }));

        setHeadlines(mapped);
      } catch (err) {
        console.error('News fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNews();
  }, []);

  // Show top 3-4 headlines
  const topHeadlines = headlines.slice(0, 4);

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-3 flex flex-col gap-2',
        className
      )}
      style={{ minHeight: '140px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Latest News
        </span>
      </div>

      {/* Headlines List */}
      <div className="space-y-2">
        {topHeadlines.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">
            No headlines available
          </div>
        ) : (
          topHeadlines.map((headline) => (
            <a
              key={headline.id}
              href={headline.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="flex items-start gap-2 py-1 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {headline.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {headline.source}
                    </span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground">
                      {headline.timeAgo}
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

export default NewsHeadlinesWidget;
