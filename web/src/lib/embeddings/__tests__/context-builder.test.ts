/**
 * Tests for RAG Context Builder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RAGContext } from '../types';

// Mock the retrieval service
vi.mock('../retrieval-service', () => ({
  hybridSearch: vi.fn(),
}));

describe('Context Builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildRAGContext', () => {
    it('should return empty context when no results found', async () => {
      const { buildRAGContext } = await import('../context-builder');
      const { hybridSearch } = await import('../retrieval-service');

      vi.mocked(hybridSearch).mockResolvedValue([]);

      const context = await buildRAGContext('user-123', 'test query');

      expect(context.contextText).toBe('');
      expect(context.sources).toHaveLength(0);
      expect(context.tokenEstimate).toBe(0);
    });

    it('should format context with results within token budget', async () => {
      const { buildRAGContext } = await import('../context-builder');
      const { hybridSearch } = await import('../retrieval-service');

      vi.mocked(hybridSearch).mockResolvedValue([
        {
          id: '1',
          sourceType: 'journal_entry',
          sourceId: 'entry-1',
          contentText: 'Made a great trade on AAPL today.',
          symbol: 'AAPL',
          metadata: {},
          similarity: 0.85,
        },
        {
          id: '2',
          sourceType: 'thesis',
          sourceId: 'thesis-1',
          contentText: 'Tech sector looking strong with AI boom.',
          symbol: null,
          metadata: {},
          similarity: 0.75,
        },
      ]);

      const context = await buildRAGContext('user-123', 'AAPL trades', {
        maxTokens: 4000,
      });

      expect(context.contextText).toContain('# Relevant Context from Your Knowledge Base');
      expect(context.contextText).toContain('Reference 1: Journal Entry [AAPL]');
      expect(context.contextText).toContain('Reference 2: Thesis');
      expect(context.contextText).toContain('85% match');
      expect(context.contextText).toContain('75% match');
      expect(context.sources).toHaveLength(2);
      expect(context.tokenEstimate).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const { buildRAGContext } = await import('../context-builder');
      const { hybridSearch } = await import('../retrieval-service');

      vi.mocked(hybridSearch).mockRejectedValue(new Error('Search failed'));

      const context = await buildRAGContext('user-123', 'test query');

      expect(context.contextText).toBe('');
      expect(context.sources).toHaveLength(0);
      expect(context.tokenEstimate).toBe(0);
    });
  });
});
