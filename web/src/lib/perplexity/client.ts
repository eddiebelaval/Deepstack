/**
 * Perplexity Finance API Client
 *
 * This client provides methods to interact with Perplexity's API for
 * financial research including SEC filings, market intelligence, and more.
 */

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  stream?: boolean;
  search_mode?: 'sec' | 'finance' | 'default';
  search_after_date_filter?: string;
  max_tokens?: number;
  temperature?: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  citations?: string[];
}

export interface PerplexityFinanceConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_MODEL = 'sonar-pro';

export class PerplexityFinanceClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: PerplexityFinanceConfig = {}) {
    this.apiKey = config.apiKey || process.env.PERPLEXITY_API_KEY || '';
    this.model = config.model || process.env.PERPLEXITY_MODEL || DEFAULT_MODEL;
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.2;

    if (!this.apiKey) {
      console.warn('Perplexity API key not configured. Finance features will use mock data.');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search SEC filings for a company
   */
  async searchSECFilings(params: {
    symbol: string;
    filingType?: string;
    query?: string;
    dateAfter?: string;
  }): Promise<{
    content: string;
    citations: string[];
    mock: boolean;
  }> {
    if (!this.isConfigured()) {
      return {
        content: `SEC filing search for ${params.symbol} requires Perplexity API configuration.`,
        citations: [],
        mock: true,
      };
    }

    const prompt = buildSECPrompt(params);

    try {
      const response = await this.query({
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst expert at extracting and summarizing SEC filing information. Provide structured, actionable insights from regulatory filings.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        searchMode: 'sec',
        dateAfter: params.dateAfter,
      });

      return {
        content: response.content,
        citations: response.citations,
        mock: false,
      };
    } catch (error) {
      console.error('Perplexity SEC search error:', error);
      return {
        content: `Failed to search SEC filings for ${params.symbol}. Please try again later.`,
        citations: [],
        mock: true,
      };
    }
  }

  /**
   * Get AI-synthesized market summary
   */
  async getMarketSummary(params: {
    focus?: string[];
    symbols?: string[];
  }): Promise<{
    content: string;
    citations: string[];
    mock: boolean;
  }> {
    if (!this.isConfigured()) {
      return {
        content: 'Market summary requires Perplexity API configuration.',
        citations: [],
        mock: true,
      };
    }

    const prompt = buildMarketSummaryPrompt(params);

    try {
      const response = await this.query({
        messages: [
          {
            role: 'system',
            content: 'You are a market analyst providing real-time market intelligence. Synthesize current market conditions, sector performance, key movers, risks and opportunities into actionable insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return {
        content: response.content,
        citations: response.citations,
        mock: false,
      };
    } catch (error) {
      console.error('Perplexity market summary error:', error);
      return {
        content: 'Failed to generate market summary. Please try again later.',
        citations: [],
        mock: true,
      };
    }
  }

  /**
   * Search earnings transcripts
   */
  async searchEarningsTranscripts(params: {
    symbol: string;
    quarter?: string;
    query?: string;
  }): Promise<{
    content: string;
    citations: string[];
    mock: boolean;
  }> {
    if (!this.isConfigured()) {
      return {
        content: `Earnings transcript search for ${params.symbol} requires Perplexity API configuration.`,
        citations: [],
        mock: true,
      };
    }

    const prompt = buildEarningsPrompt(params);

    try {
      const response = await this.query({
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing earnings call transcripts. Extract key takeaways, management guidance, tone, and important Q&A highlights. Be specific and actionable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return {
        content: response.content,
        citations: response.citations,
        mock: false,
      };
    } catch (error) {
      console.error('Perplexity earnings search error:', error);
      return {
        content: `Failed to search earnings transcripts for ${params.symbol}. Please try again later.`,
        citations: [],
        mock: true,
      };
    }
  }

  /**
   * Natural language stock screening
   */
  async naturalLanguageScreen(params: {
    query: string;
    limit?: number;
  }): Promise<{
    content: string;
    citations: string[];
    mock: boolean;
  }> {
    if (!this.isConfigured()) {
      return {
        content: 'Natural language screening requires Perplexity API configuration.',
        citations: [],
        mock: true,
      };
    }

    const prompt = buildScreenerPrompt(params);

    try {
      const response = await this.query({
        messages: [
          {
            role: 'system',
            content: 'You are a stock screener assistant. Given a natural language query about stocks, identify companies that match the criteria. Include ticker symbols, key metrics, and brief explanations for why each stock matches. Format as a structured list.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return {
        content: response.content,
        citations: response.citations,
        mock: false,
      };
    } catch (error) {
      console.error('Perplexity screener error:', error);
      return {
        content: 'Failed to run natural language screen. Please try again later.',
        citations: [],
        mock: true,
      };
    }
  }

  /**
   * Build company profile
   */
  async buildProfile(params: {
    entity: string;
    focusAreas?: string[];
  }): Promise<{
    content: string;
    citations: string[];
    mock: boolean;
  }> {
    if (!this.isConfigured()) {
      return {
        content: `Company profile for ${params.entity} requires Perplexity API configuration.`,
        citations: [],
        mock: true,
      };
    }

    const prompt = buildProfilePrompt(params);

    try {
      const response = await this.query({
        messages: [
          {
            role: 'system',
            content: 'You are a research analyst creating comprehensive company profiles. Include business description, sector/industry, leadership, financials, competitive position, recent developments, and key risks. Be thorough but concise.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return {
        content: response.content,
        citations: response.citations,
        mock: false,
      };
    } catch (error) {
      console.error('Perplexity profile error:', error);
      return {
        content: `Failed to build profile for ${params.entity}. Please try again later.`,
        citations: [],
        mock: true,
      };
    }
  }

  /**
   * Generate deep research report
   */
  async deepResearch(params: {
    topic: string;
    focusAreas?: string[];
    symbols?: string[];
  }): Promise<{
    content: string;
    citations: string[];
    mock: boolean;
  }> {
    if (!this.isConfigured()) {
      return {
        content: `Deep research on "${params.topic}" requires Perplexity API configuration.`,
        citations: [],
        mock: true,
      };
    }

    const prompt = buildDeepResearchPrompt(params);

    try {
      // Use the deep research model for comprehensive analysis
      const response = await this.query({
        messages: [
          {
            role: 'system',
            content: 'You are a senior research analyst producing comprehensive research reports. Generate detailed, well-structured analysis with executive summary, key findings, data-driven insights, risk assessment, and actionable conclusions. Cite sources throughout.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'sonar-deep-research',
      });

      return {
        content: response.content,
        citations: response.citations,
        mock: false,
      };
    } catch (error) {
      console.error('Perplexity deep research error:', error);
      return {
        content: `Failed to generate deep research on "${params.topic}". Please try again later.`,
        citations: [],
        mock: true,
      };
    }
  }

  /**
   * Core query method
   */
  private async query(params: {
    messages: PerplexityMessage[];
    searchMode?: 'sec' | 'finance' | 'default';
    dateAfter?: string;
    model?: string;
  }): Promise<{
    content: string;
    citations: string[];
  }> {
    const request: PerplexityRequest = {
      model: params.model || this.model,
      messages: params.messages,
      stream: false,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    };

    if (params.searchMode === 'sec') {
      request.search_mode = 'sec';
    }

    if (params.dateAfter) {
      request.search_after_date_filter = params.dateAfter;
    }

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data: PerplexityResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      citations: data.citations || [],
    };
  }
}

// Prompt builders
function buildSECPrompt(params: {
  symbol: string;
  filingType?: string;
  query?: string;
}): string {
  let prompt = `Search SEC filings for ${params.symbol}`;

  if (params.filingType && params.filingType !== 'all') {
    prompt += ` (${params.filingType} filings)`;
  }

  prompt += '.\n\n';

  if (params.query) {
    prompt += `Focus on information related to: ${params.query}\n\n`;
  }

  prompt += `Provide:
1. Summary of the most recent relevant filing
2. Key financial highlights and metrics
3. Important disclosures or risk factors
4. Any forward-looking statements or guidance
5. Notable changes from previous filings

Format the response with clear sections and specific numbers/data where available.`;

  return prompt;
}

function buildMarketSummaryPrompt(params: {
  focus?: string[];
  symbols?: string[];
}): string {
  let prompt = 'Provide a comprehensive summary of current market conditions.\n\n';

  if (params.focus?.length) {
    prompt += `Focus areas: ${params.focus.join(', ')}\n\n`;
  }

  if (params.symbols?.length) {
    prompt += `Include analysis for these symbols: ${params.symbols.join(', ')}\n\n`;
  }

  prompt += `Include:
1. Overall market direction and sentiment
2. Sector performance highlights (Technology, Healthcare, Energy, Financials, etc.)
3. Top movers with reasons for significant moves
4. Key risks and headwinds
5. Emerging opportunities
6. Important economic data or events impacting markets

Be specific with numbers, percentages, and data points. Make it actionable for traders.`;

  return prompt;
}

function buildEarningsPrompt(params: {
  symbol: string;
  quarter?: string;
  query?: string;
}): string {
  let prompt = `Analyze the earnings call transcript for ${params.symbol}`;

  if (params.quarter) {
    prompt += ` (${params.quarter})`;
  }

  prompt += '.\n\n';

  if (params.query) {
    prompt += `Specifically focus on: ${params.query}\n\n`;
  }

  prompt += `Extract and summarize:
1. Key financial results vs expectations
2. Management's key messages and tone (optimistic, cautious, defensive)
3. Forward guidance and outlook
4. Important Q&A highlights from analysts
5. Strategic initiatives mentioned
6. Any concerns or risks discussed

Be specific with numbers and quotes where relevant.`;

  return prompt;
}

function buildScreenerPrompt(params: {
  query: string;
  limit?: number;
}): string {
  const limit = params.limit || 10;

  return `Find stocks matching this criteria: "${params.query}"

Identify up to ${limit} stocks that match the criteria. For each stock provide:
- Ticker symbol
- Company name
- Current price and market cap
- Why it matches the criteria (specific metrics)
- Brief investment consideration

Format as a structured list. Include actual current data where possible.`;
}

function buildProfilePrompt(params: {
  entity: string;
  focusAreas?: string[];
}): string {
  let prompt = `Create a comprehensive profile of ${params.entity}.\n\n`;

  if (params.focusAreas?.length) {
    prompt += `Focus especially on: ${params.focusAreas.join(', ')}\n\n`;
  }

  prompt += `Include:
1. Business Overview - what the company does, main products/services
2. Industry & Sector classification
3. Leadership - CEO, key executives
4. Financial Highlights - revenue, growth, profitability, valuation
5. Competitive Position - market share, competitive advantages/moats
6. Recent Developments - last 6 months of significant news/events
7. Risk Factors - key risks to the business
8. Analyst Sentiment - general view from analysts

Be specific with data and make it useful for investment research.`;

  return prompt;
}

function buildDeepResearchPrompt(params: {
  topic: string;
  focusAreas?: string[];
  symbols?: string[];
}): string {
  let prompt = `Conduct comprehensive research on: ${params.topic}\n\n`;

  if (params.focusAreas?.length) {
    prompt += `Key areas to analyze:\n${params.focusAreas.map(a => `- ${a}`).join('\n')}\n\n`;
  }

  if (params.symbols?.length) {
    prompt += `Relevant securities to consider: ${params.symbols.join(', ')}\n\n`;
  }

  prompt += `Generate a detailed research report including:

1. Executive Summary (2-3 paragraphs)
2. Background & Context
3. Key Findings (data-driven analysis)
4. Market Analysis & Competitive Landscape
5. Risk Assessment
6. Future Outlook & Projections
7. Investment Implications
8. Conclusions & Recommendations

Use specific data, cite sources, and provide actionable insights. This should be a comprehensive report suitable for investment decision-making.`;

  return prompt;
}

// Default client instance
let defaultClient: PerplexityFinanceClient | null = null;

export function getPerplexityClient(): PerplexityFinanceClient {
  if (!defaultClient) {
    defaultClient = new PerplexityFinanceClient();
  }
  return defaultClient;
}
