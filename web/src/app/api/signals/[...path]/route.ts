import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * DeepSignals Catch-All Proxy Route
 *
 * Proxies /api/signals/* requests to the Python backend at /api/signals/*.
 * Forwards query parameters and auth headers.
 *
 * Examples:
 *   GET /api/signals/iv/AAPL        -> backend /api/signals/iv/AAPL
 *   GET /api/signals/flow?limit=20  -> backend /api/signals/flow?limit=20
 *   GET /api/signals/gex/SPY        -> backend /api/signals/gex/SPY
 */

async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[],
) {
  const rateLimit = checkRateLimit(request, { limit: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  const path = pathSegments.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${API_BASE_URL}/api/signals/${path}${searchParams ? '?' + searchParams : ''}`;

  // Forward auth headers if present
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers['Authorization'] = authorization;
  }

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.text()
        : undefined,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend signals error: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `Signals service error (${response.status})` },
        { status: response.status >= 500 ? 503 : response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Signals proxy error:', error);
    return NextResponse.json(
      { error: 'Signals service unavailable. Is the Python backend running?' },
      { status: 503 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToBackend(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToBackend(request, path);
}
