/**
 * Mock Exports Index
 *
 * Centralized exports for all test mocks.
 */

// Supabase mocks
export {
  createMockSupabaseClient,
  mockSupabaseServer,
  mockSupabaseBrowser,
  setAuthState,
  resetAuthState,
  mockUser,
  mockSession,
  seedData,
  clearData,
  getData,
} from './supabase-client';

// AI SDK mocks
export {
  mockStreamText,
  mockGenerateText,
  mockAiSdk,
  configureStream,
  resetStreamConfig,
} from './ai-sdk';

// MSW handlers
export { handlers } from '../integration/mocks/handlers';
export { extendedHandlers, extendedMocks } from './handlers-extended';

// Combine all handlers for comprehensive mocking
import { handlers } from '../integration/mocks/handlers';
import { extendedHandlers } from './handlers-extended';

export const allHandlers = [...handlers, ...extendedHandlers];
