import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfile } from '../useProfile';
import { useUser } from '../useSession';
import * as supabaseClient from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Hoist mocks
const mockCreateClient = vi.hoisted(() => vi.fn());
const mockUseUser = vi.hoisted(() => vi.fn());

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

vi.mock('../useSession', () => ({
  useUser: mockUseUser,
}));

const mockUser: Partial<User> = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
};

const mockProfileData = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const mockSubscriptionData = {
  tier: 'PRO',
  status: 'active',
  active: true,
  current_period_end: '2025-01-01T00:00:00Z',
};

describe('useProfile', () => {
  let mockSupabase: any;
  let mockChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase channel
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    };

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      channel: vi.fn().mockReturnValue(mockChannel),
    };

    mockCreateClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial loading state when user exists', () => {
      mockUseUser.mockReturnValue(mockUser);
      mockSupabase.maybeSingle.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useProfile());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('returns not loading when no user', () => {
      mockUseUser.mockReturnValue(null);

      const { result } = renderHook(() => useProfile());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.profile).toBeNull();
    });
  });

  describe('Profile Loading', () => {
    it('loads profile and subscription data successfully', async () => {
      mockUseUser.mockReturnValue(mockUser);

      // Mock profiles query
      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      // Mock subscriptions query
      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscriptionData, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_ends_at: '2025-01-01T00:00:00Z',
      });

      expect(result.current.tier).toBe('pro');
      expect(result.current.isActive).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('handles missing profile data gracefully', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        full_name: null,
        avatar_url: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        subscription_tier: 'free',
        subscription_status: 'inactive',
        subscription_ends_at: null,
      });

      expect(result.current.tier).toBe('free');
      expect(result.current.isActive).toBe(false);
    });

    it('handles profile not found error gracefully', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still create minimal profile from auth user
      expect(result.current.profile?.id).toBe('user-123');
      expect(result.current.profile?.email).toBe('test@example.com');
      expect(result.current.error).toBeNull();
    });

    it('handles database errors', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed'),
        }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      // Should still provide minimal fallback profile
      expect(result.current.profile?.id).toBe('user-123');
      expect(result.current.profile?.subscription_tier).toBe('free');

      consoleErrorSpy.mockRestore();
    });

    it('handles missing Supabase client', async () => {
      mockUseUser.mockReturnValue(mockUser);
      mockCreateClient.mockReturnValue(null);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
    });
  });

  describe('Subscription Data', () => {
    it('correctly maps subscription tier to lowercase', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...mockSubscriptionData, tier: 'ENTERPRISE' },
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile?.subscription_tier).toBe('enterprise');
      expect(result.current.tier).toBe('enterprise');
    });

    it('sets inactive status when subscription is not active', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...mockSubscriptionData, active: false },
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile?.subscription_status).toBe('inactive');
      expect(result.current.isActive).toBe(false);
    });

    it('defaults to free tier when no subscription data', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe('free');
      expect(result.current.isActive).toBe(false);
      expect(result.current.profile?.subscription_ends_at).toBeNull();
    });
  });

  describe('Real-time Updates', () => {
    it('subscribes to profile changes', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscriptionData, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      renderHook(() => useProfile());

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('profile:user-123');
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'id=eq.user-123',
        }),
        expect.any(Function)
      );

      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('unsubscribes on unmount', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscriptionData, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { unmount } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('does not subscribe when Supabase client is not available', () => {
      mockUseUser.mockReturnValue(mockUser);
      mockCreateClient.mockReturnValue(null);

      renderHook(() => useProfile());

      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });
  });

  describe('User Changes', () => {
    it('resets profile when user logs out', async () => {
      const { rerender, result } = renderHook(() => useProfile());

      // Initially with user
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscriptionData, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      rerender();

      await waitFor(() => {
        expect(result.current.profile).toBeTruthy();
      });

      // User logs out
      mockUseUser.mockReturnValue(null);
      rerender();

      expect(result.current.profile).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.tier).toBe('free');
      expect(result.current.isActive).toBe(false);
    });

    it('prevents duplicate fetches for the same user', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscriptionData, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { rerender } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(profilesChain.maybeSingle).toHaveBeenCalledTimes(1);
      });

      // Rerender should not trigger another fetch
      rerender();
      rerender();

      expect(profilesChain.maybeSingle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Profile', () => {
    it('provides minimal profile on error', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockRejectedValue(new Error('Database error')),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        full_name: null,
        avatar_url: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        subscription_tier: 'free',
        subscription_status: 'inactive',
        subscription_ends_at: null,
      });

      consoleSpy.mockRestore();
    });

    it('uses user email from auth when profile email is missing', async () => {
      mockUseUser.mockReturnValue(mockUser);

      const profilesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...mockProfileData, email: null },
          error: null,
        }),
      };

      const subsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'subscriptions') return subsChain;
        return mockSupabase;
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile?.email).toBe('test@example.com');
    });
  });
});
