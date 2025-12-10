/**
 * Supabase Auth Mock
 *
 * Provides mock implementations for Supabase authentication in tests.
 * Supports authenticated and unauthenticated states for testing protected routes.
 */
import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  role: 'authenticated',
};

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

// State to control auth behavior
let isAuthenticated = true;
let currentUser = mockUser;

/**
 * Configure auth mock state
 */
export function setAuthState(options: {
  authenticated?: boolean;
  user?: typeof mockUser | null;
}) {
  isAuthenticated = options.authenticated ?? true;
  currentUser = options.user ?? mockUser;
}

/**
 * Reset auth mock to default authenticated state
 */
export function resetAuthState() {
  isAuthenticated = true;
  currentUser = mockUser;
}

/**
 * Create mock auth object that mimics Supabase auth API
 */
export function createMockAuth() {
  return {
    getUser: vi.fn(async () => {
      if (isAuthenticated && currentUser) {
        return { data: { user: currentUser }, error: null };
      }
      return {
        data: { user: null },
        error: { message: 'Not authenticated', status: 401 },
      };
    }),

    getSession: vi.fn(async () => {
      if (isAuthenticated && currentUser) {
        return { data: { session: { ...mockSession, user: currentUser } }, error: null };
      }
      return { data: { session: null }, error: null };
    }),

    signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
      if (email === 'test@example.com' && password === 'password123') {
        isAuthenticated = true;
        return { data: { user: currentUser, session: mockSession }, error: null };
      }
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', status: 400 },
      };
    }),

    signOut: vi.fn(async () => {
      isAuthenticated = false;
      return { error: null };
    }),

    onAuthStateChange: vi.fn((callback: (event: string, session: typeof mockSession | null) => void) => {
      // Return unsubscribe function
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    }),
  };
}
