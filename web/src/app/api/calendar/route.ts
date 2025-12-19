import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Types for calendar events
interface CalendarEvent {
  id: string;
  type: 'earnings' | 'economic' | 'dividend' | 'ipo' | 'market';
  symbol?: string;
  title: string;
  date: string;
  time?: string;
  importance: 'high' | 'medium' | 'low';
  estimate?: string;
  prior?: string;
  // Earnings-specific financial metrics
  peRatio?: number;
  psRatio?: number;
  marketCap?: number; // in billions
  revenueEstimate?: number; // in billions
  epsSurprise?: number; // percentage from last quarter
  fiscalQuarter?: string;
  // Stock price data
  currentPrice?: number;
  preMarketPrice?: number;
  afterHoursPrice?: number;
  changeWeek?: number;
  changeMonth?: number;
  changeYear?: number;
}


export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute for external API
  const rateLimit = checkRateLimit(request, { limit: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Fetch from Python backend (Alpha Vantage Calendar API)
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);

    const response = await fetch(
      `${API_BASE_URL}/api/calendar?${params.toString()}`,
      {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend calendar error:', response.status, errorText);
      return NextResponse.json(
        { error: `Calendar service unavailable (${response.status})`, events: [] },
        { status: 503 }
      );
    }

    const data = await response.json();

    // Map backend events with default importance
    const events = (data.events || []).map((e: CalendarEvent) => ({
      ...e,
      importance: e.importance || 'medium',
    }));

    // If no events returned, inform the user
    if (events.length === 0) {
      return NextResponse.json({
        events: [],
        source: 'alpha_vantage',
        message: 'No earnings events found for the selected date range',
      });
    }

    return NextResponse.json({
      events: events.sort((a: CalendarEvent, b: CalendarEvent) => a.date.localeCompare(b.date)),
      source: 'alpha_vantage',
    });
  } catch (error) {
    console.error('Calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to calendar service. Please try again later.', events: [] },
      { status: 503 }
    );
  }
}
