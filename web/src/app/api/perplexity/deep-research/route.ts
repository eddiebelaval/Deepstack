import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';
import { getPerplexityClient } from '@/lib/perplexity/client';

function generateMockReport(topic: string, focusAreas?: string[], symbols?: string[]) {
  return {
    id: `report-${Date.now()}`,
    title: `Deep Research: ${topic}`,
    topic,
    createdAt: new Date().toISOString(),
    executiveSummary: `This is a template research report on "${topic}". With Perplexity API integration, this would contain comprehensive analysis drawing from multiple sources including SEC filings, earnings transcripts, news, and analyst reports.`,
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
    ],
    focusAreas,
    symbols,
  };
}

export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per minute for deep research (expensive)
  const rateLimit = checkRateLimit(request, { limit: 5, windowMs: 60000 });
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    const body = await request.json();
    const { topic, focus_areas, symbols } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic parameter is required' },
        { status: 400 }
      );
    }

    // Try Perplexity API first
    const client = getPerplexityClient();

    if (client.isConfigured()) {
      try {
        const result = await client.deepResearch({
          topic,
          focusAreas: focus_areas,
          symbols,
        });

        return NextResponse.json({
          report: {
            id: `report-${Date.now()}`,
            title: `Deep Research: ${topic}`,
            topic,
            createdAt: new Date().toISOString(),
            content: result.content,
            citations: result.citations,
            focusAreas: focus_areas,
            symbols,
          },
          creditCost: 50,
          mock: result.mock,
        });
      } catch (error) {
        console.warn('Perplexity API failed, falling back to mock data:', error);
      }
    }

    // Fallback to mock report
    const mockReport = generateMockReport(topic, focus_areas, symbols);

    return NextResponse.json({
      report: mockReport,
      creditCost: 50,
      mock: true,
      note: 'Using template report. Configure PERPLEXITY_API_KEY for comprehensive research.',
    });
  } catch (error) {
    console.error('Deep research error:', error);
    return NextResponse.json(
      { error: 'Failed to generate deep research report' },
      { status: 500 }
    );
  }
}
