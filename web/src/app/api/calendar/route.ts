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

// Generate mock calendar events as fallback
function generateMockEvents(): CalendarEvent[] {
  const today = new Date();
  const events: CalendarEvent[] = [];

  // Earnings events with financial metrics and price data
  const earningsCompanies = [
    { symbol: 'AAPL', name: 'Apple Inc.', peRatio: 28.5, psRatio: 7.2, marketCap: 2850, revenueEstimate: 94.5, epsSurprise: 3.2, fiscalQuarter: 'Q1 2025', currentPrice: 248.72, preMarketPrice: 249.15, afterHoursPrice: 248.95, changeWeek: 2.4, changeMonth: 5.8, changeYear: 28.3 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', peRatio: 34.2, psRatio: 11.8, marketCap: 2890, revenueEstimate: 61.8, epsSurprise: 5.1, fiscalQuarter: 'Q2 2025', currentPrice: 438.45, preMarketPrice: 437.20, afterHoursPrice: 439.82, changeWeek: -1.2, changeMonth: 3.4, changeYear: 18.6 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', peRatio: 21.8, psRatio: 5.4, marketCap: 1920, revenueEstimate: 86.2, epsSurprise: -1.2, fiscalQuarter: 'Q4 2024', currentPrice: 192.34, preMarketPrice: 191.85, afterHoursPrice: 193.12, changeWeek: 0.8, changeMonth: -2.1, changeYear: 42.5 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', peRatio: 58.4, psRatio: 28.6, marketCap: 3100, revenueEstimate: 32.8, epsSurprise: 12.8, fiscalQuarter: 'Q4 2025', currentPrice: 142.85, preMarketPrice: 144.20, afterHoursPrice: 143.65, changeWeek: 4.2, changeMonth: 12.8, changeYear: 185.4 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', peRatio: 42.1, psRatio: 3.1, marketCap: 1850, revenueEstimate: 158.4, epsSurprise: 8.4, fiscalQuarter: 'Q4 2024', currentPrice: 227.18, preMarketPrice: 226.45, afterHoursPrice: 228.30, changeWeek: 1.5, changeMonth: 8.2, changeYear: 52.1 },
    { symbol: 'META', name: 'Meta Platforms Inc.', peRatio: 24.6, psRatio: 8.9, marketCap: 1450, revenueEstimate: 41.2, epsSurprise: 15.2, fiscalQuarter: 'Q4 2024', currentPrice: 612.35, preMarketPrice: 615.80, afterHoursPrice: 611.20, changeWeek: 3.8, changeMonth: 15.4, changeYear: 78.6 },
    { symbol: 'TSLA', name: 'Tesla Inc.', peRatio: 68.2, psRatio: 8.4, marketCap: 820, revenueEstimate: 25.8, epsSurprise: -8.6, fiscalQuarter: 'Q4 2024', currentPrice: 352.48, preMarketPrice: 348.90, afterHoursPrice: 355.20, changeWeek: -5.2, changeMonth: -12.4, changeYear: 45.8 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', peRatio: 9.2, psRatio: 2.1, marketCap: 785, revenueEstimate: 89.4, epsSurprise: 2.1, fiscalQuarter: 'Q4 2024', currentPrice: 458.92, preMarketPrice: 459.10, afterHoursPrice: 458.75, changeWeek: 0.3, changeMonth: 2.1, changeYear: 15.8 },
  ];

  // Spread earnings across more days for better demo
  for (let i = 0; i < earningsCompanies.length; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + Math.floor(i / 2) + 1); // 2 per day
    const dateStr = date.toISOString().split('T')[0];

    const company = earningsCompanies[i];
    events.push({
      id: `earnings-${i}`,
      type: 'earnings',
      symbol: company.symbol,
      title: `${company.name} ${company.fiscalQuarter}`,
      date: dateStr,
      time: i % 2 === 0 ? 'BMO' : 'AMC',
      importance: company.marketCap > 2000 ? 'high' : company.marketCap > 1000 ? 'medium' : 'low',
      estimate: `$${(2 + Math.random() * 3).toFixed(2)}`,
      prior: `$${(1.8 + Math.random() * 2.5).toFixed(2)}`,
      peRatio: company.peRatio,
      psRatio: company.psRatio,
      marketCap: company.marketCap,
      revenueEstimate: company.revenueEstimate,
      epsSurprise: company.epsSurprise,
      fiscalQuarter: company.fiscalQuarter,
      // Stock price data
      currentPrice: company.currentPrice,
      preMarketPrice: company.preMarketPrice,
      afterHoursPrice: company.afterHoursPrice,
      changeWeek: company.changeWeek,
      changeMonth: company.changeMonth,
      changeYear: company.changeYear,
    });
  }

  // Economic events
  const economicEvents = [
    { title: 'FOMC Meeting Minutes', importance: 'high' as const },
    { title: 'CPI Data Release', importance: 'high' as const },
    { title: 'Initial Jobless Claims', importance: 'medium' as const },
  ];

  for (let i = 0; i < economicEvents.length; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 2);
    const dateStr = date.toISOString().split('T')[0];

    events.push({
      id: `economic-${i}`,
      type: 'economic',
      title: economicEvents[i].title,
      date: dateStr,
      time: '8:30 AM ET',
      importance: economicEvents[i].importance,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute for external API
  const rateLimit = checkRateLimit(request, { limit: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    try {
      // Try to fetch from Python backend (Alpaca Calendar API)
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
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();

      // Combine backend market calendar with mock earnings/economic events
      // (Alpaca only provides market hours, not earnings)
      const mockEvents = generateMockEvents();
      const backendEvents = (data.events || []).map((e: any) => ({
        ...e,
        importance: e.importance || 'low',
      }));

      // Filter mock events by date range if provided
      let events = [...mockEvents];
      if (start) events = events.filter(e => e.date >= start);
      if (end) events = events.filter(e => e.date <= end);

      // Merge with backend market calendar events
      events = [...events, ...backendEvents].sort((a, b) => a.date.localeCompare(b.date));

      return NextResponse.json({ events });
    } catch (error) {
      console.warn('Backend unavailable for calendar, returning mock data:', error);

      let events = generateMockEvents();
      if (start) events = events.filter(e => e.date >= start);
      if (end) events = events.filter(e => e.date <= end);

      return NextResponse.json({
        events,
        mock: true,
        warning: 'Using simulated data - backend unavailable',
      });
    }
  } catch (error) {
    console.error('Calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
