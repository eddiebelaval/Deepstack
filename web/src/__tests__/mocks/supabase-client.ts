/**
 * Supabase Client Mock
 *
 * Creates a complete mock Supabase client combining auth and database mocks.
 * Use this to mock the entire Supabase client in tests.
 */
import { vi } from 'vitest';
import { createMockAuth, setAuthState, resetAuthState, mockUser, mockSession } from './supabase-auth';
import { createMockDb, seedData, clearData, getData } from './supabase-db';

/**
 * Create a complete mock Supabase client
 */
export function createMockSupabaseClient() {
  const auth = createMockAuth();
  const db = createMockDb();

  return {
    auth,
    from: db.from,
    // Storage mock (basic implementation)
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn(async (path: string, _file: File | Blob) => ({
          data: { path: `${bucket}/${path}` },
          error: null,
        })),
        download: vi.fn(async (_path: string) => ({
          data: new Blob(['mock file content']),
          error: null,
        })),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://mock-storage.supabase.co/${bucket}/${path}` },
        })),
        remove: vi.fn(async (paths: string[]) => ({
          data: paths.map((p) => ({ name: p })),
          error: null,
        })),
        list: vi.fn(async (_prefix?: string) => ({
          data: [{ name: 'file1.png' }, { name: 'file2.jpg' }],
          error: null,
        })),
      })),
    },
    // Realtime mock
    channel: vi.fn((_name: string) => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback?: (status: string) => void) => {
        if (callback) callback('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      }),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    getChannels: vi.fn(() => []),
  };
}

// Mock factory for vi.mock
export const mockSupabaseServer = {
  createClient: vi.fn(async () => createMockSupabaseClient()),
};

export const mockSupabaseBrowser = {
  createClient: vi.fn(() => createMockSupabaseClient()),
};

// Re-export utilities
export {
  setAuthState,
  resetAuthState,
  mockUser,
  mockSession,
  seedData,
  clearData,
  getData,
};
