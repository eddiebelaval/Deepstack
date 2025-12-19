'use client';

import { ReactNode, useEffect } from 'react';
import { Lock, Sparkles, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { useTrialStore } from '@/lib/stores/trial-store';
import { canAccess, getRequiredTier, type SubscriptionTier, TIER_FEATURES } from '@/lib/subscription';
import { GhostFeature } from '@/components/trial/GhostFeature';

// Feature type from the subscription config
type Feature = keyof typeof TIER_FEATURES.elite;

interface FeatureGateProps {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
  showPreview?: boolean;
  previewContent?: ReactNode;
  className?: string;
  /** Show ghost feature with activity indicators (for trial FOMO) */
  showGhost?: boolean;
  /** Activity text for ghost feature */
  ghostActivityText?: string;
  /** Feature description for ghost feature */
  ghostDescription?: string;
}

/**
 * Wrapper component that gates features based on subscription tier.
 * Shows upgrade prompt if user doesn't have access.
 * Uses the central subscription config from lib/subscription.ts
 *
 * Trial-aware: Uses effective tier during trial period and can show
 * ghost features with activity indicators for FOMO effect.
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showPreview = false,
  previewContent,
  className = '',
  showGhost = false,
  ghostActivityText,
  ghostDescription,
}: FeatureGateProps) {
  const { tier, isLoading: loading, trial } = useUser();
  const { recordFeatureExplored } = useTrialStore();
  const requiredTier = getRequiredTier(feature);

  // Track feature exploration during trial
  useEffect(() => {
    if (trial.isTrialing && canAccess(tier, feature)) {
      recordFeatureExplored(feature);
    }
  }, [trial.isTrialing, tier, feature, recordFeatureExplored]);

  // While loading, show children (optimistic)
  if (loading) {
    return <>{children}</>;
  }

  // If user has access (including during trial), show children
  if (canAccess(tier, feature)) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show ghost feature with activity indicators (for post-trial FOMO)
  if (showGhost && previewContent) {
    const featureLabel = feature
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    return (
      <GhostFeature
        featureName={featureLabel}
        featureKey={feature}
        description={ghostDescription || `Unlock ${featureLabel} with ${requiredTier === 'elite' ? 'Elite' : 'Pro'}`}
        previewContent={previewContent}
        requiredTier={requiredTier}
        className={className}
        showActivity={true}
        activityText={ghostActivityText || 'Monitoring...'}
      />
    );
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

      {/* Locked banner with trial awareness */}
      <FeatureLockedBanner
        feature={feature}
        requiredTier={requiredTier}
        showTrialMessage={trial.recentlyEndedTrial}
      />
    </div>
  );
}

interface FeatureLockedBannerProps {
  feature: string;
  requiredTier: SubscriptionTier;
  className?: string;
  /** Show message for users whose trial recently ended */
  showTrialMessage?: boolean;
}

export function FeatureLockedBanner({
  feature,
  requiredTier,
  className = '',
  showTrialMessage = false,
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
          {showTrialMessage ? (
            <Clock className="w-5 h-5 text-amber-400" />
          ) : (
            <Lock className="w-5 h-5 text-amber-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-400 mb-1">
            {featureLabel} ({tierLabel})
          </p>

          {showTrialMessage ? (
            <p className="text-xs text-muted-foreground mb-3">
              You had access to this during your trial. Upgrade to restore {featureLabel}.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">
              Unlock this feature and more with {tierLabel} for {price}/mo
            </p>
          )}

          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-3 h-3" />
            {showTrialMessage ? 'Restore Access' : `Upgrade to ${tierLabel}`}
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
  /** Whether access is via trial (not paid subscription) */
  isTrialAccess: boolean;
  /** Whether user recently lost trial access to this feature */
  lostTrialAccess: boolean;
} {
  const { tier, isLoading: loading, trial } = useUser();
  const requiredTier = getRequiredTier(feature);
  const hasAccess = canAccess(tier, feature);

  // Check if access is specifically from trial (not paid)
  const isTrialAccess = trial.isTrialing && hasAccess;

  // Check if user had this feature during trial but no longer has it
  const lostTrialAccess =
    trial.recentlyEndedTrial && !hasAccess && canAccess(trial.trialTier, feature);

  return {
    hasAccess,
    requiredTier,
    userTier: tier,
    loading,
    isTrialAccess,
    lostTrialAccess,
  };
}
