'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Mock journal entry types
type EntrySentiment = 'bullish' | 'bearish' | 'neutral';

type JournalEntry = {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  sentiment: EntrySentiment;
};

// Mock data
const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    date: '2024-12-09',
    title: 'NVDA earnings play',
    excerpt: 'Entered calls on pullback. Strong AI demand thesis...',
    sentiment: 'bullish',
  },
  {
    id: '2',
    date: '2024-12-08',
    title: 'Stopped out on SPY',
    excerpt: 'Market turned against tech. Cut losses at -2%...',
    sentiment: 'bearish',
  },
  {
    id: '3',
    date: '2024-12-07',
    title: 'Portfolio rebalance',
    excerpt: 'Shifted 15% to cash. Waiting for clearer signal...',
    sentiment: 'neutral',
  },
];

const getSentimentIcon = (sentiment: EntrySentiment) => {
  switch (sentiment) {
    case 'bullish':
      return <TrendingUp className="h-3 w-3 text-profit" />;
    case 'bearish':
      return <TrendingDown className="h-3 w-3 text-loss" />;
    case 'neutral':
      return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
};

const getSentimentColor = (sentiment: EntrySentiment) => {
  switch (sentiment) {
    case 'bullish':
      return 'text-profit';
    case 'bearish':
      return 'text-loss';
    case 'neutral':
      return 'text-muted-foreground';
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function JournalRecentWidget() {
  const recentEntries = MOCK_ENTRIES.slice(0, 3);

  return (
    <div className="space-y-2">
      {recentEntries.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No journal entries</p>
        </div>
      ) : (
        recentEntries.map((entry) => (
          <div
            key={entry.id}
            className="p-2.5 rounded-lg glass-surface hover:bg-muted/30 transition-colors cursor-pointer"
          >
            {/* Header: Date and Sentiment */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">
                {formatDate(entry.date)}
              </span>
              <div className="flex items-center gap-1">
                {getSentimentIcon(entry.sentiment)}
                <span className={cn('text-xs capitalize', getSentimentColor(entry.sentiment))}>
                  {entry.sentiment}
                </span>
              </div>
            </div>

            {/* Title */}
            <h4 className="text-sm font-semibold mb-1 line-clamp-1">{entry.title}</h4>

            {/* Excerpt */}
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {entry.excerpt}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

// Named export for flexibility
export default JournalRecentWidget;
