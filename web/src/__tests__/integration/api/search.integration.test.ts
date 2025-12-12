/**
 * Integration Tests: /api/search
 *
 * Tests the search API route with Supabase authentication and RAG retrieval service mocking.
 * Verifies: auth protection, semantic search, hybrid search, validation, error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/search/route';
import { createRequest, parseResponse } from '../test-utils';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => {
    const { createMockSupabaseClient } = await import('../../mocks/supabase-client');
    return createMockSupabaseClient();
  }),
}));

// Mock retrieval service functions
vi.mock('@/lib/embeddings/retrieval-service', () => ({
  semanticSearch: vi.fn(async () => []),
  hybridSearch: vi.fn(async () => []),
}));

import { setAuthState, clearData, mockUser } from '../../mocks/supabase-client';
import { semanticSearch, hybridSearch } from '@/lib/embeddings/retrieval-service';
import type { SearchResult } from '@/lib/embeddings/types';

// Response type definitions
interface SearchResponse {
  results: SearchResult[];
  count: number;
  mode: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

// Mock search result factory
function createMockSearchResult(overrides?: Partial<SearchResult>): SearchResult {
  return {
    id: `result-${Math.random().toString(36).slice(2)}`,
    sourceType: 'journal_entry',
    sourceId: `source-${Math.random().toString(36).slice(2)}`,
    contentText: 'Mock search result content',
    symbol: 'AAPL',
    metadata: {},
    similarity: 0.85,
    ...overrides,
  };
}

describe('/api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearData();
  });

  describe('Authentication', () => {
    it('returns 401 when not authenticated for POST', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test query',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Authentication required');
    });

    it('does not call search functions when not authenticated', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test query',
        },
      });
      await POST(request);

      expect(semanticSearch).not.toHaveBeenCalled();
      expect(hybridSearch).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/search - Semantic Search', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    it('performs semantic search with valid query', async () => {
      const mockResults = [
        createMockSearchResult({ contentText: 'Result 1', similarity: 0.9 }),
        createMockSearchResult({ contentText: 'Result 2', similarity: 0.8 }),
      ];
      vi.mocked(semanticSearch).mockResolvedValueOnce(mockResults);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'my best trades',
          mode: 'semantic',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<SearchResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.mode).toBe('semantic');
      expect(semanticSearch).toHaveBeenCalledWith(
        mockUser.id,
        'my best trades',
        expect.objectContaining({
          limit: 10,
          threshold: 0.7,
        })
      );
    });

    it('uses default values for optional parameters', async () => {
      vi.mocked(semanticSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          mode: 'semantic',
        },
      });
      await POST(request);

      expect(semanticSearch).toHaveBeenCalledWith(
        mockUser.id,
        'test',
        expect.objectContaining({
          limit: 10, // Default
          threshold: 0.7, // Default
        })
      );
    });

    it('accepts custom limit parameter', async () => {
      vi.mocked(semanticSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          mode: 'semantic',
          limit: 5,
        },
      });
      await POST(request);

      expect(semanticSearch).toHaveBeenCalledWith(
        mockUser.id,
        'test',
        expect.objectContaining({
          limit: 5,
        })
      );
    });

    it('accepts custom threshold parameter', async () => {
      vi.mocked(semanticSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          mode: 'semantic',
          threshold: 0.9,
        },
      });
      await POST(request);

      expect(semanticSearch).toHaveBeenCalledWith(
        mockUser.id,
        'test',
        expect.objectContaining({
          threshold: 0.9,
        })
      );
    });

    it('accepts sourceTypes filter', async () => {
      vi.mocked(semanticSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          mode: 'semantic',
          sourceTypes: ['thesis', 'journal_entry'],
        },
      });
      await POST(request);

      expect(semanticSearch).toHaveBeenCalledWith(
        mockUser.id,
        'test',
        expect.objectContaining({
          sourceTypes: ['thesis', 'journal_entry'],
        })
      );
    });

    it('accepts symbol filter', async () => {
      vi.mocked(semanticSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'analysis',
          mode: 'semantic',
          symbol: 'AAPL',
        },
      });
      await POST(request);

      expect(semanticSearch).toHaveBeenCalledWith(
        mockUser.id,
        'analysis',
        expect.objectContaining({
          symbol: 'AAPL',
        })
      );
    });

    it('returns empty results when no matches found', async () => {
      vi.mocked(semanticSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'nonexistent query',
          mode: 'semantic',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<SearchResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
      expect(data.count).toBe(0);
    });
  });

  describe('POST /api/search - Hybrid Search', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    it('performs hybrid search with valid query', async () => {
      const mockResults = [
        createMockSearchResult({ contentText: 'Hybrid Result 1', similarity: 0.88 }),
        createMockSearchResult({ contentText: 'Hybrid Result 2', similarity: 0.75 }),
        createMockSearchResult({ contentText: 'Hybrid Result 3', similarity: 0.65 }),
      ];
      vi.mocked(hybridSearch).mockResolvedValueOnce(mockResults);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'AAPL thesis',
          mode: 'hybrid',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<SearchResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(3);
      expect(data.count).toBe(3);
      expect(data.mode).toBe('hybrid');
      expect(hybridSearch).toHaveBeenCalledWith(
        mockUser.id,
        'AAPL thesis',
        expect.objectContaining({
          limit: 10,
          threshold: 0.7,
        })
      );
    });

    it('uses hybrid mode by default when mode not specified', async () => {
      vi.mocked(hybridSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'default mode test',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<SearchResponse>(response);

      expect(response.status).toBe(200);
      expect(data.mode).toBe('hybrid');
      expect(hybridSearch).toHaveBeenCalled();
      expect(semanticSearch).not.toHaveBeenCalled();
    });

    it('passes all filter options to hybrid search', async () => {
      vi.mocked(hybridSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'comprehensive search',
          mode: 'hybrid',
          limit: 20,
          threshold: 0.8,
          sourceTypes: ['thesis', 'message'],
          symbol: 'TSLA',
        },
      });
      await POST(request);

      expect(hybridSearch).toHaveBeenCalledWith(
        mockUser.id,
        'comprehensive search',
        expect.objectContaining({
          limit: 20,
          threshold: 0.8,
          sourceTypes: ['thesis', 'message'],
          symbol: 'TSLA',
        })
      );
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    it('returns 400 when query is missing', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          mode: 'semantic',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.message).toBe('Invalid request data');
    });

    it('returns 400 when query is empty string', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: '',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid mode', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          mode: 'invalid_mode',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid limit (negative)', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          limit: -5,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid limit (zero)', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          limit: 0,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid limit (exceeds max)', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          limit: 51, // Max is 50
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid threshold (below 0)', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          threshold: -0.1,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid threshold (above 1)', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          threshold: 1.5,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for invalid sourceType', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          sourceTypes: ['invalid_type', 'thesis'],
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for symbol exceeding max length', async () => {
      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          symbol: 'TOOLONGSYMBOL', // Max is 10 chars
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('accepts valid symbol within length limit', async () => {
      vi.mocked(hybridSearch).mockResolvedValueOnce([]);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          symbol: 'AAPL', // Valid
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('returns 400 for malformed JSON body', async () => {
      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json}',
      }) as any;

      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
      expect(data.message).toBe('Failed to parse request body');
    });
  });

  describe('GET /api/search - Method Not Allowed', () => {
    it('returns 405 for GET requests', async () => {
      const request = createRequest('http://localhost:3000/api/search');
      const response = await GET(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
      expect(data.message).toBe('Use POST to perform searches');
    });

    it('does not require authentication for GET', async () => {
      setAuthState({ authenticated: false });
      const request = createRequest('http://localhost:3000/api/search');
      const response = await GET(request);

      expect(response.status).toBe(405);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    it('returns 500 when semantic search throws error', async () => {
      vi.mocked(semanticSearch).mockRejectedValueOnce(new Error('Database connection failed'));

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          mode: 'semantic',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Search failed');
    });

    it('returns 500 when hybrid search throws error', async () => {
      vi.mocked(hybridSearch).mockRejectedValueOnce(new Error('Embedding service unavailable'));

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          mode: 'hybrid',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Search failed');
    });

    it('logs error details server-side', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(hybridSearch).mockRejectedValueOnce(new Error('Test error'));

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
        },
      });
      await POST(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Search API error:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it('does not expose internal error details to client', async () => {
      vi.mocked(semanticSearch).mockRejectedValueOnce(
        new Error('Internal database connection at /app/db/client.ts:123 failed')
      );

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'test',
          mode: 'semantic',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(data.message).toBe('Search failed');
      expect(data.message).not.toContain('client.ts');
      expect(data.message).not.toContain('database connection');
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      setAuthState({ authenticated: true });
    });

    it('handles search with all valid parameters', async () => {
      const mockResults = [
        createMockSearchResult({
          sourceType: 'thesis',
          symbol: 'NVDA',
          contentText: 'NVDA AI thesis content',
          similarity: 0.92,
        }),
      ];
      vi.mocked(hybridSearch).mockResolvedValueOnce(mockResults);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'NVDA AI growth potential',
          mode: 'hybrid',
          limit: 15,
          threshold: 0.75,
          sourceTypes: ['thesis', 'message'],
          symbol: 'NVDA',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<SearchResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].symbol).toBe('NVDA');
      expect(data.results[0].sourceType).toBe('thesis');
      expect(hybridSearch).toHaveBeenCalledWith(
        mockUser.id,
        'NVDA AI growth potential',
        expect.objectContaining({
          limit: 15,
          threshold: 0.75,
          sourceTypes: ['thesis', 'message'],
          symbol: 'NVDA',
        })
      );
    });

    it('handles searches for different source types', async () => {
      const mockResults = [
        createMockSearchResult({ sourceType: 'journal_entry' }),
        createMockSearchResult({ sourceType: 'thesis' }),
        createMockSearchResult({ sourceType: 'message' }),
        createMockSearchResult({ sourceType: 'pattern_insight' }),
      ];
      vi.mocked(semanticSearch).mockResolvedValueOnce(mockResults);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'trading patterns',
          mode: 'semantic',
          sourceTypes: ['journal_entry', 'thesis', 'message', 'pattern_insight'],
        },
      });
      const response = await POST(request);
      const data = await parseResponse<SearchResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(4);
      const sourceTypes = data.results.map((r) => r.sourceType);
      expect(sourceTypes).toContain('journal_entry');
      expect(sourceTypes).toContain('thesis');
      expect(sourceTypes).toContain('message');
      expect(sourceTypes).toContain('pattern_insight');
    });

    it('handles large result sets with proper limits', async () => {
      const mockResults = Array.from({ length: 50 }, (_, i) =>
        createMockSearchResult({
          contentText: `Result ${i + 1}`,
          similarity: 0.9 - i * 0.01,
        })
      );
      vi.mocked(hybridSearch).mockResolvedValueOnce(mockResults);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'comprehensive search',
          limit: 50, // Max allowed
        },
      });
      const response = await POST(request);
      const data = await parseResponse<SearchResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(50);
      expect(data.count).toBe(50);
    });

    it('preserves result metadata and similarity scores', async () => {
      const mockResults = [
        createMockSearchResult({
          contentText: 'Trade analysis for AAPL',
          symbol: 'AAPL',
          similarity: 0.95,
          metadata: {
            tradeDate: '2024-01-15',
            direction: 'long',
            pnl: 1200,
          },
        }),
      ];
      vi.mocked(semanticSearch).mockResolvedValueOnce(mockResults);

      const request = createRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: {
          query: 'AAPL trades',
          mode: 'semantic',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<SearchResponse>(response);

      expect(response.status).toBe(200);
      expect(data.results[0].similarity).toBe(0.95);
      expect(data.results[0].metadata).toEqual({
        tradeDate: '2024-01-15',
        direction: 'long',
        pnl: 1200,
      });
    });
  });
});
