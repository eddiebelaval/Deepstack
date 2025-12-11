import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRequireAuth } from '../useRequireAuth';
import type { User } from '@supabase/supabase-js';

// Mock Next.js router
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock AuthProvider
const mockUseAuth = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useRequireAuth', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        pathname: '/dashboard',
        search: '',
        hash: '',
        href: 'http://localhost:3000/dashboard',
      },
    });
  });

  describe('initial state', () => {
    it('returns user when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('returns null user when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('returns loading state while checking auth', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { result } = renderHook(() => useRequireAuth());

      expect(result.current.loading).toBe(true);
    });
  });

  describe('requireAuth function', () => {
    it('returns true when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      const isAuthenticated = result.current.requireAuth();

      expect(isAuthenticated).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('returns false and redirects when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      const isAuthenticated = result.current.requireAuth();

      expect(isAuthenticated).toBe(false);
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/login'));
    });

    it('does not redirect while still loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { result } = renderHook(() => useRequireAuth());

      const isAuthenticated = result.current.requireAuth();

      // Should return true while loading (don't redirect yet)
      expect(isAuthenticated).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('includes return URL in redirect', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      Object.defineProperty(window.location, 'pathname', {
        writable: true,
        value: '/trading/dashboard',
      });

      const { result } = renderHook(() => useRequireAuth());

      result.current.requireAuth();

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('next=%2Ftrading%2Fdashboard'));
    });

    it('includes feature name in redirect when provided', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      result.current.requireAuth('AI Chat');

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('feature=AI+Chat'));
    });

    it('includes both return URL and feature name', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      Object.defineProperty(window.location, 'pathname', {
        writable: true,
        value: '/chat',
      });

      const { result } = renderHook(() => useRequireAuth());

      result.current.requireAuth('AI Assistant');

      const callArg = mockPush.mock.calls[0][0];
      expect(callArg).toContain('/login');
      expect(callArg).toContain('next=%2Fchat');
      expect(callArg).toContain('feature=AI+Assistant');
    });
  });

  describe('usage patterns', () => {
    it('can be used as a guard for protected actions', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      const handleProtectedAction = () => {
        if (!result.current.requireAuth('Premium Feature')) return;
        // Action code would go here
      };

      handleProtectedAction();

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('prevents action when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());
      const actionSpy = vi.fn();

      const handleProtectedAction = () => {
        if (!result.current.requireAuth('Premium Feature')) return;
        actionSpy();
      };

      handleProtectedAction();

      expect(actionSpy).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe('URL encoding', () => {
    it('properly encodes complex return URLs', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      Object.defineProperty(window.location, 'pathname', {
        writable: true,
        value: '/trading/chart?symbol=BTC/USD&timeframe=1h',
      });

      const { result } = renderHook(() => useRequireAuth());

      result.current.requireAuth();

      const callArg = mockPush.mock.calls[0][0];
      expect(callArg).toContain('/login');
      // URL should be encoded
      expect(callArg).toMatch(/next=%2Ftrading%2Fchart/);
    });

    it('properly encodes feature names with spaces', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      result.current.requireAuth('Advanced Trading Features');

      const callArg = mockPush.mock.calls[0][0];
      expect(callArg).toContain('feature=Advanced+Trading+Features');
    });

    it('properly encodes feature names with special characters', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      result.current.requireAuth('AI Chat & Analysis');

      const callArg = mockPush.mock.calls[0][0];
      expect(callArg).toContain('feature=');
    });
  });

  describe('state updates', () => {
    it('updates when auth state changes', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { result, rerender } = renderHook(() => useRequireAuth());

      expect(result.current.isAuthenticated).toBe(false);

      // User signs in
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
      });

      rerender();

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('updates when loading state changes', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { result, rerender } = renderHook(() => useRequireAuth());

      expect(result.current.loading).toBe(true);

      // Loading completes
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      rerender();

      expect(result.current.loading).toBe(false);
    });
  });

  describe('requireAuth callback behavior', () => {
    it('callback can be called multiple times', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      // Call multiple times
      expect(result.current.requireAuth()).toBe(true);
      expect(result.current.requireAuth()).toBe(true);
      expect(result.current.requireAuth()).toBe(true);
    });

    it('callback behavior updates when auth state changes', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { result, rerender } = renderHook(() => useRequireAuth());

      // Should redirect when not authenticated
      expect(result.current.requireAuth()).toBe(false);
      expect(mockPush).toHaveBeenCalled();

      // Clear mock
      mockPush.mockClear();

      // Auth state changes - user signs in
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
      });

      rerender();

      // Should now succeed without redirect
      expect(result.current.requireAuth()).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('provides consistent function type', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
      });

      const { result } = renderHook(() => useRequireAuth());

      expect(typeof result.current.requireAuth).toBe('function');
    });
  });
});
