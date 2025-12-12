/**
 * DeepStack Embeddings Module
 *
 * Provides vector embedding generation and management for RAG system.
 *
 * @module embeddings
 */

// Types
export type {
  SourceType,
  EmbeddingRow,
  SearchResult,
  SearchOptions,
  RAGContext,
} from './types';

// Ollama client
export {
  ollamaClient,
  OllamaEmbeddingClient,
  type OllamaConfig,
  type OllamaEmbedResponse,
  type OllamaTagsResponse,
} from './ollama-client';

// Embedding service
export {
  upsertEmbedding,
  deleteEmbedding,
  checkOllamaHealth,
  buildJournalEmbeddingText,
  buildThesisEmbeddingText,
  buildMessageEmbeddingText,
  buildPatternEmbeddingText,
  type EmbedContentInput,
  type JournalEntryContent,
  type ThesisContent,
  type MessageContent,
  type PatternInsightContent,
} from './embedding-service';

// Retrieval service
export {
  semanticSearch,
  keywordSearch,
  hybridSearch,
  deduplicateResults,
} from './retrieval-service';

// Context builder
export {
  buildRAGContext,
} from './context-builder';
