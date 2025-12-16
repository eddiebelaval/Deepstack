/**
 * Distributed Rate Limiting with Upstash Redis
 *
 * Provides consistent rate limiting across serverless instances using Upstash Redis.
 * Falls back to in-memory rate limiting when Upstash is not configured.
 *
 * Required environment variables:
 * - UPSTASH_REDIS_REST_URL: Your Upstash Redis REST URL
 * - UPSTASH_REDIS_REST_TOKEN: Your Upstash Redis REST token
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if Upstash is configured
const hasUpstashConfig: boolean = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// Initialize Redis client only if configured
const redis = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/**
 * Creates an Upstash rate limiter with sliding window algorithm.
 *
 * @param limit - Maximum requests allowed
 * @param window - Time window (e.g., '60 s', '1 m', '1 h')
 * @param prefix - Optional prefix for rate limit keys
 * @returns Ratelimit instance or null if Upstash is not configured
 */
export function createUpstashRateLimiter(
  limit: number,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`,
  prefix = 'ratelimit'
): Ratelimit | null {
  if (!redis) {
    // Log warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Rate Limit] Upstash not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed rate limiting.'
      );
    }
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix,
    analytics: true,
  });
}

/**
 * Check rate limit using Upstash.
 *
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param rateLimiter - Ratelimit instance from createUpstashRateLimiter
 * @returns Rate limit result or null if check failed
 */
export async function checkUpstashRateLimit(
  identifier: string,
  rateLimiter: Ratelimit | null
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} | null> {
  if (!rateLimiter) {
    return null;
  }

  try {
    const result = await rateLimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // Log error but don't fail - fall back to allowing the request
    console.error('[Rate Limit] Upstash error:', error);
    return null;
  }
}

/**
 * Pre-configured rate limiters for common use cases.
 */
export const rateLimiters = {
  // API endpoints: 100 requests per minute
  api: hasUpstashConfig ? createUpstashRateLimiter(100, '60 s', 'api') : null,

  // Chat endpoints: 20 requests per minute (more expensive)
  chat: hasUpstashConfig ? createUpstashRateLimiter(20, '60 s', 'chat') : null,

  // Auth endpoints: 10 requests per minute (prevent brute force)
  auth: hasUpstashConfig ? createUpstashRateLimiter(10, '60 s', 'auth') : null,

  // Strict endpoints: 5 requests per minute
  strict: hasUpstashConfig ? createUpstashRateLimiter(5, '60 s', 'strict') : null,
};

/**
 * Check if Upstash rate limiting is available.
 */
export function isUpstashEnabled(): boolean {
  return hasUpstashConfig;
}
