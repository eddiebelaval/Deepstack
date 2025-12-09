import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAPIError,
  getErrorMessage,
  getUserFriendlyMessage,
  isRetryable,
  withRetry,
  safeAsync,
  ERROR_MESSAGES,
} from '../errors';

describe('isAPIError', () => {
  it('returns true for API error response', () => {
    const apiError = {
      success: false,
      error: 'Something went wrong',
      error_code: 'INTERNAL_ERROR',
      request_id: '123',
      timestamp: new Date().toISOString(),
    };

    expect(isAPIError(apiError)).toBe(true);
  });

  it('returns false for API success response', () => {
    const successResponse = {
      success: true,
      data: { foo: 'bar' },
    };

    expect(isAPIError(successResponse)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAPIError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAPIError(undefined)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isAPIError('error')).toBe(false);
    expect(isAPIError(123)).toBe(false);
    expect(isAPIError(true)).toBe(false);
  });

  it('returns false for object without success field', () => {
    expect(isAPIError({ error: 'test' })).toBe(false);
  });

  it('returns false for object with success: true', () => {
    expect(isAPIError({ success: true, error: 'test' })).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('returns correct message for known error code', () => {
    expect(getErrorMessage('ORDER_REJECTED')).toBe(
      'Your order was rejected. Please check your parameters.'
    );
    expect(getErrorMessage('INSUFFICIENT_FUNDS')).toBe(
      'Insufficient funds for this order.'
    );
    expect(getErrorMessage('RATE_LIMITED')).toBe(
      'Too many requests. Please wait a moment.'
    );
  });

  it('returns default message for unknown error code', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe(
      'Something went wrong. Please try again.'
    );
    expect(getErrorMessage('')).toBe('Something went wrong. Please try again.');
  });
});

describe('getUserFriendlyMessage', () => {
  it('extracts message from API error response', () => {
    const apiError = {
      success: false,
      error: 'Internal error details',
      error_code: 'MARKET_CLOSED',
      request_id: '123',
      timestamp: new Date().toISOString(),
    };

    expect(getUserFriendlyMessage(apiError)).toBe('Market is currently closed.');
  });

  it('categorizes network errors', () => {
    expect(getUserFriendlyMessage(new Error('Network error occurred'))).toBe(
      ERROR_MESSAGES['NETWORK_ERROR']
    );
    expect(getUserFriendlyMessage(new Error('Failed to fetch'))).toBe(
      ERROR_MESSAGES['NETWORK_ERROR']
    );
  });

  it('categorizes timeout errors', () => {
    expect(getUserFriendlyMessage(new Error('Request timeout'))).toBe(
      ERROR_MESSAGES['TIMEOUT']
    );
    expect(getUserFriendlyMessage(new Error('Operation aborted'))).toBe(
      ERROR_MESSAGES['TIMEOUT']
    );
  });

  it('categorizes unauthorized errors', () => {
    expect(getUserFriendlyMessage(new Error('401 Unauthorized'))).toBe(
      ERROR_MESSAGES['UNAUTHORIZED']
    );
    expect(getUserFriendlyMessage(new Error('unauthorized access'))).toBe(
      ERROR_MESSAGES['UNAUTHORIZED']
    );
  });

  it('categorizes rate limit errors', () => {
    expect(getUserFriendlyMessage(new Error('429 Too Many Requests'))).toBe(
      ERROR_MESSAGES['RATE_LIMITED']
    );
    expect(getUserFriendlyMessage(new Error('rate limit exceeded'))).toBe(
      ERROR_MESSAGES['RATE_LIMITED']
    );
  });

  it('returns default message for unknown errors', () => {
    expect(getUserFriendlyMessage(new Error('Random error'))).toBe(
      ERROR_MESSAGES['default']
    );
    expect(getUserFriendlyMessage('string error')).toBe(ERROR_MESSAGES['default']);
    expect(getUserFriendlyMessage(null)).toBe(ERROR_MESSAGES['default']);
  });
});

describe('isRetryable', () => {
  it('returns true for retryable API error codes', () => {
    const networkError = {
      success: false,
      error: 'Network error',
      error_code: 'NETWORK_ERROR',
      request_id: '123',
      timestamp: new Date().toISOString(),
    };

    const timeoutError = {
      success: false,
      error: 'Timeout',
      error_code: 'TIMEOUT',
      request_id: '123',
      timestamp: new Date().toISOString(),
    };

    const rateLimitError = {
      success: false,
      error: 'Rate limited',
      error_code: 'RATE_LIMITED',
      request_id: '123',
      timestamp: new Date().toISOString(),
    };

    expect(isRetryable(networkError)).toBe(true);
    expect(isRetryable(timeoutError)).toBe(true);
    expect(isRetryable(rateLimitError)).toBe(true);
  });

  it('returns false for non-retryable API error codes', () => {
    const orderRejected = {
      success: false,
      error: 'Order rejected',
      error_code: 'ORDER_REJECTED',
      request_id: '123',
      timestamp: new Date().toISOString(),
    };

    const insufficientFunds = {
      success: false,
      error: 'No funds',
      error_code: 'INSUFFICIENT_FUNDS',
      request_id: '123',
      timestamp: new Date().toISOString(),
    };

    expect(isRetryable(orderRejected)).toBe(false);
    expect(isRetryable(insufficientFunds)).toBe(false);
  });

  it('returns true for Error with network/timeout message', () => {
    expect(isRetryable(new Error('network error'))).toBe(true);
    expect(isRetryable(new Error('failed to fetch'))).toBe(true);
    expect(isRetryable(new Error('request timeout'))).toBe(true);
    expect(isRetryable(new Error('aborted'))).toBe(true);
  });

  it('returns false for regular Error', () => {
    expect(isRetryable(new Error('validation failed'))).toBe(false);
  });

  it('returns false for non-Error types', () => {
    expect(isRetryable('error string')).toBe(false);
    expect(isRetryable(null)).toBe(false);
    expect(isRetryable(undefined)).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, {
      baseDelay: 10,
      maxDelay: 50,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after max retries exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 50,
      })
    ).rejects.toThrow('network error');

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('validation failed'));

    await expect(
      withRetry(fn, {
        baseDelay: 10,
      })
    ).rejects.toThrow('validation failed');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    await withRetry(fn, {
      baseDelay: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('uses custom shouldRetry function', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('custom retryable'))
      .mockResolvedValue('success');

    const shouldRetry = (error: unknown) =>
      error instanceof Error && error.message.includes('custom retryable');

    const result = await withRetry(fn, {
      baseDelay: 10,
      shouldRetry,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('safeAsync', () => {
  it('returns function result on success', async () => {
    const fn = async () => 'success';

    const result = await safeAsync(fn, 'fallback');

    expect(result).toBe('success');
  });

  it('returns fallback on error', async () => {
    const fn = async () => {
      throw new Error('failure');
    };

    const result = await safeAsync(fn, 'fallback');

    expect(result).toBe('fallback');
  });

  it('returns fallback with context', async () => {
    const fn = async () => {
      throw new Error('failure');
    };

    const result = await safeAsync(fn, { default: true }, { operation: 'test' });

    expect(result).toEqual({ default: true });
  });
});
