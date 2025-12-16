'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { RecentActivity, UsageCategory } from '@/lib/stores/credit-store';
import {
  MessageSquare,
  LineChart,
  BarChart3,
  TrendingUp,
  CircleDot,
} from 'lucide-react';

// Icon mapping for categories
const CATEGORY_ICONS: Record<UsageCategory, React.ElementType> = {
  ai_chat: MessageSquare,
  data_api: LineChart,
  analysis: TrendingUp,
  options: BarChart3,
  other: CircleDot,
};

// Color mapping for categories
const CATEGORY_COLORS: Record<UsageCategory, string> = {
  ai_chat: 'text-blue-400 bg-blue-400/10',
  data_api: 'text-emerald-400 bg-emerald-400/10',
  analysis: 'text-purple-400 bg-purple-400/10',
  options: 'text-amber-400 bg-amber-400/10',
  other: 'text-slate-400 bg-slate-400/10',
};

interface UsageActivityItemProps {
  activity: RecentActivity;
  className?: string;
}

/**
 * Single activity item showing a credit usage event.
 */
export function UsageActivityItem({
  activity,
  className,
}: UsageActivityItemProps) {
  const Icon = CATEGORY_ICONS[activity.category];
  const colorClass = CATEGORY_COLORS[activity.category];

  // Format the timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Format action name for display
  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors',
        className
      )}
    >
      {/* Icon */}
      <div className={cn('p-1.5 rounded-md', colorClass)}>
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {formatAction(activity.action)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTime(activity.timestamp)}
        </p>
      </div>

      {/* Credits */}
      <div className="text-right">
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          -{activity.credits}
        </span>
      </div>
    </div>
  );
}

interface UsageActivityListProps {
  activities: RecentActivity[];
  maxItems?: number;
  className?: string;
}

/**
 * List of recent activity items.
 */
export function UsageActivityList({
  activities,
  maxItems = 10,
  className,
}: UsageActivityListProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {displayActivities.map((activity) => (
        <UsageActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
