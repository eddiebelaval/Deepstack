'use client';

import { ReactNode } from 'react';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { canAccess, getRequiredTier, type SubscriptionTier, TIER_FEATURES } from '@/lib/subscription';

// Feature type from the subscription config
type Feature = keyof typeof TIER_FEATURES.elite;

interface FeatureGateProps {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
  showPreview?: boolean;
  previewContent?: ReactNode;
  className?: string;
}

/**
 * Wrapper component that gates features based on subscription tier.
 * Shows upgrade prompt if user doesn't have access.
 * Uses the central subscription config from lib/subscription.ts
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showPreview = false,
  previewContent,
  className = '',
}: FeatureGateProps) {
  const { tier, isLoading: loading } = useUser();
  const requiredTier = getRequiredTier(feature);

  // While loading, show children (optimistic)
  if (loading) {
    return <>{children}</>;
  }

  // If user has access, show children
  if (canAccess(tier, feature)) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show locked state with optional preview
  return (
    <div className={`relative ${className}`}>
      {showPreview && previewContent && (
        <div className="relative">
          {/* Blurred preview */}
          <div className="blur-sm pointer-events-none select-none opacity-60">
            {previewContent}
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
      )}

      {/* Locked banner */}
      <FeatureLockedBanner feature={feature} requiredTier={requiredTier} />
    </div>
  );
}

interface FeatureLockedBannerProps {
  feature: string;
  requiredTier: SubscriptionTier;
  className?: string;
}

export function FeatureLockedBanner({
  feature,
  requiredTier,
  className = '',
}: FeatureLockedBannerProps) {
  const tierLabel = requiredTier === 'elite' ? 'Elite' : 'Pro';
  const price = requiredTier === 'elite' ? '$49' : '$12';

  // Format feature name for display
  const featureLabel = feature
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-600/10 border border-amber-500/20 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-400 mb-1">
            {featureLabel} ({tierLabel})
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Unlock this feature and more with {tierLabel} for {price}/mo
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-3 h-3" />
            Upgrade to {tierLabel}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Hook for checking feature access programmatically
export function useFeatureAccess(feature: Feature): {
  hasAccess: boolean;
  requiredTier: SubscriptionTier;
  userTier: SubscriptionTier;
  loading: boolean;
} {
  const { tier, isLoading: loading } = useUser();
  const requiredTier = getRequiredTier(feature);

  return {
    hasAccess: canAccess(tier, feature),
    requiredTier,
    userTier: tier,
    loading,
  };
}
