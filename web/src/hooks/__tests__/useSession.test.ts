import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionStore } from '../useSession';

// Note: Full integration tests for useSession would require complex Supabase mocking.
// These tests focus on the Zustand store behavior which is the core state management.
// End-to-end tests should cover the full authentication flow.

describe('useSessionStore', () => {
  beforeEach(() => {
    act(() => {
      useSessionStore.setState({
        session: null,
        user: null,
        isLoading: true,
        isExpired: false,
      });
    });
  });

  describe('initial state', () => {
    it('initializes with correct default state', () => {
      const state = useSessionStore.getState();

      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.isExpired).toBe(false);
    });
  });

  describe('setSession', () => {
    it('updates session state', () => {
      const mockSession = {
        access_token: 'token-123',
        token_type: 'bearer',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        refresh_token: 'refresh-123',
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      act(() => {
        useSessionStore.getState().setSession(mockSession);
      });

      expect(useSessionStore.getState().session).toBe(mockSession);
    });

    it('can clear session by setting to null', () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: 'user-123' },
      } as any;

      act(() => {
        useSessionStore.getState().setSession(mockSession);
      });

      expect(useSessionStore.getState().session).toBe(mockSession);

      act(() => {
        useSessionStore.getState().setSession(null);
      });

      expect(useSessionStore.getState().session).toBeNull();
    });
  });

  describe('setUser', () => {
    it('updates user state', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;

      act(() => {
        useSessionStore.getState().setUser(mockUser);
      });

      expect(useSessionStore.getState().user).toBe(mockUser);
    });

    it('can clear user by setting to null', () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' } as any;

      act(() => {
        useSessionStore.getState().setUser(mockUser);
      });

      expect(useSessionStore.getState().user).toBe(mockUser);

      act(() => {
        useSessionStore.getState().setUser(null);
      });

      expect(useSessionStore.getState().user).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('updates loading state to false', () => {
      act(() => {
        useSessionStore.getState().setLoading(false);
      });

      expect(useSessionStore.getState().isLoading).toBe(false);
    });

    it('updates loading state to true', () => {
      act(() => {
        useSessionStore.getState().setLoading(false);
      });

      act(() => {
        useSessionStore.getState().setLoading(true);
      });

      expect(useSessionStore.getState().isLoading).toBe(true);
    });
  });

  describe('setExpired', () => {
    it('updates expired state to true', () => {
      act(() => {
        useSessionStore.getState().setExpired(true);
      });

      expect(useSessionStore.getState().isExpired).toBe(true);
    });

    it('updates expired state to false', () => {
      act(() => {
        useSessionStore.getState().setExpired(true);
      });

      act(() => {
        useSessionStore.getState().setExpired(false);
      });

      expect(useSessionStore.getState().isExpired).toBe(false);
    });
  });

  describe('multiple state updates', () => {
    it('handles multiple state updates correctly', () => {
      const mockSession = {
        access_token: 'token',
        user: { id: '123' },
      } as any;

      const mockUser = {
        id: '123',
        email: 'test@example.com',
      } as any;

      act(() => {
        const store = useSessionStore.getState();
        store.setSession(mockSession);
        store.setUser(mockUser);
        store.setLoading(false);
        store.setExpired(false);
      });

      const state = useSessionStore.getState();
      expect(state.session).toBe(mockSession);
      expect(state.user).toBe(mockUser);
      expect(state.isLoading).toBe(false);
      expect(state.isExpired).toBe(false);
    });
  });

  describe('state isolation', () => {
    it('maintains independent state properties', () => {
      const mockSession = { access_token: 'token' } as any;

      act(() => {
        useSessionStore.getState().setSession(mockSession);
      });

      const state1 = useSessionStore.getState();
      expect(state1.session).toBe(mockSession);
      expect(state1.user).toBeNull(); // Should not be affected

      const mockUser = { id: 'user-123' } as any;

      act(() => {
        useSessionStore.getState().setUser(mockUser);
      });

      const state2 = useSessionStore.getState();
      expect(state2.session).toBe(mockSession); // Should still be set
      expect(state2.user).toBe(mockUser);
    });
  });

  describe('React hook integration', () => {
    it('can be used in React components via renderHook', () => {
      const { result } = renderHook(() => useSessionStore());

      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it('updates when state changes', () => {
      const { result } = renderHook(() => useSessionStore());

      expect(result.current.isLoading).toBe(true);

      act(() => {
        useSessionStore.getState().setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('provides all setter functions', () => {
      const { result } = renderHook(() => useSessionStore());

      expect(typeof result.current.setSession).toBe('function');
      expect(typeof result.current.setUser).toBe('function');
      expect(typeof result.current.setLoading).toBe('function');
      expect(typeof result.current.setExpired).toBe('function');
    });
  });
});
