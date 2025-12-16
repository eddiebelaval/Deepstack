'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNewsStore, NewsSourceFilter } from '@/lib/stores/news-store';
import { Sparkles, Newspaper, Cpu, TrendingUp, BarChart3 } from 'lucide-react';

/**
 * DiscoverHeader - Header with title and category tabs
 * Reuses tab pattern from NewsPanel
 */

const CATEGORY_TABS = [
  { value: 'all', label: 'For You', icon: Sparkles },
  { value: 'api', label: 'Top Stories', icon: Newspaper },
  { value: 'rss', label: 'Tech & Business', icon: Cpu },
  { value: 'social', label: 'Trending', icon: TrendingUp },
] as const;

export function DiscoverHeader() {
  const { sourceFilter, setSourceFilter } = useNewsStore();

  const handleCategoryChange = (category: string) => {
    setSourceFilter(category as NewsSourceFilter);
  };

  return (
    <header className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-6 py-4">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
              <p className="text-sm text-muted-foreground">
                Market news and insights
              </p>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = sourceFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleCategoryChange(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

export default DiscoverHeader;
