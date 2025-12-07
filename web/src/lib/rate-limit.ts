/**
 * Rate Limiting Utilities for DeepStack
 * Client-side rate limit handling and retry logic
 */

interface RateLimitState {
  retryAfter: number | null; // Timestamp when we can retry
  remainingRequests: number | null;
  resetTime: number | null;
}

// Per-endpoint rate limit tracking
const rateLimitState: Record<string, RateLimitState> = {};

/**
 * Extract rate limit info from response headers
 */
export function extractRateLimitInfo(response: Response): RateLimitState {
  return {
    retryAfter: response.headers.get('Retry-After')
      ? Date.now() + parseInt(response.headers.get('Retry-After')!) * 1000
      : null,
    remainingRequests: response.headers.get('X-RateLimit-Remaining')
      ? parseInt(response.headers.get('X-RateLimit-Remaining')!)
      : null,
    resetTime: response.headers.get('X-RateLimit-Reset')
      ? parseInt(response.headers.get('X-RateLimit-Reset')!) * 1000
      : null,
  };
}

/**
 * Check if we're currently rate limited for an endpoint
 */
export function isRateLimited(endpoint: string): boolean {
  const state = rateLimitState[endpoint];
  if (!state?.retryAfter) return false;
  return Date.now() < state.retryAfter;
}

/**
 * Get time until rate limit resets (in ms)
 */
export function getTimeUntilReset(endpoint: string): number {
  const state = rateLimitState[endpoint];
  if (!state?.retryAfter) return 0;
  return Math.max(0, state.retryAfter - Date.now());
}

/**
 * Update rate limit state from response
 */
export function updateRateLimitState(endpoint: string, response: Response): void {
  const info = extractRateLimitInfo(response);

  if (response.status === 429) {
    // Rate limited - set retry time
    rateLimitState[endpoint] = {
      retryAfter: info.retryAfter || Date.now() + 60000, // Default 1 min
      remainingRequests: 0,
      resetTime: info.resetTime,
    };
  } else {
    // Update remaining count
    rateLimitState[endpoint] = info;
  }
}

/**
 * Clear rate limit state for an endpoint
 */
export function clearRateLimitState(endpoint: string): void {
  delete rateLimitState[endpoint];
}

/**
 * Wrapper for fetch with rate limit handling
 */
export async function rateLimitedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const endpoint = new URL(url, window.location.origin).pathname;

  // Check if we're rate limited
  if (isRateLimited(endpoint)) {
    const waitTime = getTimeUntilReset(endpoint);
    throw new RateLimitError(
      `Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
      waitTime
    );
  }

  const response = await fetch(url, options);

  // Update rate limit state
  updateRateLimitState(endpoint, response);

  // Handle 429 response
  if (response.status === 429) {
    const waitTime = getTimeUntilReset(endpoint);
    throw new RateLimitError(
      'Too many requests. Please slow down.',
      waitTime
    );
  }

  return response;
}

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
  public readonly waitTime: number;

  constructor(message: string, waitTime: number) {
    super(message);
    this.name = 'RateLimitError';
    this.waitTime = waitTime;
  }
}

/**
 * Format wait time for display
 */
export function formatWaitTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}

/**
 * Simple throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
