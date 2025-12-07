import { NextResponse } from 'next/server';

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
}

// Generate mock calendar events as fallback
function generateMockEvents(): CalendarEvent[] {
  const today = new Date();
  const events: CalendarEvent[] = [];

  // Earnings events
  const earningsCompanies = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  ];

  for (let i = 0; i < 4; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 1);
    const dateStr = date.toISOString().split('T')[0];

    if (i < earningsCompanies.length) {
      const company = earningsCompanies[i];
      events.push({
        id: `earnings-${i}`,
        type: 'earnings',
        symbol: company.symbol,
        title: `${company.name} Earnings`,
        date: dateStr,
        time: i % 2 === 0 ? 'Before Market Open' : 'After Market Close',
        importance: i < 2 ? 'high' : 'medium',
        estimate: `$${(2 + Math.random() * 3).toFixed(2)}`,
        prior: `$${(1.8 + Math.random() * 2.5).toFixed(2)}`,
      });
    }
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

export async function GET(request: Request) {
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
