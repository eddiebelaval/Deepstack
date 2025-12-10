'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Newspaper, ExternalLink } from 'lucide-react';

/**
 * NewsHeadlinesWidget - Latest news headlines widget
 *
 * Features:
 * - Shows 3-4 latest headlines with source
 * - Truncated text with ellipsis
 * - Clickable links to full articles
 * - Height: ~140px
 *
 * Usage:
 * <NewsHeadlinesWidget headlines={headlines} />
 */

export interface Headline {
  id: string;
  title: string;
  source: string;
  url: string;
  timeAgo: string;
}

interface NewsHeadlinesWidgetProps {
  headlines?: Headline[];
  className?: string;
}

// Mock headlines for demo - replace with real news data
const MOCK_HEADLINES: Headline[] = [
  {
    id: '1',
    title: 'Fed signals potential rate cuts in Q2 amid cooling inflation',
    source: 'Bloomberg',
    url: '#',
    timeAgo: '15m',
  },
  {
    id: '2',
    title: 'Tech stocks rally as AI spending accelerates across sectors',
    source: 'Reuters',
    url: '#',
    timeAgo: '1h',
  },
  {
    id: '3',
    title: 'Oil prices surge on Middle East supply concerns',
    source: 'CNBC',
    url: '#',
    timeAgo: '2h',
  },
  {
    id: '4',
    title: 'Earnings season preview: Banks expected to beat estimates',
    source: 'WSJ',
    url: '#',
    timeAgo: '3h',
  },
];

export function NewsHeadlinesWidget({
  headlines = MOCK_HEADLINES,
  className
}: NewsHeadlinesWidgetProps) {
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
