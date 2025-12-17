import { tool } from 'ai';
import { z } from 'zod';

// Get the base URL for API calls - needed for edge runtime
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return 'http://localhost:3000';
};

// Types for Perplexity Finance data
export interface SECFiling {
  id: string;
  symbol: string;
  companyName: string;
  filingType: '10-K' | '10-Q' | '8-K' | 'S-1' | 'S-4' | '20-F';
  filingDate: string;
  periodOfReport?: string;
  summary: string;
  keyPoints: string[];
  edgarUrl: string;
}

export interface MarketSummary {
  timestamp: string;
  overview: string;
  sectors: Array<{
    name: string;
    performance: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    keyDrivers: string[];
  }>;
  topMovers: Array<{
    symbol: string;
    name: string;
    change: number;
    reason: string;
  }>;
  risks: string[];
  opportunities: string[];
  sources: string[];
}

export interface EarningsTranscript {
  symbol: string;
  companyName: string;
  quarter: string;
  date: string;
  keyTakeaways: string[];
  guidanceHighlights: string[];
  managementTone: 'optimistic' | 'cautious' | 'neutral' | 'defensive';
  qaHighlights: string[];
  fullTranscriptUrl?: string;
}

export interface ScreenerResult {
  symbol: string;
  companyName: string;
  price: number;
  marketCap: number;
  sector: string;
  matchReason: string;
  metrics: Record<string, number | string>;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  ceo: string;
  founded: string;
  headquarters: string;
  employees: number;
  marketCap: number;
  peRatio?: number;
  revenueGrowth?: string;
  competitivePosition: string;
  recentDevelopments: string[];
  riskFactors: string[];
  analystSentiment: 'bullish' | 'neutral' | 'bearish';
}

export interface DeepResearchReport {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
  executiveSummary: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  conclusions: string[];
  sources: Array<{
    title: string;
    url: string;
  }>;
}

// Mock data for development/fallback
const MOCK_SEC_FILINGS: SECFiling[] = [
  {
    id: 'aapl-10k-2024',
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    filingType: '10-K',
    filingDate: '2024-11-01',
    periodOfReport: '2024-09-28',
    summary: 'Apple reported record services revenue of $96.2 billion for FY2024, while iPhone revenue remained flat YoY. Gross margin improved to 46.2% driven by services mix shift.',
    keyPoints: [
      'Total revenue: $383.3 billion (+2% YoY)',
      'Services segment: $96.2 billion (+14% YoY)',
      'iPhone revenue: $200.6 billion (flat)',
      'Gross margin: 46.2% (up from 44.1%)',
      'R&D spending increased 8% to $29.9 billion',
      'Returned $100 billion to shareholders via dividends and buybacks'
    ],
    edgarUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=10-K'
  },
  {
    id: 'nvda-10q-2024',
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    filingType: '10-Q',
    filingDate: '2024-11-20',
    periodOfReport: '2024-10-27',
    summary: 'NVIDIA reported Q3 FY2025 revenue of $35.1 billion, up 94% YoY, driven by Data Center segment growth of 112%. Hopper architecture demand remains strong.',
    keyPoints: [
      'Revenue: $35.1 billion (+94% YoY)',
      'Data Center: $30.8 billion (+112% YoY)',
      'Gaming: $3.3 billion (+15% YoY)',
      'Gross margin: 74.6%',
      'Blackwell architecture shipments began in Q4',
      'Strong demand from hyperscalers and sovereign AI'
    ],
    edgarUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=10-Q'
  }
];

const MOCK_MARKET_SUMMARY: MarketSummary = {
  timestamp: new Date().toISOString(),
  overview: 'US equities are mixed as investors digest mixed economic data ahead of the Fed meeting. Tech stocks are leading while energy lags on oil weakness. Treasury yields are stable around 4.25%.',
  sectors: [
    { name: 'Technology', performance: '+0.8%', sentiment: 'bullish', keyDrivers: ['AI optimism', 'Strong earnings', 'Rate cut expectations'] },
    { name: 'Healthcare', performance: '+0.3%', sentiment: 'neutral', keyDrivers: ['M&A activity', 'Drug approvals'] },
    { name: 'Energy', performance: '-1.2%', sentiment: 'bearish', keyDrivers: ['Oil price weakness', 'Oversupply concerns'] },
    { name: 'Financials', performance: '+0.2%', sentiment: 'neutral', keyDrivers: ['Stable rates', 'Credit quality'] },
  ],
  topMovers: [
    { symbol: 'NVDA', name: 'NVIDIA', change: 3.2, reason: 'Analyst upgrade on AI demand outlook' },
    { symbol: 'TSLA', name: 'Tesla', change: -2.1, reason: 'Margin pressure concerns' },
    { symbol: 'META', name: 'Meta Platforms', change: 1.8, reason: 'Ad revenue beat expectations' },
  ],
  risks: [
    'Fed policy uncertainty remains elevated',
    'Geopolitical tensions in Middle East',
    'China economic slowdown deepening',
  ],
  opportunities: [
    'AI infrastructure buildout accelerating',
    'Interest rate cuts expected in 2025',
    'Consumer spending remains resilient',
  ],
  sources: ['Federal Reserve', 'Bureau of Labor Statistics', 'Company earnings calls']
};

const MOCK_TRANSCRIPTS: Record<string, EarningsTranscript> = {
  'AAPL': {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    quarter: 'Q4 FY2024',
    date: '2024-10-31',
    keyTakeaways: [
      'Services revenue hit all-time high of $25 billion',
      'iPhone 16 demand "better than expected" in early weeks',
      'Apple Intelligence rolling out across devices',
      'China revenue stabilizing after multi-quarter decline'
    ],
    guidanceHighlights: [
      'Holiday quarter revenue expected to grow low-to-mid single digits',
      'Services growth to remain in double digits',
      'Gross margin expected at 46-47%'
    ],
    managementTone: 'optimistic',
    qaHighlights: [
      'CEO emphasized AI as "once in a generation opportunity"',
      'CFO noted Vision Pro gaining traction in enterprise',
      'Management confident in India manufacturing expansion'
    ]
  },
  'NVDA': {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    quarter: 'Q3 FY2025',
    date: '2024-11-20',
    keyTakeaways: [
      'Data Center revenue grew 112% YoY to $30.8 billion',
      'Blackwell demand is "incredible" - production ramping',
      'Sovereign AI emerging as major demand driver',
      'Gaming segment returned to growth'
    ],
    guidanceHighlights: [
      'Q4 revenue guidance of $37.5 billion (+/-2%)',
      'Gross margin expected at 73.5%',
      'Blackwell revenue to be "several billion" in Q4'
    ],
    managementTone: 'optimistic',
    qaHighlights: [
      'CEO: "Demand for Blackwell is insane"',
      'Supply constraints expected to ease by Q1 2025',
      'CUDA ecosystem moat continues to strengthen'
    ]
  }
};

export const perplexityFinanceTools = {
  search_sec_filings: tool({
    description: 'Search SEC filings (10-K, 10-Q, 8-K, S-1, etc.) for a company. Use this to find information from official regulatory filings like annual reports, quarterly reports, or material events.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, NVDA, TSLA)'),
      filing_type: z.enum(['10-K', '10-Q', '8-K', 'S-1', 'S-4', '20-F', 'all']).optional().default('all')
        .describe('Type of filing to search. 10-K is annual report, 10-Q is quarterly, 8-K is material events.'),
      query: z.string().optional().describe('Specific query to search within filings (e.g., "AI strategy", "revenue guidance")'),
      date_after: z.string().optional().describe('Only return filings after this date (YYYY-MM-DD)'),
    }),
    execute: async ({ symbol, filing_type, query, date_after }) => {
      const upperSymbol = symbol.toUpperCase();
      const baseUrl = getBaseUrl();

      try {
        const params = new URLSearchParams({ symbol: upperSymbol });
        if (filing_type && filing_type !== 'all') params.append('type', filing_type);
        if (query) params.append('q', query);
        if (date_after) params.append('after', date_after);

        const response = await fetch(`${baseUrl}/api/perplexity/sec?${params}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: {
              filings: data.filings,
              symbol: upperSymbol,
              query,
              count: data.filings?.length || 0,
            },
            mock: data.mock || false,
          };
        }

        // Fallback to mock data
        const mockFilings = MOCK_SEC_FILINGS.filter(f =>
          f.symbol === upperSymbol &&
          (filing_type === 'all' || f.filingType === filing_type)
        );

        return {
          success: true,
          data: {
            filings: mockFilings,
            symbol: upperSymbol,
            query,
            count: mockFilings.length,
          },
          mock: true,
          note: 'Using cached data. Live SEC search requires Perplexity API.',
        };
      } catch {
        // Return mock data
        const mockFilings = MOCK_SEC_FILINGS.filter(f =>
          f.symbol === upperSymbol &&
          (filing_type === 'all' || f.filingType === filing_type)
        );

        return {
          success: true,
          data: {
            filings: mockFilings.length > 0 ? mockFilings : [{
              id: `${upperSymbol}-mock`,
              symbol: upperSymbol,
              companyName: upperSymbol,
              filingType: filing_type === 'all' ? '10-K' : filing_type,
              filingDate: new Date().toISOString().split('T')[0],
              summary: `SEC filings for ${upperSymbol} would appear here with live data.`,
              keyPoints: ['SEC filing search requires Perplexity API integration'],
              edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${upperSymbol}&type=${filing_type === 'all' ? '' : filing_type}`
            }],
            symbol: upperSymbol,
            query,
            count: mockFilings.length || 1,
          },
          mock: true,
        };
      }
    },
  }),

  get_market_summary: tool({
    description: 'Get an AI-synthesized summary of current market conditions, sector performance, key movers, and important developments. Much more useful than raw news feeds.',
    inputSchema: z.object({
      focus: z.array(z.string()).optional().describe('Specific topics to focus on (e.g., ["tech sector", "fed policy", "earnings"])'),
      symbols: z.array(z.string()).optional().describe('Specific symbols to include in the summary'),
    }),
    execute: async ({ focus, symbols }) => {
      const baseUrl = getBaseUrl();

      try {
        const params = new URLSearchParams();
        if (focus?.length) params.append('focus', focus.join(','));
        if (symbols?.length) params.append('symbols', symbols.map(s => s.toUpperCase()).join(','));

        const response = await fetch(`${baseUrl}/api/perplexity/market-summary?${params}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: data.summary,
            mock: data.mock || false,
          };
        }

        // Return mock summary
        return {
          success: true,
          data: MOCK_MARKET_SUMMARY,
          mock: true,
          note: 'Using cached market summary. Live summary requires Perplexity API.',
        };
      } catch {
        return {
          success: true,
          data: MOCK_MARKET_SUMMARY,
          mock: true,
        };
      }
    },
  }),

  search_earnings_transcripts: tool({
    description: 'Search earnings call transcripts for a company. Get key takeaways, management guidance, and analyst Q&A highlights without reading the full transcript.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      quarter: z.string().optional().describe('Specific quarter (e.g., "Q3 2024", "Q4 FY2024")'),
      query: z.string().optional().describe('Search for specific topics within transcripts (e.g., "AI", "margins", "guidance")'),
    }),
    execute: async ({ symbol, quarter, query }) => {
      const upperSymbol = symbol.toUpperCase();
      const baseUrl = getBaseUrl();

      try {
        const params = new URLSearchParams({ symbol: upperSymbol });
        if (quarter) params.append('quarter', quarter);
        if (query) params.append('q', query);

        const response = await fetch(`${baseUrl}/api/perplexity/earnings?${params}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: {
              transcripts: data.transcripts,
              symbol: upperSymbol,
              query,
              count: data.transcripts?.length || 0,
            },
            mock: data.mock || false,
          };
        }

        // Return mock transcript
        const mockTranscript = MOCK_TRANSCRIPTS[upperSymbol];
        return {
          success: true,
          data: {
            transcripts: mockTranscript ? [mockTranscript] : [],
            symbol: upperSymbol,
            query,
            count: mockTranscript ? 1 : 0,
          },
          mock: true,
          note: mockTranscript ? 'Using cached transcript data.' : 'No transcript data available. Live search requires Perplexity API.',
        };
      } catch {
        const mockTranscript = MOCK_TRANSCRIPTS[upperSymbol];
        return {
          success: true,
          data: {
            transcripts: mockTranscript ? [mockTranscript] : [],
            symbol: upperSymbol,
            query,
            count: mockTranscript ? 1 : 0,
          },
          mock: true,
        };
      }
    },
  }),

  natural_language_screen: tool({
    description: 'Screen stocks using natural language queries instead of rigid filters. Example: "Find tech stocks with P/E under 20 growing revenue over 20% annually"',
    inputSchema: z.object({
      query: z.string().describe('Natural language description of the stocks you want to find'),
      limit: z.number().optional().default(10).describe('Maximum number of results'),
    }),
    execute: async ({ query, limit }) => {
      const baseUrl = getBaseUrl();

      try {
        const response = await fetch(`${baseUrl}/api/perplexity/screener`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, limit }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: {
              results: data.results,
              query,
              interpretation: data.interpretation,
              count: data.results?.length || 0,
            },
            mock: data.mock || false,
          };
        }

        // Return mock results based on query keywords
        const mockResults = generateMockScreenerResults(query, limit);
        return {
          success: true,
          data: {
            results: mockResults,
            query,
            interpretation: `Searching for: ${query}`,
            count: mockResults.length,
          },
          mock: true,
          note: 'Using sample results. Natural language screening requires Perplexity API.',
        };
      } catch {
        const mockResults = generateMockScreenerResults(query, limit);
        return {
          success: true,
          data: {
            results: mockResults,
            query,
            interpretation: `Searching for: ${query}`,
            count: mockResults.length,
          },
          mock: true,
        };
      }
    },
  }),

  build_company_profile: tool({
    description: 'Build a comprehensive profile of a company including business description, competitive position, recent developments, and risk factors. Great for quick research on unfamiliar companies.',
    inputSchema: z.object({
      entity: z.string().describe('Company name or stock symbol'),
      focus_areas: z.array(z.string()).optional().describe('Specific areas to focus on (e.g., ["competitive landscape", "growth strategy", "risks"])'),
    }),
    execute: async ({ entity, focus_areas }) => {
      const baseUrl = getBaseUrl();

      try {
        const response = await fetch(`${baseUrl}/api/perplexity/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity, focus_areas }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: data.profile,
            mock: data.mock || false,
          };
        }

        // Generate mock profile
        const mockProfile = generateMockProfile(entity);
        return {
          success: true,
          data: mockProfile,
          mock: true,
          note: 'Using template profile. Detailed profiles require Perplexity API.',
        };
      } catch {
        const mockProfile = generateMockProfile(entity);
        return {
          success: true,
          data: mockProfile,
          mock: true,
        };
      }
    },
  }),

  generate_deep_research: tool({
    description: 'Generate a comprehensive research report on a topic. This is a premium feature that produces detailed analysis with multiple sources. Use for important investment decisions.',
    inputSchema: z.object({
      topic: z.string().describe('The research topic or question'),
      focus_areas: z.array(z.string()).optional().describe('Specific aspects to cover in depth'),
      symbols: z.array(z.string()).optional().describe('Stock symbols relevant to the research'),
    }),
    execute: async ({ topic, focus_areas, symbols }) => {
      const baseUrl = getBaseUrl();

      try {
        const response = await fetch(`${baseUrl}/api/perplexity/deep-research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, focus_areas, symbols }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: data.report,
            creditCost: 50,
            mock: data.mock || false,
          };
        }

        // Return mock report structure
        const mockReport = generateMockResearchReport(topic, focus_areas, symbols);
        return {
          success: true,
          data: mockReport,
          creditCost: 50,
          mock: true,
          note: 'Deep research requires Perplexity API. This is a template showing the expected output format.',
        };
      } catch {
        const mockReport = generateMockResearchReport(topic, focus_areas, symbols);
        return {
          success: true,
          data: mockReport,
          creditCost: 50,
          mock: true,
        };
      }
    },
  }),

  // UI Panel Tools
  show_sec_filings: tool({
    description: 'Show the SEC Filings panel in the UI for browsing company regulatory filings',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Pre-select a symbol'),
      filing_type: z.string().optional().describe('Pre-filter by filing type'),
    }),
    execute: async ({ symbol, filing_type }) => ({
      success: true,
      action: 'show_panel',
      panel: 'sec-filings',
      symbol: symbol?.toUpperCase(),
      filing_type,
      message: symbol ? `Showing SEC filings for ${symbol.toUpperCase()}` : 'Showing SEC Filings panel',
    }),
  }),

  show_earnings_transcripts: tool({
    description: 'Show the Earnings Transcripts panel for reviewing earnings call transcripts',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Pre-select a symbol'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'earnings-transcripts',
      symbol: symbol?.toUpperCase(),
      message: symbol ? `Showing earnings transcripts for ${symbol.toUpperCase()}` : 'Showing Earnings Transcripts panel',
    }),
  }),

  show_deep_research: tool({
    description: 'Show the Deep Research panel for generating comprehensive research reports',
    inputSchema: z.object({
      topic: z.string().optional().describe('Pre-fill research topic'),
    }),
    execute: async ({ topic }) => ({
      success: true,
      action: 'show_panel',
      panel: 'deep-research',
      topic,
      message: topic ? `Opening Deep Research for: ${topic}` : 'Showing Deep Research panel',
    }),
  }),
};

// Helper functions for mock data generation
function generateMockScreenerResults(query: string, limit: number): ScreenerResult[] {
  const lowerQuery = query.toLowerCase();
  const mockStocks = [
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'Technology', price: 142, marketCap: 3.5e12, pe: 65, revenueGrowth: 94 },
    { symbol: 'AAPL', name: 'Apple', sector: 'Technology', price: 238, marketCap: 3.6e12, pe: 32, revenueGrowth: 2 },
    { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', price: 432, marketCap: 3.2e12, pe: 38, revenueGrowth: 16 },
    { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology', price: 175, marketCap: 2.1e12, pe: 24, revenueGrowth: 14 },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', price: 580, marketCap: 1.5e12, pe: 27, revenueGrowth: 23 },
    { symbol: 'AMD', name: 'AMD', sector: 'Technology', price: 140, marketCap: 227e9, pe: 48, revenueGrowth: 18 },
    { symbol: 'AMZN', name: 'Amazon', sector: 'Consumer Discretionary', price: 210, marketCap: 2.2e12, pe: 45, revenueGrowth: 11 },
    { symbol: 'TSLA', name: 'Tesla', sector: 'Consumer Discretionary', price: 355, marketCap: 1.1e12, pe: 75, revenueGrowth: 8 },
  ];

  // Filter based on query keywords
  let filtered = [...mockStocks];

  if (lowerQuery.includes('tech')) {
    filtered = filtered.filter(s => s.sector === 'Technology');
  }
  if (lowerQuery.includes('p/e') || lowerQuery.includes('pe')) {
    const peMatch = lowerQuery.match(/p\/e\s*(under|below|<)\s*(\d+)/i) || lowerQuery.match(/pe\s*(under|below|<)\s*(\d+)/i);
    if (peMatch) {
      const maxPE = parseInt(peMatch[2]);
      filtered = filtered.filter(s => s.pe < maxPE);
    }
  }
  if (lowerQuery.includes('growth') || lowerQuery.includes('growing')) {
    const growthMatch = lowerQuery.match(/(\d+)%/);
    if (growthMatch) {
      const minGrowth = parseInt(growthMatch[1]);
      filtered = filtered.filter(s => s.revenueGrowth >= minGrowth);
    }
  }

  return filtered.slice(0, limit).map(s => ({
    symbol: s.symbol,
    companyName: s.name,
    price: s.price,
    marketCap: s.marketCap,
    sector: s.sector,
    matchReason: `Matches criteria: ${query}`,
    metrics: {
      'P/E Ratio': s.pe,
      'Revenue Growth': `${s.revenueGrowth}%`,
      'Market Cap': formatMarketCap(s.marketCap),
    },
  }));
}

function generateMockProfile(entity: string): CompanyProfile {
  const upperEntity = entity.toUpperCase();
  return {
    symbol: upperEntity,
    name: entity,
    description: `${entity} is a company in the technology sector. A detailed profile would be generated with live Perplexity API integration.`,
    sector: 'Technology',
    industry: 'Software/Hardware',
    ceo: 'Chief Executive Officer',
    founded: '2000',
    headquarters: 'United States',
    employees: 10000,
    marketCap: 100e9,
    peRatio: 25,
    revenueGrowth: '15%',
    competitivePosition: 'Strong market position with established brand and growing market share.',
    recentDevelopments: [
      'Recent earnings beat analyst expectations',
      'Announced new product line expansion',
      'Strategic partnership announced',
    ],
    riskFactors: [
      'Competitive pressure from larger players',
      'Regulatory scrutiny in key markets',
      'Macroeconomic uncertainty',
    ],
    analystSentiment: 'neutral',
  };
}

function generateMockResearchReport(topic: string, focusAreas?: string[], symbols?: string[]): DeepResearchReport {
  return {
    id: `report-${Date.now()}`,
    title: `Deep Research: ${topic}`,
    topic,
    createdAt: new Date().toISOString(),
    executiveSummary: `This is a template research report on "${topic}". With live Perplexity API integration, this would contain comprehensive analysis drawing from multiple sources including SEC filings, earnings transcripts, news, and analyst reports.`,
    sections: [
      {
        title: 'Overview',
        content: `An overview of ${topic} would appear here with detailed analysis and data.`,
      },
      {
        title: 'Key Findings',
        content: focusAreas?.length
          ? `Analysis focusing on: ${focusAreas.join(', ')}`
          : 'Key findings and insights would be detailed in this section.',
      },
      {
        title: 'Market Analysis',
        content: symbols?.length
          ? `Analysis of related securities: ${symbols.join(', ')}`
          : 'Market context and competitive landscape analysis.',
      },
      {
        title: 'Risk Assessment',
        content: 'Risk factors and potential headwinds would be analyzed here.',
      },
    ],
    conclusions: [
      'Deep research provides comprehensive analysis',
      'Multiple sources are synthesized for insights',
      'Actionable conclusions are drawn from the data',
    ],
    sources: [
      { title: 'SEC Filings', url: 'https://sec.gov' },
      { title: 'Company Reports', url: '#' },
      { title: 'Industry Analysis', url: '#' },
    ],
  };
}

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap}`;
}
