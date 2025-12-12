/**
 * Embedding Service
 *
 * Manages vector embeddings for DeepStack RAG system.
 * Handles content extraction, hashing, embedding generation, and storage in Supabase.
 *
 * Features:
 * - Content change detection via SHA-256 hashing
 * - Automatic re-embedding when content changes
 * - Support for multiple source types (journal entries, theses, messages, patterns)
 * - Batch embedding support
 *
 * @example
 * ```typescript
 * import { upsertEmbedding, deleteEmbedding } from '@/lib/embeddings/embedding-service';
 *
 * // Create or update embedding for a journal entry
 * await upsertEmbedding(userId, {
 *   sourceType: 'journal_entry',
 *   sourceId: entryId,
 *   content: {
 *     symbol: 'AAPL',
 *     direction: 'long',
 *     notes: 'Strong breakout above resistance...',
 *     lessonsLearned: 'Waited for confirmation',
 *   }
 * });
 *
 * // Delete embedding
 * await deleteEmbedding(userId, 'journal_entry', entryId);
 * ```
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { getOpenAIEmbeddingClient } from './openai-client';
import type { SourceType, EmbeddingRow } from './types';

// ============================================
// TYPES
// ============================================

// Content input types for each source
export interface JournalEntryContent {
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  emotionAtEntry?: string;
  emotionAtExit?: string;
  notes?: string;
  lessonsLearned?: string;
  tradeDate?: string;
}

export interface ThesisContent {
  symbol: string;
  title: string;
  content: string;
  conviction?: string;
  tags?: string[];
}

export interface MessageContent {
  content: string;
  role: 'user' | 'assistant';
  context?: string;
}

export interface PatternInsightContent {
  pattern: string;
  insight: string;
  relatedSymbols?: string[];
  confidence?: number;
}

export type EmbedContentInput = {
  sourceType: 'journal_entry';
  sourceId: string;
  content: JournalEntryContent;
} | {
  sourceType: 'thesis';
  sourceId: string;
  content: ThesisContent;
} | {
  sourceType: 'message';
  sourceId: string;
  content: MessageContent;
} | {
  sourceType: 'pattern_insight';
  sourceId: string;
  content: PatternInsightContent;
};

// ============================================
// CONTENT BUILDERS
// ============================================

/**
 * Build embeddable text from journal entry content
 *
 * Combines symbol, direction, emotions, notes, and lessons into searchable text.
 */
export function buildJournalEmbeddingText(entry: JournalEntryContent): string {
  const parts: string[] = [];

  // Trading details
  parts.push(`Symbol: ${entry.symbol}`);
  parts.push(`Direction: ${entry.direction}`);
  parts.push(`Entry Price: $${entry.entryPrice}`);

  if (entry.exitPrice) {
    parts.push(`Exit Price: $${entry.exitPrice}`);
    const pnl = entry.direction === 'long'
      ? entry.exitPrice - entry.entryPrice
      : entry.entryPrice - entry.exitPrice;
    parts.push(`P/L: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}`);
  }

  if (entry.tradeDate) {
    parts.push(`Date: ${new Date(entry.tradeDate).toLocaleDateString()}`);
  }

  // Emotions
  if (entry.emotionAtEntry) {
    parts.push(`Emotion at entry: ${entry.emotionAtEntry}`);
  }

  if (entry.emotionAtExit) {
    parts.push(`Emotion at exit: ${entry.emotionAtExit}`);
  }

  // Notes and lessons (most important for semantic search)
  if (entry.notes) {
    parts.push(`\nNotes: ${entry.notes}`);
  }

  if (entry.lessonsLearned) {
    parts.push(`\nLessons: ${entry.lessonsLearned}`);
  }

  return parts.join('\n');
}

/**
 * Build embeddable text from thesis content
 */
export function buildThesisEmbeddingText(thesis: ThesisContent): string {
  const parts: string[] = [];

  parts.push(`Symbol: ${thesis.symbol}`);
  parts.push(`Title: ${thesis.title}`);

  if (thesis.conviction) {
    parts.push(`Conviction: ${thesis.conviction}`);
  }

  if (thesis.tags && thesis.tags.length > 0) {
    parts.push(`Tags: ${thesis.tags.join(', ')}`);
  }

  parts.push(`\nThesis:\n${thesis.content}`);

  return parts.join('\n');
}

/**
 * Build embeddable text from message content
 */
export function buildMessageEmbeddingText(message: MessageContent): string {
  const parts: string[] = [];

  parts.push(`Role: ${message.role}`);

  if (message.context) {
    parts.push(`Context: ${message.context}`);
  }

  parts.push(`\nMessage:\n${message.content}`);

  return parts.join('\n');
}

/**
 * Build embeddable text from pattern insight content
 */
export function buildPatternEmbeddingText(pattern: PatternInsightContent): string {
  const parts: string[] = [];

  parts.push(`Pattern: ${pattern.pattern}`);

  if (pattern.confidence !== undefined) {
    parts.push(`Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
  }

  if (pattern.relatedSymbols && pattern.relatedSymbols.length > 0) {
    parts.push(`Symbols: ${pattern.relatedSymbols.join(', ')}`);
  }

  parts.push(`\nInsight:\n${pattern.insight}`);

  return parts.join('\n');
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate SHA-256 hash of content for change detection
 *
 * Uses Web Crypto API (available in Node 18+)
 */
async function hashContent(content: string): Promise<string> {
  // Use Node.js crypto in server context
  if (typeof window === 'undefined') {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Use Web Crypto API in browser context
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Format embedding array for pgvector storage
 *
 * Converts number[] to pgvector string format: "[1,2,3,...]"
 */
function formatEmbeddingForPgVector(embedding: number[]): string {
  return `[${embedding.join(',').trim()}]`;
}

/**
 * Extract symbol from content if available
 */
function extractSymbol(input: EmbedContentInput): string | undefined {
  if (input.sourceType === 'journal_entry') {
    return input.content.symbol;
  }
  if (input.sourceType === 'thesis') {
    return input.content.symbol;
  }
  if (input.sourceType === 'pattern_insight' && input.content.relatedSymbols) {
    return input.content.relatedSymbols[0];
  }
  return undefined;
}

/**
 * Build metadata object for embedding record
 */
function buildMetadata(input: EmbedContentInput): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  if (input.sourceType === 'journal_entry') {
    metadata.direction = input.content.direction;
    metadata.emotionAtEntry = input.content.emotionAtEntry;
  }

  if (input.sourceType === 'thesis' && input.content.tags) {
    metadata.tags = input.content.tags;
  }

  if (input.sourceType === 'pattern_insight' && input.content.confidence !== undefined) {
    metadata.confidence = input.content.confidence;
  }

  if (input.sourceType === 'message') {
    metadata.role = input.content.role;
  }

  return metadata;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Create or update an embedding for content
 *
 * Detects if content has changed via hash comparison.
 * Only re-generates embedding if content changed.
 *
 * @param userId - User ID who owns the content
 * @param input - Content to embed
 * @returns Created/updated embedding record, or null if failed
 */
export async function upsertEmbedding(
  userId: string,
  input: EmbedContentInput
): Promise<EmbeddingRow | null> {
  try {
    const supabase = await createServerClient();

    // Build content text based on source type
    let contentText: string;
    switch (input.sourceType) {
      case 'journal_entry':
        contentText = buildJournalEmbeddingText(input.content);
        break;
      case 'thesis':
        contentText = buildThesisEmbeddingText(input.content);
        break;
      case 'message':
        contentText = buildMessageEmbeddingText(input.content);
        break;
      case 'pattern_insight':
        contentText = buildPatternEmbeddingText(input.content);
        break;
      default:
        throw new Error(`Unknown source type: ${(input as EmbedContentInput).sourceType}`);
    }

    // Generate content hash
    const contentHash = await hashContent(contentText);

    // Check if embedding exists and if content changed
    const { data: existing } = await supabase
      .from('embeddings')
      .select('id, content_hash')
      .eq('user_id', userId)
      .eq('source_type', input.sourceType)
      .eq('source_id', input.sourceId)
      .single();

    // If embedding exists and content hasn't changed, skip re-embedding
    if (existing && existing.content_hash === contentHash) {
      console.log(
        `Embedding unchanged for ${input.sourceType}:${input.sourceId}, skipping re-embed`
      );

      // Return existing record
      const { data } = await supabase
        .from('embeddings')
        .select('*')
        .eq('id', existing.id)
        .single();

      return data as EmbeddingRow;
    }

    // Generate embedding via OpenAI
    console.log(`Generating embedding for ${input.sourceType}:${input.sourceId}`);
    const embeddingClient = getOpenAIEmbeddingClient();
    const embeddingVector = await embeddingClient.embed(contentText);

    // Format for pgvector
    const embeddingString = formatEmbeddingForPgVector(embeddingVector);

    // Extract additional fields
    const symbol = extractSymbol(input);
    const metadata = buildMetadata(input);

    // Upsert embedding
    const { data, error } = await supabase
      .from('embeddings')
      .upsert(
        {
          user_id: userId,
          source_type: input.sourceType,
          source_id: input.sourceId,
          content_text: contentText,
          content_hash: contentHash,
          embedding: embeddingString,
          symbol,
          metadata,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,source_type,source_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert embedding:', error);
      return null;
    }

    console.log(`Successfully embedded ${input.sourceType}:${input.sourceId}`);
    return data as EmbeddingRow;
  } catch (error) {
    console.error('Error in upsertEmbedding:', error);
    return null;
  }
}

/**
 * Delete an embedding
 *
 * @param userId - User ID who owns the embedding
 * @param sourceType - Type of source
 * @param sourceId - ID of source content
 */
export async function deleteEmbedding(
  userId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  try {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('embeddings')
      .delete()
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId);

    if (error) {
      console.error('Failed to delete embedding:', error);
      throw error;
    }

    console.log(`Deleted embedding for ${sourceType}:${sourceId}`);
  } catch (error) {
    console.error('Error in deleteEmbedding:', error);
    throw error;
  }
}

/**
 * Check if embedding service is available
 *
 * For OpenAI, this checks if the API key is configured.
 */
export function checkEmbeddingServiceHealth(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
