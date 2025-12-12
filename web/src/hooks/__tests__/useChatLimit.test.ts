import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChatLimit } from '../useChatLimit';
import * as supabaseClient from '@/lib/supabase/client';

// Mock the Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock the useUser hook using hoisted pattern
const mockUseUser = vi.hoisted(() => vi.fn());

vi.mock('../useUser', () => ({
  useUser: mockUseUser,
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockSupabaseClient = {
  from: vi.fn(),
};

describe('useChatLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: user not logged in
    mockUseUser.mockReturnValue({
      user: null,
      tier: 'free',
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial state when no user', () => {
      const { result } = renderHook(() => useChatLimit());

      expect(result.current.chatsToday).toBe(0);
      expect(result.current.dailyLimit).toBe(5);
      expect(result.current.isAtLimit).toBe(false);
      expect(result.current.remaining).toBe(5);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.canChat).toBe(true);
    });

    it('returns correct limit for free tier', () => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'free',
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useChatLimit());

      expect(result.current.dailyLimit).toBe(5);
    });

    it('returns unlimited for pro tier', () => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'pro',
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useChatLimit());

      expect(result.current.dailyLimit).toBe(Infinity);
    });

    it('returns unlimited for elite tier', () => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'elite',
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useChatLimit());

      expect(result.current.dailyLimit).toBe(Infinity);
    });
  });

  describe('Fetching chat count', () => {
    beforeEach(() => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'free',
        isLoading: false,
      } as any);
    });

    it('fetches chat count from Supabase for logged in user', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: 3,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chatsToday).toBe(3);
      expect(result.current.remaining).toBe(2);
      expect(result.current.isAtLimit).toBe(false);
      expect(result.current.canChat).toBe(true);

      // Verify correct table and filters
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversations');
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('uses today\'s date as filter', async () => {
      const mockEq = vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      });

      // Check that gte was called with start of today
      const gteCall = mockEq().gte;
      expect(gteCall).toHaveBeenCalled();
      const [field] = gteCall.mock.calls[0];
      expect(field).toBe('created_at');
      // Just verify it's an ISO string for today's date
      const dateValue = gteCall.mock.calls[0][1];
      expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00/);
    });

    it('detects when user is at limit', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: 5,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chatsToday).toBe(5);
      expect(result.current.remaining).toBe(0);
      expect(result.current.isAtLimit).toBe(true);
      expect(result.current.canChat).toBe(false);
    });

    it('detects when user exceeds limit', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: 7,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chatsToday).toBe(7);
      expect(result.current.remaining).toBe(0); // Never negative
      expect(result.current.isAtLimit).toBe(true);
    });

    it('handles null count from Supabase', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: null,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chatsToday).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'free',
        isLoading: false,
      } as any);
    });

    it('handles table not found error silently', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: null,
            error: {
              code: '42P01',
              message: 'relation "conversations" does not exist',
            },
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chatsToday).toBe(0);
      expect(result.current.canChat).toBe(true);
      expect(consoleSpy).not.toHaveBeenCalled(); // Should not log for missing table

      consoleSpy.mockRestore();
    });

    it('handles generic Supabase errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: null,
            error: {
              code: 'PGRST301',
              message: 'Some other error',
            },
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chatsToday).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('Chat limit check:', 'Some other error');

      consoleSpy.mockRestore();
    });

    it('handles network errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chatsToday).toBe(0);
      expect(result.current.canChat).toBe(true);
    });

    it('handles null Supabase client', async () => {
      vi.mocked(supabaseClient.createClient).mockReturnValue(null as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chatsToday).toBe(0);
      expect(result.current.canChat).toBe(true);
    });
  });

  describe('Pro/Elite Users', () => {
    beforeEach(() => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);
    });

    it('pro users never hit limit', async () => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'pro',
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dailyLimit).toBe(Infinity);
      expect(result.current.isAtLimit).toBe(false);
      expect(result.current.canChat).toBe(true);
    });

    it('elite users never hit limit', async () => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'elite',
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dailyLimit).toBe(Infinity);
      expect(result.current.isAtLimit).toBe(false);
      expect(result.current.canChat).toBe(true);
    });
  });

  describe('Fetch Prevention', () => {
    it('prevents repeated fetch attempts for same user', async () => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'free',
        isLoading: false,
      } as any);

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: 3,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const { rerender } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledTimes(1);
      });

      // Rerender should not trigger another fetch
      rerender();
      rerender();
      rerender();

      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('resets fetch attempt when user changes', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: 3,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      // First user
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'free',
        isLoading: false,
      } as any);

      const { rerender } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledTimes(1);
      });

      // User logs out
      mockUseUser.mockReturnValue({
        user: null,
        tier: 'free',
        isLoading: false,
      } as any);

      rerender();

      // User logs back in (different user)
      mockUseUser.mockReturnValue({
        user: { ...mockUser, id: 'user-456' },
        tier: 'free',
        isLoading: false,
      } as any);

      rerender();

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles exact limit boundary', async () => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'free',
        isLoading: false,
      } as any);

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            count: 5,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

      const { result } = renderHook(() => useChatLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAtLimit).toBe(true);
      expect(result.current.remaining).toBe(0);
    });

    it('calculates remaining correctly at different counts', async () => {
      mockUseUser.mockReturnValue({
        user: mockUser,
        tier: 'free',
        isLoading: false,
      } as any);

      const testCases = [
        { count: 0, expectedRemaining: 5 },
        { count: 1, expectedRemaining: 4 },
        { count: 2, expectedRemaining: 3 },
        { count: 3, expectedRemaining: 2 },
        { count: 4, expectedRemaining: 1 },
        { count: 5, expectedRemaining: 0 },
        { count: 10, expectedRemaining: 0 },
      ];

      for (const { count, expectedRemaining } of testCases) {
        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count,
              error: null,
            }),
          }),
        });

        mockSupabaseClient.from.mockReturnValue({
          select: mockSelect,
        });

        vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabaseClient as any);

        const { result } = renderHook(() => useChatLimit());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.remaining).toBe(expectedRemaining);
      }
    });
  });
});
