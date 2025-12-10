/**
 * Integration Test Setup
 *
 * Uses MSW (Mock Service Worker) to intercept HTTP requests at the network level.
 * This allows us to test API routes with mocked external dependencies.
 */
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';
import { extendedHandlers } from '../mocks/handlers-extended';
import { resetAuthState, clearData } from '../mocks/supabase-client';
import { resetStreamConfig } from '../mocks/ai-sdk';

// Create MSW server with all handlers (base + extended)
export const server = setupServer(...handlers, ...extendedHandlers);

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers and mock state after each test
afterEach(() => {
  server.resetHandlers();
  resetAuthState();
  clearData();
  resetStreamConfig();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
