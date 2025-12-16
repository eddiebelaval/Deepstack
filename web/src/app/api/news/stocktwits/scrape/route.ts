/**
 * StockTwits Scraping API Endpoint
 *
 * Hybrid approach for StockTwits data:
 * - GET: Returns pending scrape info (URL, script) for Playwright
 * - POST: Accepts scraped data and returns normalized articles
 *
 * This enables browser-based scraping when the API is blocked by Cloudflare.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

/**
 * GET /api/news/stocktwits/scrape
 *
 * Returns pending scrape info for StockTwits when API is blocked.
 * The frontend/Playwright can use this to know what to scrape.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    // Get pending scrapes from backend
    const response = await fetch(`${BACKEND_URL}/api/news/sources/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to get scrape status', pending_scrapes: [] },
        { status: response.status }
      );
    }

    const healthData = await response.json();
    const pendingScrapes = healthData.pending_scrapes || [];

    // Check if there's a pending scrape for the requested symbol
    const scrapeKey = `stocktwits:${symbol || 'trending'}`;
    const hasPendingScrape = pendingScrapes.includes(scrapeKey);

    // Generate scrape info
    const scrapeUrl = symbol
      ? `https://stocktwits.com/symbol/${symbol}`
      : 'https://stocktwits.com/trending';

    const scrapeScript = generateScrapeScript(30);

    return NextResponse.json({
      pending: hasPendingScrape,
      scrape_info: hasPendingScrape
        ? {
            url: scrapeUrl,
            script: scrapeScript,
            symbol,
            limit: 30,
          }
        : null,
      all_pending: pendingScrapes,
      stocktwits_status: healthData.sources?.stocktwits || {},
    });
  } catch (error) {
    console.error('Error getting scrape info:', error);
    return NextResponse.json(
      { error: 'Internal server error', pending_scrapes: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/news/stocktwits/scrape
 *
 * Accepts scraped StockTwits data and returns normalized articles.
 * Call this after executing the scrape script in Playwright.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, scraped_data } = body;

    if (!scraped_data) {
      return NextResponse.json(
        { error: 'Missing scraped_data in request body' },
        { status: 400 }
      );
    }

    // Send scraped data to backend for parsing
    const response = await fetch(
      `${BACKEND_URL}/api/news/stocktwits/parse-scraped`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, scraped_data }),
      }
    );

    if (!response.ok) {
      // If backend doesn't have the parse endpoint yet, parse locally
      const articles = parseScrapedDataLocally(scraped_data, symbol);
      return NextResponse.json({
        articles,
        count: articles.length,
        source: 'local_parse',
      });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing scraped data:', error);
    return NextResponse.json(
      { error: 'Failed to process scraped data', articles: [] },
      { status: 500 }
    );
  }
}

/**
 * Generate JavaScript for scraping StockTwits messages.
 * This runs in the browser context via Playwright.
 */
function generateScrapeScript(limit: number = 30): string {
  return `
    () => {
      const articles = document.querySelectorAll('article');
      const messages = [];

      articles.forEach((article, idx) => {
        if (idx >= ${limit}) return;

        // Skip ad articles
        if (article.className.includes('Ad') ||
            article.className.includes('sponsored')) return;

        // Extract body text (includes sentiment at end)
        const bodyEl = article.querySelector('[class*="body"]') ||
                       article.querySelector('[class*="Body"]') ||
                       article.querySelector('[class*="text"]');
        const body = bodyEl?.textContent?.trim() || '';

        // Skip empty messages
        if (!body || body.length < 3) return;

        // Get time
        const timeEl = article.querySelector('time');
        const time = timeEl?.getAttribute('datetime') ||
                     timeEl?.textContent || '';

        // Get all links for username and message URL
        const links = Array.from(article.querySelectorAll('a'))
          .map(a => ({
            href: a.href,
            text: a.textContent?.trim()
          }))
          .filter(l => l.href.includes('stocktwits.com'))
          .slice(0, 4);

        messages.push({
          body,
          time,
          links
        });
      });

      return {
        success: true,
        count: messages.length,
        messages
      };
    }
  `;
}

/**
 * Parse scraped data locally (fallback if backend endpoint not available)
 */
function parseScrapedDataLocally(
  scrapedData: { success?: boolean; messages?: Array<{
    body: string;
    time: string;
    links: Array<{ href: string; text: string }>;
  }> },
  symbol: string | null
): Array<{
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  source_provider: string;
  publishedAt: string;
  symbols: string[];
  author: string;
  sentiment: string;
  sentiment_score: number;
  imageUrl: string;
}> {
  if (!scrapedData?.success || !scrapedData?.messages) {
    return [];
  }

  return scrapedData.messages.map((msg, idx) => {
    const body = msg.body || '';
    const links = msg.links || [];

    // Extract username from links
    let username = 'unknown';
    let messageUrl = '';
    for (const link of links) {
      if (link.href?.includes('/message/')) {
        messageUrl = link.href;
      } else if (link.text && !messageUrl) {
        username = link.text;
      }
    }

    // Extract message ID
    const msgIdMatch = messageUrl.match(/\/message\/(\d+)/);
    const msgId = msgIdMatch?.[1] || `local_${idx}_${Date.now()}`;

    // Extract sentiment
    let sentiment = 'neutral';
    let sentimentScore = 0;
    const bodyLower = body.toLowerCase();
    if (bodyLower.endsWith('bullish')) {
      sentiment = 'bullish';
      sentimentScore = 1;
    } else if (bodyLower.endsWith('bearish')) {
      sentiment = 'bearish';
      sentimentScore = -1;
    }

    // Clean body text
    const cleanBody = body.replace(/\s*(Bullish|Bearish)\s*$/i, '').trim();

    // Extract symbols
    const symbolMatches = body.match(/\$([A-Z]{1,5})/g) || [];
    const symbols = [...new Set(symbolMatches.map(s => s.replace('$', '')))];
    if (symbols.length === 0 && symbol) {
      symbols.push(symbol.toUpperCase());
    }

    // Create headline
    const headline =
      cleanBody.length > 100
        ? cleanBody.substring(0, 97) + '...'
        : cleanBody;

    return {
      id: `stocktwits_${msgId}`,
      headline,
      summary: cleanBody,
      url: messageUrl || `https://stocktwits.com/${username}/message/${msgId}`,
      source: 'StockTwits',
      source_provider: 'stocktwits',
      publishedAt: msg.time || new Date().toISOString(),
      symbols,
      author: `@${username}`,
      sentiment,
      sentiment_score: sentimentScore,
      imageUrl: '',
    };
  });
}
