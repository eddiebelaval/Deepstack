/**
 * Tests for Retrieval Service
 *
 * Note: These are unit tests with mocked dependencies.
 * Integration tests should be run separately with a live Supabase instance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deduplicateResults } from '../retrieval-service';
import type { SearchResult } from '../types';

describe('Retrieval Service', () => {
  describe('deduplicateResults', () => {
    it('should remove duplicate source IDs, keeping highest similarity', () => {
      const results: SearchResult[] = [
        {
          id: '1',
          sourceType: 'journal_entry',
          sourceId: 'entry-1',
          contentText: 'First occurrence',
          symbol: 'AAPL',
          metadata: {},
          similarity: 0.8,
        },
        {
          id: '2',
          sourceType: 'journal_entry',
          sourceId: 'entry-1', // Duplicate
          contentText: 'Second occurrence',
          symbol: 'AAPL',
          metadata: {},
          similarity: 0.9, // Higher similarity
        },
        {
          id: '3',
          sourceType: 'thesis',
          sourceId: 'thesis-1',
          contentText: 'Thesis content',
          symbol: 'TSLA',
          metadata: {},
          similarity: 0.75,
        },
      ];

      const deduped = deduplicateResults(results);

      expect(deduped).toHaveLength(2);
      expect(deduped.find(r => r.sourceId === 'entry-1')?.similarity).toBe(0.9);
      expect(deduped.find(r => r.sourceId === 'thesis-1')).toBeDefined();
    });

    it('should handle empty results', () => {
      const results: SearchResult[] = [];
      const deduped = deduplicateResults(results);
      expect(deduped).toHaveLength(0);
    });

    it('should preserve all results when no duplicates', () => {
      const results: SearchResult[] = [
        {
          id: '1',
          sourceType: 'journal_entry',
          sourceId: 'entry-1',
          contentText: 'Entry 1',
          symbol: null,
          metadata: {},
          similarity: 0.8,
        },
        {
          id: '2',
          sourceType: 'thesis',
          sourceId: 'thesis-1',
          contentText: 'Thesis 1',
          symbol: null,
          metadata: {},
          similarity: 0.75,
        },
      ];

      const deduped = deduplicateResults(results);
      expect(deduped).toHaveLength(2);
    });
  });
});
