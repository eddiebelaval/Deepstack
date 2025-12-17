import { NextResponse } from 'next/server';

/**
 * Standardized API Response Format
 *
 * Success: { success: true, data: {...}, meta: { isMock, timestamp, warning? } }
 * Error: { success: false, error: { code, message, details? }, meta: { timestamp } }
 */

export type ApiErrorCode =
  | 'INVALID_PARAMETERS'
  | 'BACKEND_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'DATA_UNAVAILABLE';

interface ApiMeta {
  isMock: boolean;
  timestamp: string;
  warning?: string;
  source?: string;
  lastUpdated?: string;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized success response
 */
export function apiSuccess<T>(
  data: T,
  options: {
    isMock?: boolean;
    warning?: string;
    status?: number;
    source?: string;
    lastUpdated?: string;
  } = {}
): NextResponse<ApiSuccessResponse<T>> {
  const { isMock = false, warning, status = 200, source, lastUpdated } = options;

  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      isMock,
      timestamp: new Date().toISOString(),
      ...(warning && { warning }),
      ...(source && { source }),
      ...(lastUpdated && { lastUpdated }),
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized error response
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  options: {
    status?: number;
    details?: Record<string, unknown>;
  } = {}
): NextResponse<ApiErrorResponse> {
  const { status = 500, details } = options;

  // Map error codes to default HTTP status if not specified
  const defaultStatus: Record<ApiErrorCode, number> = {
    INVALID_PARAMETERS: 400,
    BACKEND_ERROR: 502,
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    DATA_UNAVAILABLE: 503,
  };

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: status || defaultStatus[code] });
}

/**
 * Helper to wrap existing response data in standard format
 * Use for gradual migration of existing routes
 */
export function wrapResponse<T>(
  data: T & { mock?: boolean; warning?: string }
): NextResponse<ApiSuccessResponse<T>> {
  const { mock, warning, ...rest } = data as any;
  return apiSuccess(rest as T, { isMock: mock || false, warning });
}

/**
 * Default mock data warning message
 */
export const MOCK_DATA_WARNING = 'Using simulated data - backend unavailable';
