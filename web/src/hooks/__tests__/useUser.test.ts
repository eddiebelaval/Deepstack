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

import { useUser as useAuthUser } from '../useSession';
import { useProfile } from '../useProfile';

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
    it('should return free tier', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: { ...mockProfile, subscription_tier: 'free' },
        isLoading: false,
        error: null,
        tier: 'free',
        isActive: true,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.tier).toBe('free');
    });

    it('should return elite tier', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: { ...mockProfile, subscription_tier: 'elite' },
        isLoading: false,
        error: null,
        tier: 'elite',
        isActive: true,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.tier).toBe('elite');
    });
  });

  describe('handles inactive users', () => {
    it('should return isActive false for inactive users', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: { ...mockProfile, subscription_status: 'inactive' },
        isLoading: false,
        error: null,
        tier: 'pro',
        isActive: false,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.isActive).toBe(false);
    });
  });
});
