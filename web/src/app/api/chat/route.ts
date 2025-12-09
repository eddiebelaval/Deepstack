import { streamText } from 'ai';
import { getProviderModel, providerConfig } from '@/lib/llm/providers';
import { TRADING_SYSTEM_PROMPT } from '@/lib/llm/system-prompt';
import { tradingTools } from '@/lib/llm/tools';
import type { LLMProvider } from '@/lib/stores/chat-store';

export const runtime = 'edge';
export const maxDuration = 60;

// Context interface for runtime information
interface TradingContext {
  activeSymbol?: string;
  activePanel?: string;
  positions?: Array<{ symbol: string; qty: number; unrealizedPL: number }>;
  watchlist?: string[];
  patterns?: Array<{ title: string; description: string; impact: string }>;
  // Prediction market context when viewing a specific market
  selectedMarket?: {
    id: string;
    platform: 'kalshi' | 'polymarket';
    title: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
    category?: string;
  };
}

function buildContextMessage(context?: TradingContext): string {
  if (!context) return '';

  const parts: string[] = [];

  if (context.activeSymbol) {
    parts.push(`Current active symbol: ${context.activeSymbol}`);
  }

  if (context.activePanel) {
    parts.push(`Currently viewing: ${context.activePanel} panel`);
  }

  if (context.positions && context.positions.length > 0) {
    const positionSummary = context.positions
      .slice(0, 5)
      .map(p => `${p.symbol}: ${p.qty} shares (${p.unrealizedPL >= 0 ? '+' : ''}$${p.unrealizedPL.toFixed(2)})`)
      .join(', ');
    parts.push(`Open positions: ${positionSummary}${context.positions.length > 5 ? ` (+${context.positions.length - 5} more)` : ''}`);
  }

  if (context.watchlist && context.watchlist.length > 0) {
    parts.push(`Watchlist: ${context.watchlist.slice(0, 10).join(', ')}`);
  }

  // Include user patterns for personalized responses
  if (context.patterns && context.patterns.length > 0) {
    const patternSummary = context.patterns
      .slice(0, 3)
      .map(p => `- ${p.title}: ${p.description}`)
      .join('\n');
    parts.push(`\n## User Trading Patterns (use these to personalize advice)\n${patternSummary}`);
  }

  // Include selected prediction market context
  if (context.selectedMarket) {
    const market = context.selectedMarket;
    const yesPct = Math.round(market.yesPrice * 100);
    const noPct = Math.round(market.noPrice * 100);
    const volumeFormatted = market.volume >= 1000000
      ? `$${(market.volume / 1000000).toFixed(1)}M`
      : `$${(market.volume / 1000).toFixed(0)}K`;

    parts.push(`\n## Selected Prediction Market\n` +
      `Market: "${market.title}"\n` +
      `Platform: ${market.platform}\n` +
      `YES: ${yesPct}% | NO: ${noPct}%\n` +
      `Volume: ${volumeFormatted}\n` +
      `Category: ${market.category || 'Unknown'}\n` +
      `\nConsider how this market's probability might inform trading decisions on related assets.`
    );
  }

  return parts.length > 0 ? `\n\n## Current Context\n${parts.join('\n')}` : '';
}

export async function POST(req: Request) {
  try {
    const { messages, provider = 'claude', context, useExtendedThinking = false } = await req.json();

    // Validate provider
    if (!providerConfig[provider as LLMProvider]) {
      return new Response('Invalid provider', { status: 400 });
    }

    // Get the model for the selected provider
    const model = getProviderModel(provider as LLMProvider);

    // Build system prompt with runtime context
    const contextMessage = buildContextMessage(context as TradingContext);
    const systemPrompt = TRADING_SYSTEM_PROMPT + contextMessage;

    // Prepare streamText options
    const streamOptions: any = {
      model,
      system: systemPrompt,
      messages,
      tools: tradingTools,
    };

    // Add extended thinking for supported Claude models
    if (useExtendedThinking && (provider === 'claude' || provider === 'claude_opus' || provider === 'claude_haiku')) {
      streamOptions.experimental_thinking = {
        type: 'enabled',
        budget_tokens: 10000,
      };
    }

    // Stream the response with tools enabled
    const result = await streamText(streamOptions);

    return result.toTextStreamResponse();
  } catch (error: any) {
    // Log full error server-side only
    console.error('Chat API error details:', error.stack || error);

    // Return user-friendly error messages without exposing internals
    if (error.message?.includes('API_KEY')) {
      return new Response(
        JSON.stringify({
          error: 'API key not configured for this provider. Please check your environment variables.',
          error_code: 'API_KEY_MISSING'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Unable to process your request. Please try again.',
        error_code: 'CHAT_ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
