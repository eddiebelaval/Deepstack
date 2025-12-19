'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/stores/ui-store';
import { useUser } from '@/hooks/useUser';
import { useChatLimit } from '@/hooks/useChatLimit';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  X,
  MessageSquare,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Infinity as InfinityIcon,
  Crown,
  Zap,
  Check,
} from 'lucide-react';
import { TIER_FEATURES, TIER_PRICES } from '@/lib/subscription';

/**
 * Slide-out panel for viewing usage details.
 * Shows daily AI chat usage, tier info, and subscription status.
 */
export function UsagePanel() {
  const { usageOpen, toggleUsage } = useUIStore();
  const { tier, trial } = useUser();
  const { chatsToday, dailyLimit, remaining, isLoading } = useChatLimit();

  // Get tier-specific styling
  const getTierStyles = () => {
    switch (tier) {
      case 'elite':
        return {
          badge: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30',
          glow: 'shadow-amber-500/20',
          icon: <Crown className="h-4 w-4" />,
        };
      case 'pro':
        return {
          badge: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30',
          glow: 'shadow-blue-500/20',
          icon: <Zap className="h-4 w-4" />,
        };
      default:
        return {
          badge: 'bg-muted text-muted-foreground',
          glow: '',
          icon: <Sparkles className="h-4 w-4" />,
        };
    }
  };

  const tierStyles = getTierStyles();
  const features = TIER_FEATURES[tier];
  const isUnlimited = dailyLimit === Infinity;
  const usagePercent = isUnlimited ? 0 : Math.min(100, (chatsToday / dailyLimit) * 100);

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
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Usage</h2>
                  <p className="text-xs text-muted-foreground">
                    Your daily AI chat usage
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleUsage}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Daily Chat Usage Card */}
                <div
                  className={`rounded-xl bg-gradient-to-br from-card to-card/50 border border-border p-6 ${tierStyles.glow}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        AI Chats Today
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${tierStyles.badge}`}
                    >
                      {tierStyles.icon}
                      {tier}
                      {trial.isTrialing && (
                        <span className="text-[10px] opacity-75">(trial)</span>
                      )}
                    </span>
                  </div>

                  {/* Usage Display */}
                  <div className="text-center py-6">
                    {isUnlimited ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-4xl font-bold text-primary">
                          <InfinityIcon className="h-10 w-10" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Unlimited AI chats
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-bold tabular-nums">
                            {chatsToday}
                          </span>
                          <span className="text-2xl text-muted-foreground">
                            / {dailyLimit}
                          </span>
                        </div>
                        <Progress value={usagePercent} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          {remaining > 0
                            ? `${remaining} chat${remaining !== 1 ? 's' : ''} remaining today`
                            : 'Daily limit reached'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Reset Info */}
                  {!isUnlimited && (
                    <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Resets daily at midnight</span>
                    </div>
                  )}
                </div>

                {/* Upgrade Prompt (for free tier) */}
                {tier === 'free' && !trial.isTrialing && (
                  <div className="rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-md bg-blue-500/20">
                        <ArrowUpRight className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Unlock unlimited AI chats
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Upgrade to Pro for {TIER_PRICES.pro.display}
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

                {/* Plan Features */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Your Plan Features</h3>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                    <FeatureRow
                      label="AI Chats"
                      value={isUnlimited ? 'Unlimited' : `${dailyLimit}/day`}
                      enabled
                    />
                    <FeatureRow
                      label="AI Model"
                      value={features.aiModel === 'all' ? 'All models' : features.aiModel === 'sonnet' ? 'Sonnet' : 'Haiku'}
                      enabled
                    />
                    <FeatureRow
                      label="Journal Entries"
                      value={features.journalEntries === Infinity ? 'Unlimited' : `${features.journalEntries}`}
                      enabled
                    />
                    <FeatureRow
                      label="Watchlists"
                      value={features.watchlists === Infinity ? 'Unlimited' : `${features.watchlists}`}
                      enabled
                    />
                    <FeatureRow
                      label="Thesis Tracking"
                      value={features.thesisTracking ? 'Enabled' : 'Pro+'}
                      enabled={features.thesisTracking}
                    />
                    <FeatureRow
                      label="Options Analysis"
                      value={features.optionsAnalysis ? 'Enabled' : 'Pro+'}
                      enabled={features.optionsAnalysis}
                    />
                    <FeatureRow
                      label="Emotional Firewall"
                      value={features.emotionalFirewall ? 'Enabled' : 'Elite'}
                      enabled={features.emotionalFirewall}
                    />
                    <FeatureRow
                      label="Deep Research"
                      value={features.deepResearch > 0 ? `${features.deepResearch}/month` : 'Pro+'}
                      enabled={features.deepResearch > 0}
                    />
                  </div>
                </div>

                {/* Trial Info */}
                {trial.isTrialing && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Trial Status</h3>
                      </div>
                      <div className="rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Trial tier</span>
                          <span className="font-medium uppercase">{trial.trialTier}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Days remaining</span>
                          <span className="font-medium tabular-nums">
                            {trial.daysRemaining} days
                          </span>
                        </div>
                        <Progress
                          value={((14 - trial.daysRemaining) / 14) * 100}
                          className="h-2"
                        />
                        <Button
                          size="sm"
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                          asChild
                        >
                          <Link href="/pricing">Upgrade to Keep Features</Link>
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FeatureRow({
  label,
  value,
  enabled,
}: {
  label: string;
  value: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium flex items-center gap-1.5 ${enabled ? '' : 'text-muted-foreground/60'}`}>
        {enabled && <Check className="h-3.5 w-3.5 text-green-500" />}
        {value}
      </span>
    </div>
  );
}
