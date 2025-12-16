import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, checkUpstashRateLimit, isUpstashEnabled } from './rate-limit-upstash';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fallback for when Upstash is not configured
const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes (only used for in-memory fallback)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  limit: number;      // Max requests
  windowMs: number;   // Time window in ms
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Check rate limit - uses Upstash if configured, falls back to in-memory.
 *
 * Note: In-memory rate limiting only works for single-instance deployments.
 * For serverless/multi-instance deployments, configure Upstash Redis:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { limit: 100, windowMs: 60000 }
): { success: boolean; remaining: number; resetTime: number } {
  const ip = getClientIp(request);
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  // In-memory fallback (for development or single-instance)
  let entry = rateLimitMap.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + config.windowMs };
    rateLimitMap.set(key, entry);
  }

  entry.count++;

  return {
    success: entry.count <= config.limit,
    remaining: Math.max(0, config.limit - entry.count),
    resetTime: entry.resetTime
  };
}

/**
 * Async rate limit check that uses Upstash if configured.
 * Returns the same interface as checkRateLimit for compatibility.
 *
 * @param request - Next.js request object
 * @param type - Rate limiter type: 'api', 'chat', 'auth', or 'strict'
 */
export async function checkRateLimitAsync(
  request: NextRequest,
  type: 'api' | 'chat' | 'auth' | 'strict' = 'api'
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const ip = getClientIp(request);
  const identifier = `${ip}:${request.nextUrl.pathname}`;

  // Try Upstash first
  if (isUpstashEnabled()) {
    const limiter = rateLimiters[type];
    const result = await checkUpstashRateLimit(identifier, limiter);

    if (result) {
      return {
        success: result.success,
        remaining: result.remaining,
        resetTime: result.reset,
      };
    }
  }

  // Fall back to in-memory
  const limits = {
    api: { limit: 100, windowMs: 60000 },
    chat: { limit: 20, windowMs: 60000 },
    auth: { limit: 10, windowMs: 60000 },
    strict: { limit: 5, windowMs: 60000 },
  };

  return checkRateLimit(request, limits[type]);
}

export function rateLimitResponse(resetTime: number): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Too many requests', message: 'Please try again later' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000))
      }
    }
  );
}
