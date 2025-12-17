/**
 * Simple in-memory cache with TTL support for server-side caching
 *
 * Used to reduce load on external APIs (Alpaca, Yahoo Finance, etc.)
 * by caching market data responses for short periods.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every 60 seconds
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Get a cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in the cache with a TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttlSeconds * 1000),
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval (for testing/shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance for server-side caching
export const serverCache = new MemoryCache();

/**
 * Cache TTL constants (in seconds)
 *
 * These are tuned for a trading application:
 * - Quotes: Short TTL since prices change frequently
 * - Bars: Longer TTL since historical data doesn't change
 * - Assets: Longest TTL since asset lists rarely change
 */
export const CACHE_TTL = {
  /** Real-time quote data - 30 seconds (aligns with StreamingTicker refresh) */
  QUOTES: 30,
  /** Historical bar data - 5 minutes */
  BARS: 300,
  /** Asset/symbol lists - 1 hour */
  ASSETS: 3600,
  /** News data - 2 minutes */
  NEWS: 120,
  /** Options chains - 30 seconds */
  OPTIONS: 30,
} as const;

/**
 * Generate a cache key for market data requests
 */
export function marketCacheKey(
  type: 'quote' | 'bars' | 'assets' | 'news' | 'options',
  params: Record<string, string | number | undefined>
): string {
  const sortedParams = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  return `${type}:${sortedParams}`;
}

/**
 * Wrapper function for cached fetches
 * Returns cached data if available, otherwise fetches and caches
 */
export async function cachedFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  // Check cache first
  const cached = serverCache.get<T>(key);
  if (cached !== null) {
    return { data: cached, cached: true };
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  serverCache.set(key, data, ttlSeconds);

  return { data, cached: false };
}
