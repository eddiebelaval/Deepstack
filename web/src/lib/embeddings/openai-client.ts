/**
 * OpenAI Embedding Client
 *
 * Provides interface to OpenAI's embedding API for generating vector embeddings.
 * Uses text-embedding-3-small model (1536 dimensions) by default.
 *
 * @example
 * ```typescript
 * import { openaiEmbeddingClient } from '@/lib/embeddings/openai-client';
 *
 * // Single embedding
 * const embedding = await openaiEmbeddingClient.embed("Trading thesis: Bullish on tech");
 *
 * // Batch embedding
 * const embeddings = await openaiEmbeddingClient.embedBatch([
 *   "First text",
 *   "Second text"
 * ]);
 * ```
 */

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model: string;
  dimensions: number;
}

export interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIEmbeddingClient {
  private config: OpenAIEmbeddingConfig;

  constructor(config?: Partial<OpenAIEmbeddingConfig>) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for embeddings');
    }

    this.config = {
      apiKey,
      model: config?.model || 'text-embedding-3-small',
      dimensions: config?.dimensions || 1536,
    };
  }

  /**
   * Generate embedding for a single text string
   *
   * @param text - Text to embed
   * @returns 1536-dimensional embedding vector
   * @throws Error if OpenAI API call fails
   */
  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot embed empty text');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
        dimensions: this.config.dimensions,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI embedding failed (${response.status}): ${errorData.error?.message || response.statusText}`
      );
    }

    const data: OpenAIEmbeddingResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('OpenAI returned empty embeddings');
    }

    return data.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple text strings in a single request
   * OpenAI supports up to 2048 inputs per request
   *
   * @param texts - Array of texts to embed
   * @returns Array of 1536-dimensional embedding vectors
   * @throws Error if OpenAI API call fails
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter out empty strings
    const validTexts = texts.filter((t) => t && t.trim().length > 0);

    if (validTexts.length === 0) {
      throw new Error('Cannot embed batch: all texts are empty');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: validTexts,
        dimensions: this.config.dimensions,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI batch embedding failed (${response.status}): ${errorData.error?.message || response.statusText}`
      );
    }

    const data: OpenAIEmbeddingResponse = await response.json();

    if (!data.data || data.data.length !== validTexts.length) {
      throw new Error(
        `OpenAI returned unexpected number of embeddings: expected ${validTexts.length}, got ${data.data?.length || 0}`
      );
    }

    // Sort by index to ensure correct order
    return data.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  /**
   * Get current configuration (without API key)
   */
  getConfig(): Omit<OpenAIEmbeddingConfig, 'apiKey'> {
    return {
      model: this.config.model,
      dimensions: this.config.dimensions,
    };
  }

  /**
   * Get the embedding dimensions
   */
  getDimensions(): number {
    return this.config.dimensions;
  }
}

// Default singleton instance - lazy initialization to avoid missing env var errors at import time
let _instance: OpenAIEmbeddingClient | null = null;

export function getOpenAIEmbeddingClient(): OpenAIEmbeddingClient {
  if (!_instance) {
    _instance = new OpenAIEmbeddingClient();
  }
  return _instance;
}

// Export for direct instantiation if needed
export { OpenAIEmbeddingClient as default };
