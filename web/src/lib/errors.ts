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
  'default': 'Something went wrong. Please try again.',
};

export function getErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['default'];
}
