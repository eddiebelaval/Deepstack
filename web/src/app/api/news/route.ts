import { NextResponse } from 'next/server';

// Mock news articles
const MOCK_ARTICLES = [
  {
    id: '1',
    headline: 'Fed Signals Potential Rate Cuts in 2024 as Inflation Cools',
    summary: 'Federal Reserve officials indicated they may begin cutting interest rates in 2024 as inflation continues to moderate toward their 2% target.',
    url: 'https://example.com/fed-rates',
    source: 'MarketWatch',
    publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    symbols: ['SPY', 'TLT', 'GLD'],
    sentiment: 'positive',
  },
  {
    id: '2',
    headline: 'NVIDIA Reports Record Revenue, AI Chip Demand Soars',
    summary: 'NVIDIA exceeded expectations with record quarterly revenue driven by unprecedented demand for AI computing chips.',
    url: 'https://example.com/nvda-earnings',
    source: 'Reuters',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    symbols: ['NVDA', 'AMD', 'INTC'],
    sentiment: 'positive',
  },
  {
    id: '3',
    headline: 'Apple Faces Headwinds in China as Local Competition Intensifies',
    summary: 'Apple\'s iPhone sales in China continue to face pressure from domestic competitors Huawei and Xiaomi.',
    url: 'https://example.com/apple-china',
    source: 'Bloomberg',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    symbols: ['AAPL'],
    sentiment: 'negative',
  },
  {
    id: '4',
    headline: 'Tesla Announces Major Factory Expansion in Mexico',
    summary: 'Tesla confirmed plans to build a new Gigafactory in Mexico, expanding production capacity for the upcoming affordable EV.',
    url: 'https://example.com/tesla-mexico',
    source: 'CNBC',
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
    symbols: ['TSLA'],
    sentiment: 'positive',
  },
  {
    id: '5',
    headline: 'Oil Prices Surge on Middle East Supply Concerns',
    summary: 'Crude oil prices jumped 3% amid growing concerns about supply disruptions in the Middle East region.',
    url: 'https://example.com/oil-prices',
    source: 'Wall Street Journal',
    publishedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 hours ago
    symbols: ['XOM', 'CVX', 'USO'],
    sentiment: 'neutral',
  },
  {
    id: '6',
    headline: 'Microsoft Azure Revenue Growth Exceeds Expectations',
    summary: 'Microsoft\'s cloud computing division Azure reported 29% year-over-year revenue growth, beating analyst estimates.',
    url: 'https://example.com/msft-azure',
    source: 'TechCrunch',
    publishedAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(), // 7 hours ago
    symbols: ['MSFT', 'AMZN', 'GOOGL'],
    sentiment: 'positive',
  },
  {
    id: '7',
    headline: 'Retail Sales Data Shows Consumer Spending Resilience',
    summary: 'U.S. retail sales rose 0.6% in November, suggesting consumer spending remains strong despite higher interest rates.',
    url: 'https://example.com/retail-sales',
    source: 'AP News',
    publishedAt: new Date(Date.now() - 1000 * 60 * 540).toISOString(), // 9 hours ago
    symbols: ['WMT', 'TGT', 'AMZN'],
    sentiment: 'positive',
  },
  {
    id: '8',
    headline: 'Crypto Markets Rally as Bitcoin Approaches New Highs',
    summary: 'Bitcoin surged past $42,000 as institutional interest grows ahead of potential spot ETF approvals.',
    url: 'https://example.com/bitcoin-rally',
    source: 'CoinDesk',
    publishedAt: new Date(Date.now() - 1000 * 60 * 660).toISOString(), // 11 hours ago
    symbols: ['COIN', 'MSTR'],
    sentiment: 'positive',
  },
  {
    id: '9',
    headline: 'Healthcare Stocks Under Pressure After Drug Pricing Reform',
    summary: 'Major pharmaceutical companies saw shares decline following new drug pricing regulations announced by CMS.',
    url: 'https://example.com/healthcare-stocks',
    source: 'Barron\'s',
    publishedAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(), // 12 hours ago
    symbols: ['JNJ', 'PFE', 'MRK', 'UNH'],
    sentiment: 'negative',
  },
  {
    id: '10',
    headline: 'S&P 500 Hits Record High on Economic Optimism',
    summary: 'The S&P 500 index closed at an all-time high as investors bet on a soft landing for the U.S. economy.',
    url: 'https://example.com/sp500-record',
    source: 'Financial Times',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    symbols: ['SPY', 'QQQ', 'DIA'],
    sentiment: 'positive',
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    let articles = [...MOCK_ARTICLES];

    // Filter by symbol if provided
    if (symbol) {
      articles = articles.filter(
        (article) => article.symbols?.includes(symbol)
      );
    }

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('News error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
