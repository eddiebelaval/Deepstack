import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export interface SECFiling {
  content: string;
  citations: string[];
  filingType: string;
  symbol: string;
  query?: string;
  mock: boolean;
}

export interface EarningsTranscript {
  content: string;
  citations: string[];
  symbol: string;
  quarter?: string;
  year?: number;
  mock: boolean;
}

export interface MarketSummary {
  content: string;
  citations: string[];
  topics?: string[];
  sectors?: string[];
  mock: boolean;
  generatedAt: string;
}

export interface ScreenerResult {
  content: string;
  citations: string[];
  query: string;
  stocks: ScreenerStock[];
  mock: boolean;
}

export interface ScreenerStock {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  marketCap?: string;
  matchReason: string;
}

export interface CompanyProfile {
  content: string;
  citations: string[];
  entity: string;
  sections: ProfileSection[];
  mock: boolean;
}

export interface ProfileSection {
  title: string;
  content: string;
}

export interface DeepResearchReport {
  content: string;
  citations: string[];
  topic: string;
  focusAreas?: string[];
  generatedAt: string;
  mock: boolean;
}

// ============================================================================
// Store State
// ============================================================================

interface PerplexityFinanceState {
  // SEC Filings
  secFilings: SECFiling | null;
  secLoading: boolean;
  secError: string | null;

  // Earnings Transcripts
  earnings: EarningsTranscript | null;
  earningsLoading: boolean;
  earningsError: string | null;

  // Market Summary
  marketSummary: MarketSummary | null;
  marketSummaryLoading: boolean;
  marketSummaryError: string | null;

  // Natural Language Screener
  screenerResult: ScreenerResult | null;
  screenerLoading: boolean;
  screenerError: string | null;
  screenerHistory: string[];

  // Company Profile
  profile: CompanyProfile | null;
  profileLoading: boolean;
  profileError: string | null;

  // Deep Research
  research: DeepResearchReport | null;
  researchLoading: boolean;
  researchError: string | null;
  researchProgress: number; // 0-100

  // Actions
  searchSECFilings: (symbol: string, filingType?: string, query?: string) => Promise<void>;
  getEarningsTranscript: (symbol: string, quarter?: string, year?: number) => Promise<void>;
  getMarketSummary: (topics?: string[]) => Promise<void>;
  runScreener: (query: string) => Promise<void>;
  getCompanyProfile: (entity: string) => Promise<void>;
  generateDeepResearch: (topic: string, focusAreas?: string[]) => Promise<void>;

  // Utilities
  clearSECFilings: () => void;
  clearEarnings: () => void;
  clearMarketSummary: () => void;
  clearScreenerResult: () => void;
  clearProfile: () => void;
  clearResearch: () => void;
  clearAll: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const usePerplexityFinanceStore = create<PerplexityFinanceState>((set, get) => ({
  // Initial state
  secFilings: null,
  secLoading: false,
  secError: null,

  earnings: null,
  earningsLoading: false,
  earningsError: null,

  marketSummary: null,
  marketSummaryLoading: false,
  marketSummaryError: null,

  screenerResult: null,
  screenerLoading: false,
  screenerError: null,
  screenerHistory: [],

  profile: null,
  profileLoading: false,
  profileError: null,

  research: null,
  researchLoading: false,
  researchError: null,
  researchProgress: 0,

  // =========================================================================
  // SEC Filings
  // =========================================================================
  searchSECFilings: async (symbol, filingType = 'all', query) => {
    set({ secLoading: true, secError: null });

    try {
      const response = await fetch('/api/perplexity/sec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, filingType, query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to search SEC filings: ${response.statusText}`);
      }

      const data = await response.json();

      set({
        secFilings: {
          content: data.content,
          citations: data.citations || [],
          filingType,
          symbol: symbol.toUpperCase(),
          query,
          mock: data.mock ?? false,
        },
        secLoading: false,
      });
    } catch (error) {
      set({
        secError: error instanceof Error ? error.message : 'Failed to search SEC filings',
        secLoading: false,
      });
    }
  },

  // =========================================================================
  // Earnings Transcripts
  // =========================================================================
  getEarningsTranscript: async (symbol, quarter, year) => {
    set({ earningsLoading: true, earningsError: null });

    try {
      const response = await fetch('/api/perplexity/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, quarter, year }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get earnings transcript: ${response.statusText}`);
      }

      const data = await response.json();

      set({
        earnings: {
          content: data.content,
          citations: data.citations || [],
          symbol: symbol.toUpperCase(),
          quarter,
          year,
          mock: data.mock ?? false,
        },
        earningsLoading: false,
      });
    } catch (error) {
      set({
        earningsError: error instanceof Error ? error.message : 'Failed to get earnings transcript',
        earningsLoading: false,
      });
    }
  },

  // =========================================================================
  // Market Summary
  // =========================================================================
  getMarketSummary: async (topics) => {
    set({ marketSummaryLoading: true, marketSummaryError: null });

    try {
      const response = await fetch('/api/perplexity/market-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get market summary: ${response.statusText}`);
      }

      const data = await response.json();

      set({
        marketSummary: {
          content: data.content,
          citations: data.citations || [],
          topics,
          sectors: data.sectors,
          mock: data.mock ?? false,
          generatedAt: new Date().toISOString(),
        },
        marketSummaryLoading: false,
      });
    } catch (error) {
      set({
        marketSummaryError: error instanceof Error ? error.message : 'Failed to get market summary',
        marketSummaryLoading: false,
      });
    }
  },

  // =========================================================================
  // Natural Language Screener
  // =========================================================================
  runScreener: async (query) => {
    set({ screenerLoading: true, screenerError: null });

    try {
      // Add to history
      const currentHistory = get().screenerHistory;
      const newHistory = [query, ...currentHistory.filter(q => q !== query)].slice(0, 10);
      set({ screenerHistory: newHistory });

      const response = await fetch('/api/perplexity/screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to run screener: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse stocks from content if not provided separately
      const stocks = data.stocks || parseStocksFromContent(data.content);

      set({
        screenerResult: {
          content: data.content,
          citations: data.citations || [],
          query,
          stocks,
          mock: data.mock ?? false,
        },
        screenerLoading: false,
      });
    } catch (error) {
      set({
        screenerError: error instanceof Error ? error.message : 'Failed to run screener',
        screenerLoading: false,
      });
    }
  },

  // =========================================================================
  // Company Profile
  // =========================================================================
  getCompanyProfile: async (entity) => {
    set({ profileLoading: true, profileError: null });

    try {
      const response = await fetch('/api/perplexity/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get company profile: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse sections from content if not provided
      const sections = data.sections || parseProfileSections(data.content);

      set({
        profile: {
          content: data.content,
          citations: data.citations || [],
          entity,
          sections,
          mock: data.mock ?? false,
        },
        profileLoading: false,
      });
    } catch (error) {
      set({
        profileError: error instanceof Error ? error.message : 'Failed to get company profile',
        profileLoading: false,
      });
    }
  },

  // =========================================================================
  // Deep Research
  // =========================================================================
  generateDeepResearch: async (topic, focusAreas) => {
    set({ researchLoading: true, researchError: null, researchProgress: 0 });

    // Simulate progress (deep research takes longer)
    const progressInterval = setInterval(() => {
      const current = get().researchProgress;
      if (current < 90) {
        set({ researchProgress: current + 10 });
      }
    }, 2000);

    try {
      const response = await fetch('/api/perplexity/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, focusAreas }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Failed to generate research: ${response.statusText}`);
      }

      const data = await response.json();

      set({
        research: {
          content: data.content,
          citations: data.citations || [],
          topic,
          focusAreas,
          generatedAt: new Date().toISOString(),
          mock: data.mock ?? false,
        },
        researchLoading: false,
        researchProgress: 100,
      });
    } catch (error) {
      clearInterval(progressInterval);
      set({
        researchError: error instanceof Error ? error.message : 'Failed to generate research',
        researchLoading: false,
        researchProgress: 0,
      });
    }
  },

  // =========================================================================
  // Clear Actions
  // =========================================================================
  clearSECFilings: () => set({ secFilings: null, secError: null }),
  clearEarnings: () => set({ earnings: null, earningsError: null }),
  clearMarketSummary: () => set({ marketSummary: null, marketSummaryError: null }),
  clearScreenerResult: () => set({ screenerResult: null, screenerError: null }),
  clearProfile: () => set({ profile: null, profileError: null }),
  clearResearch: () => set({ research: null, researchError: null, researchProgress: 0 }),

  clearAll: () => set({
    secFilings: null,
    secError: null,
    earnings: null,
    earningsError: null,
    marketSummary: null,
    marketSummaryError: null,
    screenerResult: null,
    screenerError: null,
    profile: null,
    profileError: null,
    research: null,
    researchError: null,
    researchProgress: 0,
  }),
}));

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse stock symbols from screener content.
 * Looks for patterns like "AAPL", "$AAPL", or "Apple (AAPL)"
 */
function parseStocksFromContent(content: string): ScreenerStock[] {
  const stocks: ScreenerStock[] = [];

  // Pattern: $SYMBOL or (SYMBOL) or just SYMBOL in context
  const symbolPattern = /\$?([A-Z]{1,5})(?:\s|,|\.|$|\))/g;
  const matches = content.matchAll(symbolPattern);

  const seen = new Set<string>();
  for (const match of matches) {
    const symbol = match[1];
    if (!seen.has(symbol) && symbol.length >= 2) {
      seen.add(symbol);
      stocks.push({
        symbol,
        name: symbol, // Will be populated by component if needed
        matchReason: 'Mentioned in analysis',
      });
    }
    if (stocks.length >= 10) break;
  }

  return stocks;
}

/**
 * Parse profile content into sections.
 * Looks for markdown-style headers.
 */
function parseProfileSections(content: string): ProfileSection[] {
  const sections: ProfileSection[] = [];
  const lines = content.split('\n');

  let currentTitle = 'Overview';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for header (## Title or **Title**)
    const headerMatch = line.match(/^##\s+(.+)$/) || line.match(/^\*\*(.+)\*\*$/);

    if (headerMatch) {
      // Save previous section
      if (currentContent.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentContent.join('\n').trim(),
        });
      }
      currentTitle = headerMatch[1];
      currentContent = [];
    } else if (line.trim()) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentContent.join('\n').trim(),
    });
  }

  return sections;
}

// ============================================================================
// Selector Hooks
// ============================================================================

export const useSECFilings = () => {
  const { secFilings, secLoading, secError, searchSECFilings, clearSECFilings } =
    usePerplexityFinanceStore();
  return { secFilings, secLoading, secError, searchSECFilings, clearSECFilings };
};

export const useEarningsTranscripts = () => {
  const { earnings, earningsLoading, earningsError, getEarningsTranscript, clearEarnings } =
    usePerplexityFinanceStore();
  return { earnings, earningsLoading, earningsError, getEarningsTranscript, clearEarnings };
};

export const useMarketSummary = () => {
  const { marketSummary, marketSummaryLoading, marketSummaryError, getMarketSummary, clearMarketSummary } =
    usePerplexityFinanceStore();
  return { marketSummary, marketSummaryLoading, marketSummaryError, getMarketSummary, clearMarketSummary };
};

export const useScreener = () => {
  const { screenerResult, screenerLoading, screenerError, screenerHistory, runScreener, clearScreenerResult } =
    usePerplexityFinanceStore();
  return { screenerResult, screenerLoading, screenerError, screenerHistory, runScreener, clearScreenerResult };
};

export const useCompanyProfile = () => {
  const { profile, profileLoading, profileError, getCompanyProfile, clearProfile } =
    usePerplexityFinanceStore();
  return { profile, profileLoading, profileError, getCompanyProfile, clearProfile };
};

export const useDeepResearch = () => {
  const { research, researchLoading, researchError, researchProgress, generateDeepResearch, clearResearch } =
    usePerplexityFinanceStore();
  return { research, researchLoading, researchError, researchProgress, generateDeepResearch, clearResearch };
};
