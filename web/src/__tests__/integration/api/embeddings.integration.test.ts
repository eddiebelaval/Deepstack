/**
 * Integration Tests: /api/embeddings
 *
 * Tests the embeddings API route with Supabase authentication and database mocking.
 * Verifies: auth protection, embedding generation, validation, health checks, error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/embeddings/route';
import { createRequest, parseResponse } from '../test-utils';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => {
    const { createMockSupabaseClient } = await import('../../mocks/supabase-client');
    return createMockSupabaseClient();
  }),
}));

// Mock embeddings library
vi.mock('@/lib/embeddings', async () => {
  const actual = await vi.importActual('@/lib/embeddings');
  return {
    ...actual,
    upsertEmbedding: vi.fn(),
    checkEmbeddingServiceHealth: vi.fn(),
  };
});

import { setAuthState, seedData, clearData, mockUser } from '../../mocks/supabase-client';
import { upsertEmbedding, checkEmbeddingServiceHealth } from '@/lib/embeddings';

interface EmbedResponse {
  success: boolean;
  embedded: boolean;
  message: string;
  error?: string;
}

interface HealthResponse {
  healthy: boolean;
  message: string;
  error?: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

describe('/api/embeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearData();
  });

  describe('Authentication', () => {
    it('returns 401 when not authenticated for GET', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/embeddings');
      const response = await GET();
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Authentication required');
    });

    it('returns 401 when not authenticated for POST', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/embeddings', {
        method: 'POST',
        body: {
          sourceType: 'journal_entry',
          sourceId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Authentication required');
    });
  });

  describe('GET - Health Check', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    it('returns healthy status when service is configured', async () => {
      vi.mocked(checkEmbeddingServiceHealth).mockReturnValue(true);

      const response = await GET();
      const data = await parseResponse<HealthResponse>(response);

      expect(response.status).toBe(200);
      expect(data.healthy).toBe(true);
      expect(data.message).toBe('Embedding service is healthy');
    });

    it('returns unhealthy status when API key not configured', async () => {
      vi.mocked(checkEmbeddingServiceHealth).mockReturnValue(false);

      const response = await GET();
      const data = await parseResponse<HealthResponse>(response);

      expect(response.status).toBe(200);
      expect(data.healthy).toBe(false);
      expect(data.message).toBe('OpenAI API key not configured');
    });

    it('returns 500 on unexpected error during health check', async () => {
      vi.mocked(checkEmbeddingServiceHealth).mockImplementation(() => {
        throw new Error('Service check failed');
      });

      const response = await GET();
      const data = await parseResponse<HealthResponse>(response);

      expect(response.status).toBe(500);
      expect(data.healthy).toBe(false);
      expect(data.message).toBe('Failed to check embedding service health');
      expect(data.error).toBe('Service check failed');
    });
  });

  describe('POST - Generate Embedding', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    describe('Validation', () => {
      it('returns 400 for missing sourceType', async () => {
        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceId: '550e8400-e29b-41d4-a716-446655440000',
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Invalid request data');
        expect(data.error).toBeDefined();
      });

      it('returns 400 for missing sourceId', async () => {
        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'journal_entry',
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Invalid request data');
      });

      it('returns 400 for invalid sourceType', async () => {
        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'invalid_type',
            sourceId: '550e8400-e29b-41d4-a716-446655440000',
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Invalid request data');
      });

      it('returns 400 for invalid UUID format', async () => {
        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'journal_entry',
            sourceId: 'not-a-uuid',
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Invalid request data');
      });
    });

    describe('Journal Entry Embedding', () => {
      const validJournalId = '550e8400-e29b-41d4-a716-446655440000';

      it('successfully generates embedding for journal entry', async () => {
        // Seed test journal entry
        seedData('journal_entries', [
          {
            id: validJournalId,
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
        ]);

        // Mock successful embedding generation
        vi.mocked(upsertEmbedding).mockResolvedValue({
          id: 'embedding-123',
          user_id: mockUser.id,
          source_type: 'journal_entry',
          source_id: validJournalId,
          content_text: 'Symbol: SPY\nDirection: long...',
          content_hash: 'abc123',
          embedding: [0.1, 0.2, 0.3],
          symbol: 'SPY',
          metadata: { direction: 'long', emotionAtEntry: 'confident' },
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        });

        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'journal_entry',
            sourceId: validJournalId,
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.embedded).toBe(true);
        expect(data.message).toContain('Successfully embedded journal_entry');

        // Verify upsertEmbedding was called with correct params
        expect(upsertEmbedding).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            sourceType: 'journal_entry',
            sourceId: validJournalId,
            content: expect.objectContaining({
              symbol: 'SPY',
              direction: 'long',
              entryPrice: 450.5,
              exitPrice: 455.0,
              emotionAtEntry: 'confident',
              emotionAtExit: 'satisfied',
              notes: 'Good entry timing',
              lessonsLearned: 'Trust the setup',
              tradeDate: '2024-01-15T10:00:00Z',
            }),
          })
        );
      });

      it('returns 404 when journal entry not found', async () => {
        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'journal_entry',
            sourceId: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID but doesn't exist
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Journal entry not found or access denied');
      });

      it('returns 404 when trying to embed another user journal entry', async () => {
        const otherEntryId = '550e8400-e29b-41d4-a716-446655440002';

        // Seed journal entry for different user
        seedData('journal_entries', [
          {
            id: otherEntryId,
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
            notes: 'Testing access control',
            lessons_learned: null,
            thesis_id: null,
            screenshot_urls: [],
            created_at: '2024-01-16T09:00:00Z',
            updated_at: '2024-01-16T09:00:00Z',
          },
        ]);

        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'journal_entry',
            sourceId: otherEntryId,
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Journal entry not found or access denied');

        // Ensure upsertEmbedding was never called
        expect(upsertEmbedding).not.toHaveBeenCalled();
      });
    });

    describe('Thesis Embedding', () => {
      const validThesisId = '550e8400-e29b-41d4-a716-446655440100';

      it('successfully generates embedding for thesis', async () => {
        // Seed test thesis
        seedData('theses', [
          {
            id: validThesisId,
            user_id: mockUser.id,
            symbol: 'NVDA',
            title: 'AI Chip Dominance',
            content: 'NVDA is positioned to dominate AI chip market with superior architecture...',
            conviction: 'high',
            tags: ['AI', 'semiconductors', 'growth'],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ]);

        // Mock successful embedding generation
        vi.mocked(upsertEmbedding).mockResolvedValue({
          id: 'embedding-456',
          user_id: mockUser.id,
          source_type: 'thesis',
          source_id: validThesisId,
          content_text: 'Symbol: NVDA\nTitle: AI Chip Dominance...',
          content_hash: 'def456',
          embedding: [0.4, 0.5, 0.6],
          symbol: 'NVDA',
          metadata: { tags: ['AI', 'semiconductors', 'growth'] },
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        });

        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'thesis',
            sourceId: validThesisId,
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.embedded).toBe(true);
        expect(data.message).toContain('Successfully embedded thesis');

        // Verify upsertEmbedding was called with correct params
        expect(upsertEmbedding).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            sourceType: 'thesis',
            sourceId: validThesisId,
            content: expect.objectContaining({
              symbol: 'NVDA',
              title: 'AI Chip Dominance',
              content: expect.stringContaining('NVDA is positioned to dominate'),
              conviction: 'high',
              tags: ['AI', 'semiconductors', 'growth'],
            }),
          })
        );
      });

      it('returns 404 when thesis not found', async () => {
        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'thesis',
            sourceId: '550e8400-e29b-41d4-a716-446655440101', // Valid UUID but doesn't exist
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Thesis not found or access denied');
      });

      it('returns 404 when trying to embed another user thesis', async () => {
        const otherThesisId = '550e8400-e29b-41d4-a716-446655440102';

        // Seed thesis for different user
        seedData('theses', [
          {
            id: otherThesisId,
            user_id: 'other-user-789',
            symbol: 'TSLA',
            title: 'EV Market Leader',
            content: 'Tesla dominates EV market...',
            conviction: 'medium',
            tags: ['EV', 'automotive'],
            created_at: '2024-01-16T10:00:00Z',
            updated_at: '2024-01-16T10:00:00Z',
          },
        ]);

        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'thesis',
            sourceId: otherThesisId,
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Thesis not found or access denied');

        // Ensure upsertEmbedding was never called
        expect(upsertEmbedding).not.toHaveBeenCalled();
      });
    });

    describe('Not Implemented Source Types', () => {
      it('returns 501 for message source type', async () => {
        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'message',
            sourceId: '550e8400-e29b-41d4-a716-446655440200',
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(501);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Embedding for message not yet implemented');
      });

      it('returns 501 for pattern_insight source type', async () => {
        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'pattern_insight',
            sourceId: '550e8400-e29b-41d4-a716-446655440300',
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(501);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Embedding for pattern_insight not yet implemented');
      });
    });

    describe('Embedding Generation Failures', () => {
      const validJournalId = '550e8400-e29b-41d4-a716-446655440000';

      beforeEach(() => {
        // Seed valid journal entry
        seedData('journal_entries', [
          {
            id: validJournalId,
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
            notes: 'Test notes',
            lessons_learned: null,
            thesis_id: null,
            screenshot_urls: [],
            created_at: '2024-01-15T09:00:00Z',
            updated_at: '2024-01-15T09:00:00Z',
          },
        ]);
      });

      it('returns 500 when upsertEmbedding returns null', async () => {
        // Mock embedding failure
        vi.mocked(upsertEmbedding).mockResolvedValue(null);

        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'journal_entry',
            sourceId: validJournalId,
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Failed to generate or store embedding');
      });

      it('returns 500 when upsertEmbedding throws error', async () => {
        // Mock embedding error
        vi.mocked(upsertEmbedding).mockRejectedValue(new Error('OpenAI API timeout'));

        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'journal_entry',
            sourceId: validJournalId,
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Internal server error');
        expect(data.error).toBe('OpenAI API timeout');
      });
    });

    describe('Edge Cases', () => {
      it('handles journal entry with minimal data', async () => {
        const minimalJournalId = '550e8400-e29b-41d4-a716-446655440400';

        // Seed minimal journal entry
        seedData('journal_entries', [
          {
            id: minimalJournalId,
            user_id: mockUser.id,
            symbol: 'SPY',
            trade_date: '2024-01-15T10:00:00Z',
            direction: 'long',
            entry_price: 450.0,
            exit_price: null,
            quantity: 10,
            pnl: null,
            pnl_percent: null,
            emotion_at_entry: 'neutral',
            emotion_at_exit: null,
            notes: null,
            lessons_learned: null,
            thesis_id: null,
            screenshot_urls: [],
            created_at: '2024-01-15T09:00:00Z',
            updated_at: '2024-01-15T09:00:00Z',
          },
        ]);

        vi.mocked(upsertEmbedding).mockResolvedValue({
          id: 'embedding-minimal',
          user_id: mockUser.id,
          source_type: 'journal_entry',
          source_id: minimalJournalId,
          content_text: 'Symbol: SPY\nDirection: long...',
          content_hash: 'minimal123',
          embedding: [0.1, 0.2, 0.3],
          symbol: 'SPY',
          metadata: {},
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        });

        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'journal_entry',
            sourceId: minimalJournalId,
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.embedded).toBe(true);

        // Verify function was called even with minimal data
        expect(upsertEmbedding).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            sourceType: 'journal_entry',
            sourceId: minimalJournalId,
          })
        );
      });

      it('handles thesis with all optional fields populated', async () => {
        const fullThesisId = '550e8400-e29b-41d4-a716-446655440500';

        // Seed full thesis
        seedData('theses', [
          {
            id: fullThesisId,
            user_id: mockUser.id,
            symbol: 'AAPL',
            title: 'Apple Services Growth',
            content: 'Detailed analysis of Apple services revenue stream and growth potential...',
            conviction: 'very high',
            tags: ['tech', 'services', 'subscription', 'moat'],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ]);

        vi.mocked(upsertEmbedding).mockResolvedValue({
          id: 'embedding-full',
          user_id: mockUser.id,
          source_type: 'thesis',
          source_id: fullThesisId,
          content_text: 'Symbol: AAPL\nTitle: Apple Services Growth...',
          content_hash: 'full789',
          embedding: [0.7, 0.8, 0.9],
          symbol: 'AAPL',
          metadata: { tags: ['tech', 'services', 'subscription', 'moat'] },
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        });

        const request = createRequest('http://localhost:3000/api/embeddings', {
          method: 'POST',
          body: {
            sourceType: 'thesis',
            sourceId: fullThesisId,
          },
        });
        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.embedded).toBe(true);

        // Verify all fields were passed
        expect(upsertEmbedding).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            sourceType: 'thesis',
            sourceId: fullThesisId,
            content: expect.objectContaining({
              conviction: 'very high',
              tags: expect.arrayContaining(['tech', 'services', 'subscription', 'moat']),
            }),
          })
        );
      });

      it('handles malformed JSON request body', async () => {
        // Create request with invalid JSON
        const request = new Request('http://localhost:3000/api/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid-json{',
        }) as any;

        const response = await POST(request);
        const data = await parseResponse<EmbedResponse>(response);

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.embedded).toBe(false);
        expect(data.message).toBe('Internal server error');
      });
    });
  });
});
