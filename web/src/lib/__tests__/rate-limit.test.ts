import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractRateLimitInfo,
  isRateLimited,
  getTimeUntilReset,
  updateRateLimitState,
  clearRateLimitState,
  RateLimitError,
  formatWaitTime,
  throttle,
  debounce,
} from '../rate-limit';

describe('extractRateLimitInfo', () => {
  it('extracts Retry-After header', () => {
    const response = new Response(null, {
      headers: { 'Retry-After': '60' },
    });

    const now = Date.now();
    const info = extractRateLimitInfo(response);

    // Should be ~60 seconds from now
    expect(info.retryAfter).toBeGreaterThan(now);
    expect(info.retryAfter).toBeLessThanOrEqual(now + 61000);
  });

  it('extracts X-RateLimit-Remaining header', () => {
    const response = new Response(null, {
      headers: { 'X-RateLimit-Remaining': '45' },
    });

    const info = extractRateLimitInfo(response);
    expect(info.remainingRequests).toBe(45);
  });

  it('extracts X-RateLimit-Reset header', () => {
    const response = new Response(null, {
      headers: { 'X-RateLimit-Reset': '1700000000' },
    });

    const info = extractRateLimitInfo(response);
    expect(info.resetTime).toBe(1700000000 * 1000);
  });

  it('returns null for missing headers', () => {
    const response = new Response(null);
    const info = extractRateLimitInfo(response);

    expect(info.retryAfter).toBeNull();
    expect(info.remainingRequests).toBeNull();
    expect(info.resetTime).toBeNull();
  });
});

describe('isRateLimited and getTimeUntilReset', () => {
  beforeEach(() => {
    clearRateLimitState('/test-endpoint');
  });

  it('returns false for endpoints without rate limit state', () => {
    expect(isRateLimited('/nonexistent')).toBe(false);
    expect(getTimeUntilReset('/nonexistent')).toBe(0);
  });

  it('returns true when rate limited', () => {
    // Simulate a 429 response
    const response = new Response(null, {
      status: 429,
      headers: { 'Retry-After': '30' },
    });

    updateRateLimitState('/test-endpoint', response);

    expect(isRateLimited('/test-endpoint')).toBe(true);
    expect(getTimeUntilReset('/test-endpoint')).toBeGreaterThan(0);
  });
});

describe('updateRateLimitState', () => {
  beforeEach(() => {
    clearRateLimitState('/test-api');
  });

  it('sets rate limit state on 429 response', () => {
    const response = new Response(null, {
      status: 429,
      headers: { 'Retry-After': '60' },
    });

    updateRateLimitState('/test-api', response);

    expect(isRateLimited('/test-api')).toBe(true);
  });

  it('uses default 1 minute timeout when no Retry-After header', () => {
    const response = new Response(null, { status: 429 });

    updateRateLimitState('/test-api', response);

    const waitTime = getTimeUntilReset('/test-api');
    expect(waitTime).toBeGreaterThan(55000); // ~60 seconds
    expect(waitTime).toBeLessThanOrEqual(60000);
  });

  it('updates remaining count on successful response', () => {
    const response = new Response(null, {
      status: 200,
      headers: { 'X-RateLimit-Remaining': '10' },
    });

    updateRateLimitState('/test-api', response);

    // Should not be rate limited
    expect(isRateLimited('/test-api')).toBe(false);
  });
});

describe('RateLimitError', () => {
  it('creates error with message and wait time', () => {
    const error = new RateLimitError('Too many requests', 5000);

    expect(error.message).toBe('Too many requests');
    expect(error.waitTime).toBe(5000);
    expect(error.name).toBe('RateLimitError');
    expect(error instanceof Error).toBe(true);
  });
});

describe('formatWaitTime', () => {
  it('formats seconds', () => {
    expect(formatWaitTime(1000)).toBe('1s');
    expect(formatWaitTime(30000)).toBe('30s');
    expect(formatWaitTime(59000)).toBe('59s');
  });

  it('formats minutes', () => {
    expect(formatWaitTime(60000)).toBe('1m');
    expect(formatWaitTime(120000)).toBe('2m');
    expect(formatWaitTime(90000)).toBe('2m'); // Rounds up
  });

  it('handles edge cases', () => {
    expect(formatWaitTime(500)).toBe('1s'); // Rounds up
    expect(formatWaitTime(0)).toBe('0s');
  });
});

describe('throttle', () => {
  it('calls function immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ignores calls within delay period', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to original function', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('arg1', 'arg2');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('allows calls after delay period', async () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 50);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    // Wait for delay to pass
    await new Promise((r) => setTimeout(r, 60));

    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('debounce', () => {
  it('delays function execution', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 60));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('only executes once for rapid calls', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced();
    debounced();
    debounced();
    debounced();

    await new Promise((r) => setTimeout(r, 60));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments from last call', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('first');
    debounced('second');
    debounced('third');

    await new Promise((r) => setTimeout(r, 60));
    expect(fn).toHaveBeenCalledWith('third');
  });
});
