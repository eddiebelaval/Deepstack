import { streamText } from 'ai';
import { getProviderModel, providerConfig } from '@/lib/llm/providers';
import { tradingTools } from '@/lib/llm/tools';
import type { LLMProvider } from '@/lib/stores/chat-store';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-server';
import type { NextRequest } from 'next/server';
import { buildRAGContext } from '@/lib/embeddings/context-builder';
import { buildPersonaPrompt } from '@/lib/personas/build-persona-prompt';
import { getPersona, DEFAULT_PERSONA_ID } from '@/lib/personas/persona-configs';
import type { PersonaId } from '@/lib/types/persona';
import { createClient } from '@/lib/supabase/server';

// Removed edge runtime to support server-side Supabase auth for RAG
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
  // Investment thesis data for semantic awareness
  activeTheses?: Array<{
    id: string;
    symbol: string;
    hypothesis: string;
    timeframe: string;
    targetEntry?: number;
    targetExit?: number;
    stopLoss?: number;
    confidence: number;
    status: 'drafting' | 'active' | 'validated' | 'invalidated' | 'archived';
  }>;
  // Journal entries for emotional awareness
  recentJournal?: Array<{
    id: string;
    symbol?: string;
    content: string;
    emotions: string[];
    createdAt: string;
  }>;
  // Emotional firewall state
  emotionalState?: {
    isTriggered: boolean;
    triggerReason?: string;
    cooldownEndsAt?: string;
    recentEmotions?: string[];
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

  // Include active investment theses for semantic awareness
  if (context.activeTheses && context.activeTheses.length > 0) {
    const thesesSummary = context.activeTheses
      .filter(t => t.status === 'active' || t.status === 'drafting')
      .slice(0, 5)
      .map(t => {
        const targets = [];
        if (t.targetEntry) targets.push(`entry: $${t.targetEntry}`);
        if (t.targetExit) targets.push(`exit: $${t.targetExit}`);
        if (t.stopLoss) targets.push(`stop: $${t.stopLoss}`);
        const targetStr = targets.length > 0 ? ` (${targets.join(', ')})` : '';
        return `- ${t.symbol}: "${t.hypothesis}" [${t.timeframe}, ${t.confidence}% confidence]${targetStr}`;
      })
      .join('\n');

    if (thesesSummary) {
      parts.push(`\n## Active Investment Theses\n` +
        `These are the user's current investment hypotheses. Reference them when discussing related symbols:\n${thesesSummary}`
      );
    }
  }

  // Include recent journal entries for emotional awareness
  if (context.recentJournal && context.recentJournal.length > 0) {
    const emotionCounts: Record<string, number> = {};
    context.recentJournal.forEach(entry => {
      entry.emotions?.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });

    const topEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion]) => emotion);

    const recentEntries = context.recentJournal
      .slice(0, 3)
      .map(entry => {
        const symbolStr = entry.symbol ? `[${entry.symbol}] ` : '';
        const emotionStr = entry.emotions?.length > 0 ? ` (${entry.emotions.join(', ')})` : '';
        const preview = entry.content.length > 100 ? entry.content.slice(0, 100) + '...' : entry.content;
        return `- ${symbolStr}${preview}${emotionStr}`;
      })
      .join('\n');

    parts.push(`\n## Recent Journal & Emotional State\n` +
      `Recent emotional patterns: ${topEmotions.length > 0 ? topEmotions.join(', ') : 'none recorded'}\n` +
      `Recent entries:\n${recentEntries}\n` +
      `Consider the user's emotional state when providing advice.`
    );
  }

  // Include emotional firewall state if triggered
  if (context.emotionalState?.isTriggered) {
    const cooldownInfo = context.emotionalState.cooldownEndsAt
      ? `Cooldown ends: ${new Date(context.emotionalState.cooldownEndsAt).toLocaleTimeString()}`
      : '';
    parts.push(`\n## ⚠️ EMOTIONAL FIREWALL ACTIVE\n` +
      `Reason: ${context.emotionalState.triggerReason || 'Emotional state detected'}\n` +
      `${cooldownInfo}\n` +
      `IMPORTANT: The user may be in an elevated emotional state. Be extra cautious with any trade-related advice. ` +
      `Encourage stepping back, reviewing their thesis, and avoiding impulsive decisions.`
    );
  }

  return parts.length > 0 ? `\n\n## Current Context\n${parts.join('\n')}` : '';
}

export async function POST(req: Request) {
  try {
    // Apply rate limiting: 20 requests per minute per IP
    const rateLimit = checkRateLimit(req as NextRequest, { limit: 20, windowMs: 60000 });
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime);
    }

    const {
      messages,
      provider = 'claude',
      context,
      useExtendedThinking = false,
      personaId = DEFAULT_PERSONA_ID
    } = await req.json();

    // Validate provider
    if (!providerConfig[provider as LLMProvider]) {
      return new Response('Invalid provider', { status: 400 });
    }

    // Get the model for the selected provider
    const model = getProviderModel(provider as LLMProvider);

    // Build persona-enhanced base system prompt
    const persona = getPersona(personaId as PersonaId);
    const baseSystemPrompt = buildPersonaPrompt(persona);

    // Build runtime context message
    const contextMessage = buildContextMessage(context as TradingContext);

    // Attempt to get authenticated user for RAG context
    let ragContext = '';
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && messages.length > 0) {
        // Get the latest user message for RAG retrieval
        const latestUserMessage = [...messages].reverse().find(
          (m: { role: string; content: string }) => m.role === 'user'
        );

        if (latestUserMessage?.content) {
          const ragResult = await buildRAGContext(
            user.id,
            latestUserMessage.content,
            {
              maxTokens: 3000,
              symbol: (context as TradingContext)?.activeSymbol,
            }
          );

          if (ragResult.contextText) {
            ragContext = ragResult.contextText;
          }
        }
      }
    } catch (ragError) {
      // Graceful degradation: RAG context is optional
      console.warn('RAG context retrieval failed (non-critical):', ragError);
    }

    // Combine everything: persona prompt + runtime context + RAG context
    const systemPrompt = baseSystemPrompt + contextMessage + (ragContext ? `\n\n${ragContext}` : '');

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
    const result = streamText(streamOptions);

    // Create a custom stream that includes tool results
    // Format: "0:text" for text, "9:toolCall" for tool calls, "a:toolResult" for results
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(part.text)}\n`));
            } else if (part.type === 'tool-call') {
              controller.enqueue(encoder.encode(`9:${JSON.stringify({
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: part.input,
              })}\n`));
            } else if (part.type === 'tool-result') {
              controller.enqueue(encoder.encode(`a:${JSON.stringify({
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                result: part.output,
              })}\n`));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
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
