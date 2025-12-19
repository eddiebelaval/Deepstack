import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUser } from '../useUser';

// Mock the dependent hooks
const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockProfile = {
  id: 'profile-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  subscription_tier: 'pro' as const,
  subscription_status: 'active' as const,
  subscription_ends_at: null,
  // Trial fields
  trial_started_at: null,
  trial_ends_at: null,
  trial_tier: null,
  has_used_trial: false,
  trial_downgraded_at: null,
  trial_converted_at: null,
};

const mockTrialState = {
  // Trial state
  isTrialing: false,
  trialStartedAt: null as Date | null,
  trialEndsAt: null as Date | null,
  trialTier: 'elite' as const,
  daysRemaining: 0,
  phase: 'none' as const,
  hasUsedTrial: false,
  trialDowngradedAt: null as Date | null,
  trialConvertedAt: null as Date | null,
  // Computed
  isLoading: false,
  nudge: null,
  effectiveTier: 'pro' as const,
  logTrialEvent: vi.fn().mockResolvedValue(undefined),
  canStartTrial: false,
  recentlyEndedTrial: false,
  isAtMidpoint: false,
  isUrgent: false,
  hasConverted: false,
};

vi.mock('../useSession', () => ({
  useUser: vi.fn(() => mockUser),
}));

vi.mock('../useProfile', () => ({
  useProfile: vi.fn(() => ({
    profile: mockProfile,
    isLoading: false,
    error: null,
    tier: 'pro',
    isActive: true,
  })),
}));

vi.mock('../useTrial', () => ({
  useTrial: vi.fn(() => mockTrialState),
}));

import { useUser as useAuthUser } from '../useSession';
import { useProfile } from '../useProfile';
import { useTrial } from '../useTrial';

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('returns combined user data', () => {
    it('should return user from useSession', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.user).toEqual(mockUser);
    });

    it('should return profile from useProfile', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.profile).toEqual(mockProfile);
    });

    it('should return tier from useProfile', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.tier).toBe('pro');
    });

    it('should return isActive from useProfile', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.isActive).toBe(true);
    });

    it('should return isLoading from useProfile', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('handles loading state', () => {
    it('should reflect profile loading state', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        tier: 'free',
        isActive: false,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.profile).toBeNull();
    });
  });

  describe('handles no user', () => {
    it('should return null user when not authenticated', () => {
      vi.mocked(useAuthUser).mockReturnValue(null);

      const { result } = renderHook(() => useUser());

      expect(result.current.user).toBeNull();
    });
  });

  describe('handles different tiers', () => {
    it('should return free tier from trial effective tier', () => {
      vi.mocked(useTrial).mockReturnValue({
        ...mockTrialState,
        effectiveTier: 'free',
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.tier).toBe('free');
    });

    it('should return elite tier from trial effective tier', () => {
      vi.mocked(useTrial).mockReturnValue({
        ...mockTrialState,
        effectiveTier: 'elite',
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.tier).toBe('elite');
    });
  });

  describe('handles inactive users', () => {
    it('should return isActive false for inactive non-trialing users', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: { ...mockProfile, subscription_status: 'inactive' },
        isLoading: false,
        error: null,
        tier: 'pro',
        isActive: false,
      });
      vi.mocked(useTrial).mockReturnValue({
        ...mockTrialState,
        isTrialing: false,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.isActive).toBe(false);
    });

    it('should return isActive true for trialing users even if subscription inactive', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: { ...mockProfile, subscription_status: 'inactive' },
        isLoading: false,
        error: null,
        tier: 'free',
        isActive: false,
      });
      vi.mocked(useTrial).mockReturnValue({
        ...mockTrialState,
        isTrialing: true,
        effectiveTier: 'elite',
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.isActive).toBe(true);
    });
  });

  describe('handles trial state', () => {
    it('should expose trial state', () => {
      const trialState = {
        ...mockTrialState,
        isTrialing: true,
        daysRemaining: 7,
      };
      vi.mocked(useTrial).mockReturnValue(trialState);

      const { result } = renderHook(() => useUser());

      expect(result.current.trial).toEqual(trialState);
    });
  });
});
