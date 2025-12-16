import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  // Rate limiting: 10 requests per minute for health checks
  const rateLimit = checkRateLimit(request, { limit: 10, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const response = await fetch(`${API_BASE_URL}/api/news/sources/health`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn('Backend unavailable for health check:', error);

    // Return fallback health status indicating backend is down
    return NextResponse.json({
      sources: {
        finnhub: { configured: false, healthy: false },
        newsapi: { configured: false, healthy: false },
        alphavantage: { configured: false, healthy: false },
        alpaca: { configured: false, healthy: false },
        rss: { configured: true, healthy: false },
        stocktwits: { configured: true, healthy: false },
      },
      overall_healthy: false,
      total_sources: 0,
      healthy_sources: 0,
      mock: true,
      warning: 'Backend unavailable',
    });
  }
}
