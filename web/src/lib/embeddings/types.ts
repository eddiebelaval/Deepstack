/**
 * DeepStack Embeddings Types
 *
 * Type definitions for the RAG (Retrieval-Augmented Generation) system.
 * These types match the database schema defined in 011_create_embeddings_table.sql
 */

/**
 * Source types that can be embedded for semantic search
 */
export type SourceType = 'journal_entry' | 'thesis' | 'message' | 'pattern_insight';

/**
 * Database row structure for embeddings table
 */
export interface EmbeddingRow {
  id: string;
  user_id: string;
  source_type: SourceType;
  source_id: string;
  content_text: string;
  content_hash: string;
  embedding: number[];
  symbol: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Result from semantic similarity search
 */
export interface SearchResult {
  id: string;
  sourceType: SourceType;
  sourceId: string;
  contentText: string;
  symbol: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
}

/**
 * Options for search functions
 */
export interface SearchOptions {
  /** Minimum similarity threshold (0-1), default 0.7 */
  threshold?: number;
  /** Maximum number of results, default 10 */
  limit?: number;
  /** Filter by specific source types */
  sourceTypes?: SourceType[];
  /** Filter by trading symbol */
  symbol?: string;
}

/**
 * RAG context for chat completions
 */
export interface RAGContext {
  /** Formatted context text for LLM prompt */
  contextText: string;
  /** Source references used in context */
  sources: Array<{
    type: SourceType;
    id: string;
    snippet: string;
    similarity: number;
  }>;
  /** Estimated token count */
  tokenEstimate: number;
}
