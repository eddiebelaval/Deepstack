import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';
import { getPerplexityClient } from '@/lib/perplexity/client';

// Mock company profiles
const MOCK_PROFILES: Record<string, object> = {
  'NVDA': {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    description: 'NVIDIA designs and sells GPUs, System-on-Chips, and related software for gaming, professional visualization, data center, and automotive markets.',
    sector: 'Technology',
    industry: 'Semiconductors',
    ceo: 'Jensen Huang',
    founded: '1993',
    headquarters: 'Santa Clara, California',
    employees: 29600,
    marketCap: 3.5e12,
    peRatio: 65,
    revenueGrowth: '94%',
    competitivePosition: 'Dominant leader in AI/ML accelerators with CUDA ecosystem moat',
    recentDevelopments: [
      'Blackwell architecture launch with record demand',
      'Data Center revenue up 112% YoY',
      'Expanded sovereign AI partnerships',
    ],
    riskFactors: [
      'High valuation multiples',
      'Customer concentration (hyperscalers)',
      'Geopolitical export restrictions',
    ],
    analystSentiment: 'bullish',
  },
  'AAPL': {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    ceo: 'Tim Cook',
    founded: '1976',
    headquarters: 'Cupertino, California',
    employees: 164000,
    marketCap: 3.6e12,
    peRatio: 32,
    revenueGrowth: '2%',
    competitivePosition: 'Strong brand loyalty and integrated ecosystem',
    recentDevelopments: [
      'Apple Intelligence AI features rolling out',
      'Services revenue at all-time high',
      'iPhone 16 launch with strong early demand',
    ],
    riskFactors: [
      'iPhone revenue growth stagnation',
      'China market challenges',
      'Regulatory scrutiny (app store)',
    ],
    analystSentiment: 'neutral',
  },
};

function generateGenericProfile(entity: string) {
  return {
    symbol: entity.toUpperCase(),
    name: entity,
    description: `Profile for ${entity} would be generated with Perplexity API integration.`,
    sector: 'Unknown',
    industry: 'Unknown',
    ceo: 'Not Available',
    founded: 'Unknown',
    headquarters: 'Unknown',
    employees: 0,
    marketCap: 0,
    competitivePosition: 'Analysis requires Perplexity API configuration.',
    recentDevelopments: ['Configure PERPLEXITY_API_KEY for live company profiles'],
    riskFactors: ['Data unavailable without API integration'],
    analystSentiment: 'neutral',
  };
}

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute for profiles
  const rateLimit = checkRateLimit(request, { limit: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const body = await request.json();
    const { entity, focus_areas } = body;

    if (!entity) {
      return NextResponse.json(
        { error: 'Entity parameter is required' },
        { status: 400 }
      );
    }

    // Try Perplexity API first
    const client = getPerplexityClient();

    if (client.isConfigured()) {
      try {
        const result = await client.buildProfile({
          entity,
          focusAreas: focus_areas,
        });

        return NextResponse.json({
          profile: {
            entity,
            content: result.content,
            citations: result.citations,
            focusAreas: focus_areas,
          },
          mock: result.mock,
        });
      } catch (error) {
        console.warn('Perplexity API failed, falling back to mock data:', error);
      }
    }

    // Fallback to mock data
    const upperEntity = entity.toUpperCase();
    const mockProfile = MOCK_PROFILES[upperEntity] || generateGenericProfile(entity);

    return NextResponse.json({
      profile: mockProfile,
      mock: true,
      note: 'Using mock data. Configure PERPLEXITY_API_KEY for comprehensive profiles.',
    });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Failed to build company profile' },
      { status: 500 }
    );
  }
}
