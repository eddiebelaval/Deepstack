/**
 * Integration Tests: /api/journal
 *
 * Tests the journal entries API route with Supabase authentication and database mocking.
 * Verifies: auth protection, CRUD operations, validation, ownership checks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from '@/app/api/journal/route';
import { createRequest, parseResponse } from '../test-utils';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => {
    const { createMockSupabaseClient } = await import('../../mocks/supabase-client');
    return createMockSupabaseClient();
  }),
}));

import { setAuthState, seedData, clearData, mockUser } from '../../mocks/supabase-client';

interface JournalEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  symbol: string;
  tradeDate: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  emotionAtEntry: string;
  emotionAtExit?: string;
  notes: string;
  lessonsLearned?: string;
  thesisId?: string;
  screenshotUrls?: string[];
}

interface JournalEntriesResponse {
  entries: JournalEntry[];
}

interface JournalEntryResponse {
  entry: JournalEntry;
}

interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

describe('/api/journal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearData();
  });

  describe('Authentication', () => {
    it('returns 401 when not authenticated for GET', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/journal');
      const response = await GET(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Authentication required');
    });

    it('returns 401 when not authenticated for POST', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          hypothesis: 'Test',
          timeframe: '1 week',
          entryPrice: 100,
          quantity: 10,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when not authenticated for PUT', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'PUT',
        body: {
          id: 'entry-123',
          symbol: 'AAPL',
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when not authenticated for DELETE', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/journal?id=entry-123');
      const response = await DELETE(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET - List Entries', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    it('returns empty array when no entries exist', async () => {
      const request = createRequest('http://localhost:3000/api/journal');
      const response = await GET(request);
      const data = await parseResponse<JournalEntriesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.entries).toEqual([]);
    });

    it('returns user entries when authenticated', async () => {
      // Seed test data
      seedData('journal_entries', [
        {
          id: 'entry-1',
          user_id: mockUser.id,
          symbol: 'SPY',
          trade_date: '2024-01-15T10:00:00Z',
          direction: 'long',
          entry_price: 450.5,
          exit_price: 455.0,
          quantity: 10,
          pnl: 45.0,
          pnl_percent: 1.0,
          emotion_at_entry: 'confident',
          emotion_at_exit: 'satisfied',
          notes: 'Good entry timing',
          lessons_learned: 'Trust the setup',
          thesis_id: null,
          screenshot_urls: [],
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T16:00:00Z',
        },
        {
          id: 'entry-2',
          user_id: mockUser.id,
          symbol: 'AAPL',
          trade_date: '2024-01-16T10:00:00Z',
          direction: 'short',
          entry_price: 185.0,
          exit_price: null,
          quantity: 5,
          pnl: null,
          pnl_percent: null,
          emotion_at_entry: 'nervous',
          emotion_at_exit: null,
          notes: 'Still in position',
          lessons_learned: null,
          thesis_id: null,
          screenshot_urls: [],
          created_at: '2024-01-16T09:00:00Z',
          updated_at: '2024-01-16T09:00:00Z',
        },
      ]);

      const request = createRequest('http://localhost:3000/api/journal');
      const response = await GET(request);
      const data = await parseResponse<JournalEntriesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(2);
      expect(data.entries[0].symbol).toBe('AAPL'); // Ordered by trade_date desc
      expect(data.entries[1].symbol).toBe('SPY');
    });

    it('only returns entries for authenticated user', async () => {
      // Seed data for multiple users
      seedData('journal_entries', [
        {
          id: 'entry-1',
          user_id: mockUser.id,
          symbol: 'SPY',
          trade_date: '2024-01-15T10:00:00Z',
          direction: 'long',
          entry_price: 450.5,
          exit_price: null,
          quantity: 10,
          pnl: null,
          pnl_percent: null,
          emotion_at_entry: 'confident',
          emotion_at_exit: null,
          notes: '',
          lessons_learned: null,
          thesis_id: null,
          screenshot_urls: [],
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T09:00:00Z',
        },
        {
          id: 'entry-2',
          user_id: 'other-user-456',
          symbol: 'AAPL',
          trade_date: '2024-01-16T10:00:00Z',
          direction: 'long',
          entry_price: 185.0,
          exit_price: null,
          quantity: 5,
          pnl: null,
          pnl_percent: null,
          emotion_at_entry: 'neutral',
          emotion_at_exit: null,
          notes: '',
          lessons_learned: null,
          thesis_id: null,
          screenshot_urls: [],
          created_at: '2024-01-16T09:00:00Z',
          updated_at: '2024-01-16T09:00:00Z',
        },
      ]);

      const request = createRequest('http://localhost:3000/api/journal');
      const response = await GET(request);
      const data = await parseResponse<JournalEntriesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].symbol).toBe('SPY');
    });
  });

  describe('POST - Create Entry', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    it('creates entry with valid data', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          symbol: 'spy',
          tradeDate: '2024-01-15T10:00:00Z',
          direction: 'long',
          entryPrice: 450.5,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: 'Good setup',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<JournalEntryResponse>(response);

      expect(response.status).toBe(201);
      expect(data.entry).toBeDefined();
      expect(data.entry.symbol).toBe('SPY'); // Normalized to uppercase
      expect(data.entry.entryPrice).toBe(450.5);
      expect(data.entry.quantity).toBe(10);
      expect(data.entry.direction).toBe('long');
      expect(data.entry.id).toBeDefined();
      expect(data.entry.createdAt).toBeDefined();
    });

    it('calculates P&L for completed trades (long)', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          direction: 'long',
          entryPrice: 450.0,
          exitPrice: 455.0,
          quantity: 10,
          emotionAtEntry: 'confident',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<JournalEntryResponse>(response);

      expect(response.status).toBe(201);
      expect(data.entry.pnl).toBe(50); // (455 - 450) * 10
      expect(data.entry.pnlPercent).toBeCloseTo(1.11, 1); // ((455-450)/450)*100
    });

    it('calculates P&L for completed trades (short)', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          direction: 'short',
          entryPrice: 455.0,
          exitPrice: 450.0,
          quantity: 10,
          emotionAtEntry: 'confident',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<JournalEntryResponse>(response);

      expect(response.status).toBe(201);
      expect(data.entry.pnl).toBe(50); // (455 - 450) * 10 * 1 (short makes profit when price drops)
      expect(data.entry.pnlPercent).toBeCloseTo(1.10, 1);
    });

    it('returns 400 for missing required fields', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          // Missing symbol (required field)
          entryPrice: 100,
          quantity: 10,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('returns 400 for invalid symbol', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          symbol: 'TOOLONGSYMBOL123',
          entryPrice: 100,
          quantity: 10,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for negative prices', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          entryPrice: -100,
          quantity: 10,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('normalizes symbol to uppercase', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          symbol: 'aapl',
          entryPrice: 185.0,
          quantity: 5,
          emotionAtEntry: 'neutral',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<JournalEntryResponse>(response);

      expect(response.status).toBe(201);
      expect(data.entry.symbol).toBe('AAPL');
    });

    it('uses default values for optional fields', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          entryPrice: 450.0,
          quantity: 10,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<JournalEntryResponse>(response);

      expect(response.status).toBe(201);
      expect(data.entry.direction).toBe('long'); // Default
      expect(data.entry.emotionAtEntry).toBe('neutral'); // Default
      expect(data.entry.screenshotUrls).toEqual([]); // Default
    });
  });

  describe('PUT - Update Entry', () => {
    const validEntryId = '550e8400-e29b-41d4-a716-446655440000';

    beforeEach(() => {
      setAuthState({ authenticated: true });
      seedData('journal_entries', [
        {
          id: validEntryId,
          user_id: mockUser.id,
          symbol: 'SPY',
          trade_date: '2024-01-15T10:00:00Z',
          direction: 'long',
          entry_price: 450.0,
          exit_price: null,
          quantity: 10,
          pnl: null,
          pnl_percent: null,
          emotion_at_entry: 'confident',
          emotion_at_exit: null,
          notes: 'Initial notes',
          lessons_learned: null,
          thesis_id: null,
          screenshot_urls: [],
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T09:00:00Z',
        },
      ]);
    });

    it('updates entry owned by user', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'PUT',
        body: {
          id: validEntryId,
          exitPrice: 455.0,
          emotionAtExit: 'satisfied',
          notes: 'Updated notes',
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<JournalEntryResponse>(response);

      expect(response.status).toBe(200);
      expect(data.entry.exitPrice).toBe(455.0);
      expect(data.entry.emotionAtExit).toBe('satisfied');
      expect(data.entry.notes).toBe('Updated notes');
      expect(data.entry.pnl).toBe(50); // Auto-calculated
    });

    it('returns 404 for non-existent entry', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'PUT',
        body: {
          id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID but doesn't exist
          notes: 'Test',
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
    });

    it('returns 404 when trying to update another user entry', async () => {
      const otherEntryId = '550e8400-e29b-41d4-a716-446655440002';
      // Add entry for different user
      seedData('journal_entries', [
        {
          id: otherEntryId,
          user_id: 'other-user-456',
          symbol: 'AAPL',
          trade_date: '2024-01-15T10:00:00Z',
          direction: 'long',
          entry_price: 185.0,
          exit_price: null,
          quantity: 5,
          pnl: null,
          pnl_percent: null,
          emotion_at_entry: 'neutral',
          emotion_at_exit: null,
          notes: '',
          lessons_learned: null,
          thesis_id: null,
          screenshot_urls: [],
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T09:00:00Z',
        },
      ]);

      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'PUT',
        body: {
          id: otherEntryId,
          notes: 'Trying to hack',
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(404);
      expect(data.message).toBe('Entry not found or access denied');
    });

    it('returns 400 for invalid entry ID format', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'PUT',
        body: {
          id: 'not-a-uuid',
          notes: 'Test',
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('recalculates P&L when prices updated', async () => {
      const request = createRequest('http://localhost:3000/api/journal', {
        method: 'PUT',
        body: {
          id: validEntryId,
          exitPrice: 460.0, // Update exit price
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<JournalEntryResponse>(response);

      expect(response.status).toBe(200);
      expect(data.entry.pnl).toBe(100); // (460 - 450) * 10
      expect(data.entry.pnlPercent).toBeCloseTo(2.22, 1);
    });
  });

  describe('DELETE - Remove Entry', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
      seedData('journal_entries', [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: mockUser.id,
          symbol: 'SPY',
          trade_date: '2024-01-15T10:00:00Z',
          direction: 'long',
          entry_price: 450.0,
          exit_price: null,
          quantity: 10,
          pnl: null,
          pnl_percent: null,
          emotion_at_entry: 'confident',
          emotion_at_exit: null,
          notes: '',
          lessons_learned: null,
          thesis_id: null,
          screenshot_urls: [],
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T09:00:00Z',
        },
      ]);
    });

    it('deletes entry owned by user', async () => {
      const request = createRequest(
        'http://localhost:3000/api/journal?id=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await DELETE(request);
      const data = await parseResponse<{ success: boolean }>(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 404 for non-existent entry', async () => {
      const request = createRequest(
        'http://localhost:3000/api/journal?id=550e8400-e29b-41d4-a716-446655440001'
      );
      const response = await DELETE(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
    });

    it('returns 404 when trying to delete another user entry', async () => {
      seedData('journal_entries', [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          user_id: 'other-user-456',
          symbol: 'AAPL',
          trade_date: '2024-01-15T10:00:00Z',
          direction: 'long',
          entry_price: 185.0,
          exit_price: null,
          quantity: 5,
          pnl: null,
          pnl_percent: null,
          emotion_at_entry: 'neutral',
          emotion_at_exit: null,
          notes: '',
          lessons_learned: null,
          thesis_id: null,
          screenshot_urls: [],
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T09:00:00Z',
        },
      ]);

      const request = createRequest(
        'http://localhost:3000/api/journal?id=550e8400-e29b-41d4-a716-446655440002'
      );
      const response = await DELETE(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(404);
      expect(data.message).toBe('Entry not found or access denied');
    });

    it('returns 400 for missing ID parameter', async () => {
      const request = createRequest('http://localhost:3000/api/journal');
      const response = await DELETE(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid UUID format', async () => {
      const request = createRequest('http://localhost:3000/api/journal?id=not-a-uuid');
      const response = await DELETE(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.message).toBe('Valid entry ID is required');
    });
  });
});
