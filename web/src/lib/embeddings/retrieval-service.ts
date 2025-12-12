/**
 * DeepStack Retrieval Service
 *
 * Provides semantic search, keyword search, and hybrid search capabilities
 * for the RAG (Retrieval-Augmented Generation) system.
 *
 * @example
 * ```typescript
 * import { semanticSearch, hybridSearch } from '@/lib/embeddings/retrieval-service';
 *
 * // Semantic search
 * const results = await semanticSearch(userId, "What were my best trades?", {
 *   limit: 5,
 *   threshold: 0.75
 * });
 *
 * // Hybrid search (recommended)
 * const hybridResults = await hybridSearch(userId, "AAPL thesis", {
 *   symbol: "AAPL",
 *   sourceTypes: ["thesis", "journal_entry"]
 * });
 * ```
 */

import { createClient } from '@/lib/supabase/server';
import { ollamaClient } from './ollama-client';
import type { SearchResult, SearchOptions, SourceType } from './types';

/**
 * Performs semantic similarity search using vector embeddings
 *
 * @param userId - User ID to search within
 * @param query - Search query text
 * @param options - Search options (threshold, limit, filters)
 * @returns Array of search results with similarity scores
 */
export async function semanticSearch(
  userId: string,
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  try {
    const threshold = options?.threshold ?? 0.7;
    const limit = options?.limit ?? 10;
    const sourceTypes = options?.sourceTypes;
    const symbol = options?.symbol;

    // Generate embedding for the query
    const queryEmbedding = await ollamaClient.embed(query);

    // Call the match_embeddings RPC function
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_threshold: threshold,
      match_count: limit,
      filter_source_types: sourceTypes ?? null,
      filter_symbol: symbol ?? null,
    });

    if (error) {
      console.error('Semantic search error:', error);
      return [];
    }

    // Transform database results to SearchResult format
    return (data || []).map((row: {
      id: string;
      source_type: SourceType;
      source_id: string;
      content_text: string;
      symbol: string | null;
      metadata: Record<string, unknown>;
      similarity: number;
    }) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      contentText: row.content_text,
      symbol: row.symbol,
      metadata: row.metadata,
      similarity: row.similarity,
    }));
  } catch (error) {
    console.error('Semantic search failed:', error);
    return [];
  }
}

/**
 * Performs keyword search using PostgreSQL full-text search
 *
 * @param userId - User ID to search within
 * @param query - Search query text
 * @param options - Search options (limit, filters)
 * @returns Array of search results (similarity set to 0 for keyword matches)
 */
export async function keywordSearch(
  userId: string,
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  try {
    const limit = options?.limit ?? 10;
    const sourceTypes = options?.sourceTypes;
    const symbol = options?.symbol;

    const supabase = await createClient();

    // Build the query with filters
    let queryBuilder = supabase
      .from('embeddings')
      .select('id, source_type, source_id, content_text, symbol, metadata')
      .eq('user_id', userId)
      .textSearch('content_text', query, {
        type: 'websearch',
        config: 'english',
      })
      .limit(limit);

    // Apply optional filters
    if (sourceTypes && sourceTypes.length > 0) {
      queryBuilder = queryBuilder.in('source_type', sourceTypes);
    }

    if (symbol) {
      queryBuilder = queryBuilder.eq('symbol', symbol);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Keyword search error:', error);
      return [];
    }

    // Transform to SearchResult format (similarity = 0 for keyword search)
    return (data || []).map((row) => ({
      id: row.id,
      sourceType: row.source_type as SourceType,
      sourceId: row.source_id,
      contentText: row.content_text,
      symbol: row.symbol,
      metadata: row.metadata as Record<string, unknown>,
      similarity: 0, // Keyword search doesn't have similarity scores
    }));
  } catch (error) {
    console.error('Keyword search failed:', error);
    return [];
  }
}

/**
 * Performs hybrid search combining semantic and keyword search
 * Uses Reciprocal Rank Fusion (RRF) to merge results
 *
 * RRF formula: score = 1 / (k + rank), where k = 60
 *
 * @param userId - User ID to search within
 * @param query - Search query text
 * @param options - Search options (threshold, limit, filters)
 * @returns Array of merged and deduplicated search results
 */
export async function hybridSearch(
  userId: string,
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  try {
    const limit = options?.limit ?? 10;

    // Fetch more results from each method to improve fusion quality
    const fetchLimit = Math.max(limit * 2, 20);
    const extendedOptions = { ...options, limit: fetchLimit };

    // Run both searches in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      semanticSearch(userId, query, extendedOptions),
      keywordSearch(userId, query, extendedOptions),
    ]);

    // Apply Reciprocal Rank Fusion (RRF)
    const k = 60; // Standard RRF constant
    const rrfScores = new Map<string, {
      result: SearchResult;
      score: number;
    }>();

    // Process semantic results
    semanticResults.forEach((result, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      rrfScores.set(result.id, {
        result,
        score: rrfScore,
      });
    });

    // Process keyword results and merge scores
    keywordResults.forEach((result, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const existing = rrfScores.get(result.id);

      if (existing) {
        // Combine scores for items that appear in both results
        existing.score += rrfScore;
        // Keep the semantic similarity score if it exists
        if (existing.result.similarity > 0) {
          result.similarity = existing.result.similarity;
        }
      } else {
        rrfScores.set(result.id, {
          result,
          score: rrfScore,
        });
      }
    });

    // Sort by combined RRF score and return top results
    const sortedResults = Array.from(rrfScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ result }) => result);

    return sortedResults;
  } catch (error) {
    console.error('Hybrid search failed:', error);
    return [];
  }
}

/**
 * Deduplicate search results by source_id, keeping the highest similarity score
 *
 * @param results - Array of search results
 * @returns Deduplicated array of search results
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const deduped = new Map<string, SearchResult>();

  for (const result of results) {
    const existing = deduped.get(result.sourceId);

    if (!existing || result.similarity > existing.similarity) {
      deduped.set(result.sourceId, result);
    }
  }

  return Array.from(deduped.values());
}
