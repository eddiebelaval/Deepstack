import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthProvider';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client');

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { user, session, loading, isConfigured, signOut, signInWithGoogle, signInWithMagicLink } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="configured">{isConfigured.toString()}</div>
      <div data-testid="user">{user ? user.email : 'no user'}</div>
      <div data-testid="session">{session ? 'has session' : 'no session'}</div>
      <button onClick={() => signOut()} data-testid="sign-out">Sign Out</button>
      <button onClick={() => signInWithGoogle()} data-testid="sign-in-google">Sign In Google</button>
      <button onClick={() => signInWithMagicLink('test@example.com')} data-testid="sign-in-magic">
        Sign In Magic
      </button>
    </div>
  );
};

describe('AuthProvider', () => {
  let mockSupabase: any;
  let mockAuthStateSubscription: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();

    // Create mock subscription
    mockAuthStateSubscription = {
      unsubscribe: vi.fn(),
    };

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        signOut: vi.fn(),
        signInWithOAuth: vi.fn(),
        signInWithOtp: vi.fn(),
      },
    };
  });

  describe('Supabase not configured', () => {
    beforeEach(() => {
      (createClient as any).mockReturnValue(null);
    });

    it('sets isConfigured to false when Supabase is null', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('configured')).toHaveTextContent('false');
      });
    });

    it('sets loading to false when not configured', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('shows no user when not configured', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
      });
    });

    it('signOut does nothing when not configured', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-out'));

      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });

    it('signInWithGoogle returns config error when not configured', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-in-google'));

      // Error should be returned but won't crash
      expect(mockSupabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    });

    it('signInWithMagicLink returns config error when not configured', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-in-magic'));

      expect(mockSupabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });
  });

  describe('Supabase configured', () => {
    beforeEach(() => {
      (createClient as any).mockReturnValue(mockSupabase);
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockAuthStateSubscription },
      });
    });

    it('sets isConfigured to true when Supabase is available', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('configured')).toHaveTextContent('true');
      });
    });

    it('fetches session on mount', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it('sets up auth state listener', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });
    });

    it('unsubscribes on unmount', async () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(mockAuthStateSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('sets loading to false after fetching session', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });
  });

  describe('User session management', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    };

    const mockSession = {
      access_token: 'token-123',
      user: mockUser,
    };

    beforeEach(() => {
      (createClient as any).mockReturnValue(mockSupabase);
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockAuthStateSubscription },
      });
    });

    it('sets user and session when session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('session')).toHaveTextContent('has session');
      });
    });

    it('sets user to null when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
        expect(screen.getByTestId('session')).toHaveTextContent('no session');
      });
    });

    it('updates state on SIGNED_IN event', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      let authStateCallback: any;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return { data: { subscription: mockAuthStateSubscription } };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
      });

      // Simulate SIGNED_IN event
      authStateCallback('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('updates state on SIGNED_OUT event', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      let authStateCallback: any;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return { data: { subscription: mockAuthStateSubscription } };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      // Simulate SIGNED_OUT event
      authStateCallback('SIGNED_OUT', null);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('refreshes router on auth state changes', async () => {
      let authStateCallback: any;
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return { data: { subscription: mockAuthStateSubscription } };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      authStateCallback('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('signOut', () => {
    beforeEach(() => {
      (createClient as any).mockReturnValue(mockSupabase);
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockAuthStateSubscription },
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    });

    it('calls supabase signOut', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-out'));

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      });
    });

    it('redirects to login page after sign out', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-out'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('signInWithGoogle', () => {
    beforeEach(() => {
      (createClient as any).mockReturnValue(mockSupabase);
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockAuthStateSubscription },
      });
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      });
    });

    it('calls signInWithOAuth with Google provider', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-in-google'));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/auth/callback',
          },
        });
      });
    });

    it('returns error from signInWithOAuth', async () => {
      const user = userEvent.setup();
      const mockError = { message: 'OAuth error', name: 'OAuthError' };
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: mockError });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-in-google'));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalled();
      });
    });
  });

  describe('signInWithMagicLink', () => {
    beforeEach(() => {
      (createClient as any).mockReturnValue(mockSupabase);
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockAuthStateSubscription },
      });
      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      });
    });

    it('calls signInWithOtp with email', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-in-magic'));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        });
      });
    });

    it('returns error from signInWithOtp', async () => {
      const user = userEvent.setup();
      const mockError = { message: 'OTP error', name: 'OTPError' };
      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: mockError });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-in-magic'));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalled();
      });
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      const TestComponentWithoutProvider = () => {
        useAuth();
        return null;
      };

      // Suppress error output for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponentWithoutProvider />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      spy.mockRestore();
    });

    it('works when used inside AuthProvider', async () => {
      (createClient as any).mockReturnValue(mockSupabase);
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockAuthStateSubscription },
      });

      expect(() =>
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        )
      ).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      (createClient as any).mockReturnValue(mockSupabase);
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockAuthStateSubscription },
      });
    });

    it('handles session fetch error gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

      expect(() =>
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        )
      ).not.toThrow();
    });

    it('handles signOut error gracefully', async () => {
      const user = userEvent.setup();
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Sign out error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByTestId('sign-out'));

      // Should still redirect even if signOut fails
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('handles auth state change with undefined session', async () => {
      let authStateCallback: any;
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return { data: { subscription: mockAuthStateSubscription } };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      // Simulate event with undefined session
      authStateCallback('TOKEN_REFRESHED', undefined);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
      });
    });
  });
});
