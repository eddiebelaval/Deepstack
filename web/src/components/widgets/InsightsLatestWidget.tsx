'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, AlertTriangle, Info, Lightbulb } from 'lucide-react';

// Mock insight types
type InsightCategory = 'opportunity' | 'risk' | 'analysis' | 'idea';

type AIInsight = {
  id: string;
  text: string;
  category: InsightCategory;
  timestamp: string;
  confidence?: number; // 0-100
};

// Mock data
const MOCK_INSIGHTS: AIInsight[] = [
  {
    id: '1',
    text: 'NVDA forming bullish flag pattern on 4H chart. Historical win rate: 68%',
    category: 'opportunity',
    timestamp: '2024-12-09T10:30:00Z',
    confidence: 82,
  },
  {
    id: '2',
    text: 'High correlation detected between portfolio and tech sector (0.87). Consider diversification.',
    category: 'risk',
    timestamp: '2024-12-09T09:15:00Z',
    confidence: 91,
  },
  {
    id: '3',
    text: 'Your win rate on energy plays is 72% over last 30 days. Edge detected in this sector.',
    category: 'analysis',
    timestamp: '2024-12-09T08:45:00Z',
    confidence: 88,
  },
];

const getCategoryIcon = (category: InsightCategory) => {
  switch (category) {
    case 'opportunity':
      return <TrendingUp className="h-3 w-3 text-profit" />;
    case 'risk':
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    case 'analysis':
      return <Info className="h-3 w-3 text-blue-500" />;
    case 'idea':
      return <Lightbulb className="h-3 w-3 text-purple-500" />;
  }
};

const getCategoryColor = (category: InsightCategory) => {
  switch (category) {
    case 'opportunity':
      return 'text-profit';
    case 'risk':
      return 'text-yellow-500';
    case 'analysis':
      return 'text-blue-500';
    case 'idea':
      return 'text-purple-500';
  }
};

const getTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export function InsightsLatestWidget() {
  const latestInsights = MOCK_INSIGHTS.slice(0, 3);

  return (
    <div className="space-y-2">
      {latestInsights.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No insights yet</p>
        </div>
      ) : (
        latestInsights.map((insight) => (
          <div
            key={insight.id}
            className="p-2.5 rounded-lg glass-surface hover:bg-muted/30 transition-colors cursor-pointer"
          >
            {/* Header: Category and Time */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {getCategoryIcon(insight.category)}
                <span className={cn('text-xs font-medium capitalize', getCategoryColor(insight.category))}>
                  {insight.category}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {getTimeAgo(insight.timestamp)}
              </span>
            </div>

            {/* Insight Text */}
            <p className="text-sm leading-relaxed line-clamp-3 mb-1.5">
              {insight.text}
            </p>

            {/* Confidence (if available) */}
            {insight.confidence !== undefined && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      insight.confidence >= 80 ? 'bg-profit' :
                      insight.confidence >= 60 ? 'bg-yellow-500' :
                      'bg-muted-foreground'
                    )}
                    style={{ width: `${insight.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {insight.confidence}%
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Named export for flexibility
export default InsightsLatestWidget;
