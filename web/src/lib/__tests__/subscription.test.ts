import { describe, it, expect } from 'vitest';
import {
  type SubscriptionTier,
  TIER_FEATURES,
  TIER_PRICES,
  canAccess,
  getRequiredTier,
  getTierDisplayName,
} from '../subscription';

describe('subscription utilities', () => {
  describe('TIER_FEATURES constant', () => {
    it('defines all tiers', () => {
      expect(TIER_FEATURES).toHaveProperty('free');
      expect(TIER_FEATURES).toHaveProperty('pro');
      expect(TIER_FEATURES).toHaveProperty('elite');
    });

    it('free tier has correct features', () => {
      expect(TIER_FEATURES.free).toEqual({
        aiChatsPerDay: 5,
        journalEntries: 10,
        emotionalFirewall: false,
        psychologyAnalytics: false,
        automation: false,
        thesisTracking: false,
        optionsAnalysis: false,
        unlimitedJournal: false,
      });
    });

    it('pro tier has correct features', () => {
      expect(TIER_FEATURES.pro).toEqual({
        aiChatsPerDay: Infinity,
        journalEntries: Infinity,
        emotionalFirewall: false,
        psychologyAnalytics: false,
        automation: false,
        thesisTracking: true,
        optionsAnalysis: true,
        unlimitedJournal: true,
      });
    });

    it('elite tier has all features enabled', () => {
      expect(TIER_FEATURES.elite).toEqual({
        aiChatsPerDay: Infinity,
        journalEntries: Infinity,
        emotionalFirewall: true,
        psychologyAnalytics: true,
        automation: true,
        thesisTracking: true,
        optionsAnalysis: true,
        unlimitedJournal: true,
      });
    });

    it('all tiers have same feature keys', () => {
      const freeKeys = Object.keys(TIER_FEATURES.free).sort();
      const proKeys = Object.keys(TIER_FEATURES.pro).sort();
      const eliteKeys = Object.keys(TIER_FEATURES.elite).sort();

      expect(freeKeys).toEqual(proKeys);
      expect(proKeys).toEqual(eliteKeys);
    });
  });

  describe('TIER_PRICES constant', () => {
    it('defines all tier prices', () => {
      expect(TIER_PRICES).toHaveProperty('free');
      expect(TIER_PRICES).toHaveProperty('pro');
      expect(TIER_PRICES).toHaveProperty('elite');
    });

    it('free tier is free', () => {
      expect(TIER_PRICES.free).toEqual({
        monthly: 0,
        display: 'Free',
      });
    });

    it('pro tier has correct pricing', () => {
      expect(TIER_PRICES.pro).toEqual({
        monthly: 19,
        display: '$19/mo',
      });
    });

    it('elite tier has correct pricing', () => {
      expect(TIER_PRICES.elite).toEqual({
        monthly: 49,
        display: '$49/mo',
      });
    });

    it('prices are in ascending order', () => {
      expect(TIER_PRICES.free.monthly).toBeLessThan(TIER_PRICES.pro.monthly);
      expect(TIER_PRICES.pro.monthly).toBeLessThan(TIER_PRICES.elite.monthly);
    });
  });

  describe('canAccess', () => {
    describe('free tier access', () => {
      it('can access free features', () => {
        // canAccess returns the feature value, not just true/false
        // For numeric features, check truthiness (non-zero)
        expect(canAccess('free', 'aiChatsPerDay')).toBeTruthy();
        expect(canAccess('free', 'journalEntries')).toBeTruthy();
      });

      it('cannot access pro features', () => {
        expect(canAccess('free', 'thesisTracking')).toBe(false);
        expect(canAccess('free', 'optionsAnalysis')).toBe(false);
        expect(canAccess('free', 'unlimitedJournal')).toBe(false);
      });

      it('cannot access elite features', () => {
        expect(canAccess('free', 'emotionalFirewall')).toBe(false);
        expect(canAccess('free', 'psychologyAnalytics')).toBe(false);
        expect(canAccess('free', 'automation')).toBe(false);
      });
    });

    describe('pro tier access', () => {
      it('can access free features', () => {
        expect(canAccess('pro', 'aiChatsPerDay')).toBeTruthy();
        expect(canAccess('pro', 'journalEntries')).toBeTruthy();
      });

      it('can access pro features', () => {
        expect(canAccess('pro', 'thesisTracking')).toBe(true);
        expect(canAccess('pro', 'optionsAnalysis')).toBe(true);
        expect(canAccess('pro', 'unlimitedJournal')).toBe(true);
      });

      it('cannot access elite-only features', () => {
        expect(canAccess('pro', 'emotionalFirewall')).toBe(false);
        expect(canAccess('pro', 'psychologyAnalytics')).toBe(false);
        expect(canAccess('pro', 'automation')).toBe(false);
      });
    });

    describe('elite tier access', () => {
      it('can access all features', () => {
        const allFeatures = Object.keys(TIER_FEATURES.elite) as Array<
          keyof typeof TIER_FEATURES.elite
        >;

        allFeatures.forEach((feature) => {
          // All elite features should be truthy (either true or positive numbers)
          expect(canAccess('elite', feature)).toBeTruthy();
        });
      });
    });

    describe('numeric features', () => {
      it('free tier has limited AI chats', () => {
        const chatsPerDay = TIER_FEATURES.free.aiChatsPerDay;
        expect(chatsPerDay).toBe(5);
        expect(chatsPerDay).toBeLessThan(Infinity);
      });

      it('pro tier has unlimited AI chats', () => {
        expect(TIER_FEATURES.pro.aiChatsPerDay).toBe(Infinity);
      });

      it('elite tier has unlimited AI chats', () => {
        expect(TIER_FEATURES.elite.aiChatsPerDay).toBe(Infinity);
      });
    });
  });

  describe('getRequiredTier', () => {
    it('returns free for features available in free tier', () => {
      // Free tier doesn't have any boolean features set to true
      // but has numeric features
      expect(getRequiredTier('aiChatsPerDay')).toBe('free');
      expect(getRequiredTier('journalEntries')).toBe('free');
    });

    it('returns pro for pro-tier features', () => {
      expect(getRequiredTier('thesisTracking')).toBe('pro');
      expect(getRequiredTier('optionsAnalysis')).toBe('pro');
      expect(getRequiredTier('unlimitedJournal')).toBe('pro');
    });

    it('returns elite for elite-only features', () => {
      expect(getRequiredTier('emotionalFirewall')).toBe('elite');
      expect(getRequiredTier('psychologyAnalytics')).toBe('elite');
      expect(getRequiredTier('automation')).toBe('elite');
    });

    it('returns correct tier for all features', () => {
      const allFeatures = Object.keys(TIER_FEATURES.elite) as Array<
        keyof typeof TIER_FEATURES.elite
      >;

      allFeatures.forEach((feature) => {
        const requiredTier = getRequiredTier(feature);
        expect(['free', 'pro', 'elite']).toContain(requiredTier);
      });
    });
  });

  describe('getTierDisplayName', () => {
    it('capitalizes free', () => {
      expect(getTierDisplayName('free')).toBe('Free');
    });

    it('capitalizes pro', () => {
      expect(getTierDisplayName('pro')).toBe('Pro');
    });

    it('capitalizes elite', () => {
      expect(getTierDisplayName('elite')).toBe('Elite');
    });

    it('only capitalizes first letter', () => {
      expect(getTierDisplayName('free')).not.toBe('FREE');
      expect(getTierDisplayName('pro')).not.toBe('PRO');
      expect(getTierDisplayName('elite')).not.toBe('ELITE');
    });
  });

  describe('tier hierarchy', () => {
    it('elite has all pro features', () => {
      const proFeatures = Object.entries(TIER_FEATURES.pro).filter(
        ([_, value]) => value === true
      );

      proFeatures.forEach(([feature]) => {
        expect(TIER_FEATURES.elite[feature as keyof typeof TIER_FEATURES.elite]).toBe(true);
      });
    });

    it('feature availability increases with tier', () => {
      const allFeatures = Object.keys(TIER_FEATURES.elite) as Array<
        keyof typeof TIER_FEATURES.elite
      >;

      const freeCount = allFeatures.filter((f) =>
        typeof TIER_FEATURES.free[f] === 'boolean' ? TIER_FEATURES.free[f] : true
      ).length;

      const proCount = allFeatures.filter((f) =>
        typeof TIER_FEATURES.pro[f] === 'boolean' ? TIER_FEATURES.pro[f] : true
      ).length;

      const eliteCount = allFeatures.filter((f) =>
        typeof TIER_FEATURES.elite[f] === 'boolean' ? TIER_FEATURES.elite[f] : true
      ).length;

      expect(freeCount).toBeLessThanOrEqual(proCount);
      expect(proCount).toBeLessThanOrEqual(eliteCount);
    });
  });

  describe('edge cases', () => {
    it('handles type safety', () => {
      const tier: SubscriptionTier = 'pro';
      expect(['free', 'pro', 'elite']).toContain(tier);
    });

    it('feature keys are consistent', () => {
      const features = [
        'aiChatsPerDay',
        'journalEntries',
        'emotionalFirewall',
        'psychologyAnalytics',
        'automation',
        'thesisTracking',
        'optionsAnalysis',
        'unlimitedJournal',
      ] as const;

      features.forEach((feature) => {
        expect(TIER_FEATURES.free).toHaveProperty(feature);
        expect(TIER_FEATURES.pro).toHaveProperty(feature);
        expect(TIER_FEATURES.elite).toHaveProperty(feature);
      });
    });
  });
});
