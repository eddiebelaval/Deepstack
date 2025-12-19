'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/stores/ui-store';
import { useUsageData } from '@/hooks/useUsageData';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {
  X,
  Coins,
  TrendingUp,
  History,
  Calendar,
  RefreshCw,
  Loader2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import {
  UsageProgressRing,
  UsageCategoryBar,
  UsageActivityList,
} from '@/components/usage';

/**
 * Slide-out panel for viewing credit usage details.
 * Shows balance, category breakdown, recent activity, and reset info.
 */
export function UsagePanel() {
  const { usageOpen, toggleUsage } = useUIStore();
  const {
    credits,
    tier,
    tierLimit,
    usagePercent,
    categories,
    totalUsed,
    recentActivity,
    resetDate,
    daysUntilReset,
    isLoading,
    refresh,
  } = useUsageData();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // Format reset date
  const formatResetDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get tier-specific styling
  const getTierStyles = () => {
    switch (tier) {
      case 'elite':
        return {
          badge: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30',
          glow: 'shadow-amber-500/20',
        };
      case 'pro':
        return {
          badge: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30',
          glow: 'shadow-blue-500/20',
        };
      default:
        return {
          badge: 'bg-muted text-muted-foreground',
          glow: '',
        };
    }
  };

  const tierStyles = getTierStyles();

  return (
    <AnimatePresence>
      {usageOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleUsage}
            className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm"
          />

          {/* Slide-out Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[420px] z-50 bg-background/80 backdrop-blur-md border-r border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Usage</h2>
                  <p className="text-xs text-muted-foreground">
                    Credit balance & activity
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                >
                  {isRefreshing || isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={toggleUsage}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Balance Card */}
                <div
                  className={`rounded-xl bg-gradient-to-br from-card to-card/50 border border-border p-6 ${tierStyles.glow}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        Current Balance
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${tierStyles.badge}`}
                    >
                      {tier}
                    </span>
                  </div>

                  {/* Progress Ring */}
                  <div className="flex justify-center py-4">
                    <UsageProgressRing
                      credits={credits}
                      tierLimit={tierLimit}
                      tier={tier}
                      size="lg"
                      showCredits
                    />
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">
                        {totalUsed}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Used this cycle
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">
                        {(100 - usagePercent).toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Remaining
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upgrade Prompt (for free tier) */}
                {tier === 'free' && (
                  <div className="rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-md bg-blue-500/20">
                        <ArrowUpRight className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Unlock more credits
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Upgrade to Pro for 1,000 credits/month
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        asChild
                      >
                        <Link href="/pricing">Upgrade</Link>
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Category Breakdown */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Usage Breakdown</h3>
                  </div>
                  <UsageCategoryBar
                    categories={categories}
                    totalUsed={totalUsed}
                    tierLimit={tierLimit}
                  />
                </div>

                <Separator />

                {/* Recent Activity */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Recent Activity</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Last 10 actions
                    </span>
                  </div>
                  <UsageActivityList
                    activities={recentActivity}
                    maxItems={10}
                  />
                </div>

                <Separator />

                {/* Reset Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Billing Cycle</h3>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next reset</span>
                      <span className="font-medium">
                        {formatResetDate(resetDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Days left</span>
                      <span className="font-medium tabular-nums">
                        {daysUntilReset} days
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Monthly allocation
                      </span>
                      <span className="font-medium tabular-nums">
                        {tierLimit.toLocaleString()} credits
                      </span>
                    </div>
                    {tier !== 'free' && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Rollover cap
                        </span>
                        <span className="font-medium tabular-nums">
                          {(tierLimit * 2).toLocaleString()} credits
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
