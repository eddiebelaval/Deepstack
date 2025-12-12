/**
 * Ollama Embedding Client
 *
 * Provides interface to Ollama's embedding API for generating vector embeddings.
 * Uses nomic-embed-text model (768 dimensions) by default.
 *
 * @example
 * ```typescript
 * import { ollamaClient } from '@/lib/embeddings/ollama-client';
 *
 * // Single embedding
 * const embedding = await ollamaClient.embed("Trading thesis: Bullish on tech");
 *
 * // Batch embedding
 * const embeddings = await ollamaClient.embedBatch([
 *   "First text",
 *   "Second text"
 * ]);
 *
 * // Health check
 * const isHealthy = await ollamaClient.healthCheck();
 * ```
 */

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
}

export interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

export class OllamaEmbeddingClient {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: config?.model || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
    };

    // Ensure baseUrl doesn't have trailing slash
    this.config.baseUrl = this.config.baseUrl.replace(/\/$/, '');
  }

  /**
   * Generate embedding for a single text string
   *
   * @param text - Text to embed
   * @returns 768-dimensional embedding vector
   * @throws Error if Ollama API call fails
   */
  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot embed empty text');
    }

    const response = await fetch(`${this.config.baseUrl}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama embedding failed (${response.status}): ${errorText}`
      );
    }

    const data: OllamaEmbedResponse = await response.json();

    if (!data.embeddings || data.embeddings.length === 0) {
      throw new Error('Ollama returned empty embeddings');
    }

    return data.embeddings[0];
  }

  /**
   * Generate embeddings for multiple text strings in a single request
   *
   * @param texts - Array of texts to embed
   * @returns Array of 768-dimensional embedding vectors
   * @throws Error if Ollama API call fails
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

    const response = await fetch(`${this.config.baseUrl}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        input: validTexts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama batch embedding failed (${response.status}): ${errorText}`
      );
    }

    const data: OllamaEmbedResponse = await response.json();

    if (!data.embeddings || data.embeddings.length !== validTexts.length) {
      throw new Error(
        `Ollama returned unexpected number of embeddings: expected ${validTexts.length}, got ${data.embeddings?.length || 0}`
      );
    }

    return data.embeddings;
  }

  /**
   * Check if Ollama server is running and the embedding model is available
   *
   * @returns true if Ollama is healthy and model exists
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.warn(`Ollama health check failed: ${response.status}`);
        return false;
      }

      const data: OllamaTagsResponse = await response.json();

      // Check if the embedding model is available
      const modelExists = data.models.some((m) =>
        m.name.includes(this.config.model)
      );

      if (!modelExists) {
        console.warn(
          `Embedding model "${this.config.model}" not found in Ollama. Available models:`,
          data.models.map((m) => m.name)
        );
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Ollama health check error:', error);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }
}

// Default singleton instance
export const ollamaClient = new OllamaEmbeddingClient();
