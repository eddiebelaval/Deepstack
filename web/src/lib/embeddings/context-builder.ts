/**
 * DeepStack RAG Context Builder
 *
 * Builds context for LLM chat completions by retrieving and formatting
 * relevant knowledge from the user's embeddings.
 *
 * @example
 * ```typescript
 * import { buildRAGContext } from '@/lib/embeddings/context-builder';
 *
 * const context = await buildRAGContext(userId, "What trades did I make on AAPL?", {
 *   maxTokens: 4000,
 *   symbol: "AAPL"
 * });
 *
 * // Use context.contextText in your LLM prompt
 * const prompt = `${context.contextText}\n\nUser question: ${query}`;
 * ```
 */

import { hybridSearch } from './retrieval-service';
import type { RAGContext, SearchOptions, SourceType } from './types';

/**
 * Default token budget for RAG context
 * Approximately 16,000 characters (4 chars per token)
 */
const DEFAULT_TOKEN_BUDGET = 4000;

/**
 * Maximum number of results to fetch before token filtering
 */
const MAX_RESULTS_TO_FETCH = 20;

/**
 * Estimate token count from character count
 * Rule of thumb: ~4 characters per token for English text
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format a source type as a human-readable label
 *
 * @param sourceType - Source type to format
 * @returns Human-readable label
 */
function formatSourceType(sourceType: SourceType): string {
  const labels: Record<SourceType, string> = {
    journal_entry: 'Journal Entry',
    thesis: 'Thesis',
    message: 'Chat Message',
    pattern_insight: 'Pattern Insight',
  };
  return labels[sourceType] || sourceType;
}

/**
 * Truncate text to a maximum token budget
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens allowed
 * @returns Truncated text
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }

  // Truncate and add ellipsis
  return text.substring(0, maxChars - 3) + '...';
}

/**
 * Build RAG context from user's knowledge base
 *
 * Retrieves relevant embeddings using hybrid search and formats them
 * into a context string suitable for LLM prompts.
 *
 * @param userId - User ID to search within
 * @param query - User's query or question
 * @param options - Context building options
 * @returns RAG context with formatted text, sources, and token estimate
 */
export async function buildRAGContext(
  userId: string,
  query: string,
  options?: {
    maxTokens?: number;
    sourceTypes?: SourceType[];
    symbol?: string;
    threshold?: number;
  }
): Promise<RAGContext> {
  const maxTokens = options?.maxTokens ?? DEFAULT_TOKEN_BUDGET;

  try {
    // Fetch relevant results using hybrid search
    const searchOptions: SearchOptions = {
      limit: MAX_RESULTS_TO_FETCH,
      threshold: options?.threshold ?? 0.7,
      sourceTypes: options?.sourceTypes,
      symbol: options?.symbol,
    };

    const results = await hybridSearch(userId, query, searchOptions);

    if (results.length === 0) {
      return {
        contextText: '',
        sources: [],
        tokenEstimate: 0,
      };
    }

    // Build context within token budget
    const contextParts: string[] = [];
    const sources: RAGContext['sources'] = [];
    let totalTokens = 0;

    // Add header
    const header = '# Relevant Context from Your Knowledge Base\n\n';
    contextParts.push(header);
    totalTokens += estimateTokens(header);

    // Add each result until we hit the token budget
    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      // Format the reference
      const refNumber = i + 1;
      const sourceLabel = formatSourceType(result.sourceType);
      const symbolInfo = result.symbol ? ` [${result.symbol}]` : '';
      const similarityPercent = Math.round(result.similarity * 100);

      const refHeader = `## Reference ${refNumber}: ${sourceLabel}${symbolInfo} (${similarityPercent}% match)\n\n`;
      const refContent = `${result.contentText}\n\n`;
      const refSeparator = '---\n\n';

      const fullRef = refHeader + refContent + refSeparator;
      const refTokens = estimateTokens(fullRef);

      // Check if adding this reference would exceed the budget
      if (totalTokens + refTokens > maxTokens) {
        // Try truncating the content
        const availableTokens = maxTokens - totalTokens - estimateTokens(refHeader + refSeparator);

        if (availableTokens > 100) {
          // If we have at least 100 tokens left, truncate and add
          const truncatedContent = truncateToTokens(result.contentText, availableTokens);
          const truncatedRef = refHeader + truncatedContent + '\n\n' + refSeparator;

          contextParts.push(truncatedRef);
          totalTokens += estimateTokens(truncatedRef);

          sources.push({
            type: result.sourceType,
            id: result.sourceId,
            snippet: truncatedContent.substring(0, 200) + '...',
            similarity: result.similarity,
          });
        }

        // Stop adding more references
        break;
      }

      // Add the full reference
      contextParts.push(fullRef);
      totalTokens += refTokens;

      sources.push({
        type: result.sourceType,
        id: result.sourceId,
        snippet: result.contentText.substring(0, 200) + (result.contentText.length > 200 ? '...' : ''),
        similarity: result.similarity,
      });
    }

    // Add footer note
    const footer = `_Retrieved ${sources.length} relevant ${sources.length === 1 ? 'item' : 'items'} from your knowledge base._\n\n`;
    contextParts.push(footer);
    totalTokens += estimateTokens(footer);

    return {
      contextText: contextParts.join(''),
      sources,
      tokenEstimate: totalTokens,
    };
  } catch (error) {
    console.error('Failed to build RAG context:', error);

    // Return empty context on error
    return {
      contextText: '',
      sources: [],
      tokenEstimate: 0,
    };
  }
}
