/**
 * Frontend error types and utilities for DeepStack
 */

export interface APIErrorResponse {
  success: false;
  error: string;
  error_code: string;
  request_id: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface APISuccessResponse<T> {
  success: true;
  data: T;
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

export function isAPIError(response: unknown): response is APIErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as APIErrorResponse).success === false &&
    'error' in response
  );
}

export const ERROR_MESSAGES: Record<string, string> = {
  'ORDER_REJECTED': 'Your order was rejected. Please check your parameters.',
  'ORDER_EXECUTION_FAILED': 'Order execution failed. Please try again.',
  'INSUFFICIENT_FUNDS': 'Insufficient funds for this order.',
  'MARKET_CLOSED': 'Market is currently closed.',
  'CIRCUIT_BREAKER_TRIPPED': 'Trading halted due to risk limits.',
  'QUOTE_UNAVAILABLE': 'Quote data is currently unavailable.',
  'RATE_LIMITED': 'Too many requests. Please wait a moment.',
  'DB_INIT_FAILED': 'System initialization failed.',
  'API_KEY_MISSING': 'API key not configured.',
  'VALIDATION_ERROR': 'Invalid input parameters.',
  'INTERNAL_ERROR': 'An unexpected error occurred.',
  'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.',
  'TIMEOUT': 'Request timed out. Please try again.',
  'UNAUTHORIZED': 'Please sign in to continue.',
  'SESSION_EXPIRED': 'Your session has expired. Please sign in again.',
  'FIREWALL_BLOCKED': 'Trade blocked by emotional firewall. Take a break.',
  'default': 'Something went wrong. Please try again.',
};

export function getErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['default'];
}

/**
 * Parse any error into user-friendly message
 * NEVER exposes internal error details
 */
export function getUserFriendlyMessage(error: unknown): string {
  // API error response
  if (isAPIError(error)) {
    return getErrorMessage(error.error_code);
  }

  // Error with message - categorize but never expose
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('failed to fetch')) {
      return ERROR_MESSAGES['NETWORK_ERROR'];
    }

    if (message.includes('timeout') || message.includes('abort')) {
      return ERROR_MESSAGES['TIMEOUT'];
    }

    if (message.includes('401') || message.includes('unauthorized')) {
      return ERROR_MESSAGES['UNAUTHORIZED'];
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return ERROR_MESSAGES['RATE_LIMITED'];
    }
  }

  return ERROR_MESSAGES['default'];
}

/**
 * Log error for debugging (dev only)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('[DeepStack Error]', {
      error: error instanceof Error ? error.message : error,
      context,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// Retryable error codes
const RETRYABLE_CODES = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'INTERNAL_ERROR',
  'RATE_LIMITED',
];

/**
 * Check if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (isAPIError(error)) {
    return RETRYABLE_CODES.includes(error.error_code);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('abort')
    );
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = isRetryable,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logError(error, { attempt });

      // Don't retry if not retryable or last attempt
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.3 * delay;
      const totalDelay = delay + jitter;

      onRetry?.(attempt + 1, error);

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

/**
 * Safe async wrapper that catches and logs errors
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(error, context);
    return fallback;
  }
}
