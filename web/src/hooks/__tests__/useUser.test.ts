import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUser } from '../useUser';

// Mock the dependent hooks
const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockProfile = {
  id: 'profile-123',
  user_id: 'user-123',
  tier: 'pro',
  is_active: true,
};

vi.mock('../useSession', () => ({
  useUser: vi.fn(() => mockUser),
}));

vi.mock('../useProfile', () => ({
  useProfile: vi.fn(() => ({
    profile: mockProfile,
    isLoading: false,
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
        profile: { ...mockProfile, tier: 'free' },
        isLoading: false,
        tier: 'free',
        isActive: true,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.tier).toBe('free');
    });

    it('should return premium tier', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: { ...mockProfile, tier: 'premium' },
        isLoading: false,
        tier: 'premium',
        isActive: true,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.tier).toBe('premium');
    });
  });

  describe('handles inactive users', () => {
    it('should return isActive false for inactive users', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: { ...mockProfile, is_active: false },
        isLoading: false,
        tier: 'pro',
        isActive: false,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.isActive).toBe(false);
    });
  });
});
