import { NextResponse } from 'next/server';

// Generate dynamic mock calendar events
function generateMockEvents() {
  const today = new Date();
  const events = [];

  // Earnings events
  const earningsCompanies = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Add 1-2 earnings per day
    if (i < earningsCompanies.length) {
      const company = earningsCompanies[i];
      events.push({
        id: `earnings-${i}`,
        type: 'earnings',
        symbol: company.symbol,
        title: `${company.name} Q4 Earnings`,
        date: dateStr,
        time: i % 2 === 0 ? 'Before Market Open' : 'After Market Close',
        importance: i < 3 ? 'high' : 'medium',
        estimate: `$${(2 + Math.random() * 3).toFixed(2)}`,
        prior: `$${(1.8 + Math.random() * 2.5).toFixed(2)}`,
      });
    }
  }

  // Economic events
  const economicEvents = [
    { title: 'FOMC Meeting Minutes', importance: 'high' },
    { title: 'Non-Farm Payrolls', importance: 'high' },
    { title: 'CPI Data Release', importance: 'high' },
    { title: 'Initial Jobless Claims', importance: 'medium' },
    { title: 'Retail Sales', importance: 'medium' },
    { title: 'PMI Manufacturing', importance: 'medium' },
    { title: 'Consumer Confidence', importance: 'low' },
  ];

  for (let i = 0; i < economicEvents.length; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const event = economicEvents[i];

    events.push({
      id: `economic-${i}`,
      type: 'economic',
      title: event.title,
      date: dateStr,
      time: '8:30 AM ET',
      importance: event.importance,
      estimate: i < 3 ? (Math.random() * 2).toFixed(1) + '%' : undefined,
      prior: i < 3 ? (Math.random() * 2).toFixed(1) + '%' : undefined,
    });
  }

  // Dividend events
  const dividendStocks = ['JNJ', 'PG', 'KO', 'XOM'];
  for (let i = 0; i < dividendStocks.length; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 2);
    const dateStr = date.toISOString().split('T')[0];

    events.push({
      id: `dividend-${i}`,
      type: 'dividend',
      symbol: dividendStocks[i],
      title: 'Ex-Dividend Date',
      date: dateStr,
      importance: 'low',
    });
  }

  // IPO events
  const ipoEvents = [
    { title: 'TechStartup Inc. IPO', date: 3 },
    { title: 'GreenEnergy Corp IPO', date: 5 },
  ];

  for (const ipo of ipoEvents) {
    const date = new Date(today);
    date.setDate(date.getDate() + ipo.date);
    const dateStr = date.toISOString().split('T')[0];

    events.push({
      id: `ipo-${ipo.date}`,
      type: 'ipo',
      title: ipo.title,
      date: dateStr,
      importance: 'medium',
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let events = generateMockEvents();

    // Filter by date range if provided
    if (start) {
      events = events.filter(e => e.date >= start);
    }
    if (end) {
      events = events.filter(e => e.date <= end);
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
