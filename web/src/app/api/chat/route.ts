import { streamText } from 'ai';
import { getProviderModel, providerConfig } from '@/lib/llm/providers';
import { TRADING_SYSTEM_PROMPT } from '@/lib/llm/system-prompt';
// import { tradingTools } from '@/lib/llm/tools';
import type { LLMProvider } from '@/lib/stores/chat-store';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, provider = 'claude' } = await req.json();

    // Validate provider
    if (!providerConfig[provider as LLMProvider]) {
      return new Response('Invalid provider', { status: 400 });
    }

    // Get the model for the selected provider
    const model = getProviderModel(provider as LLMProvider);

    // Stream the response (tools temporarily disabled for basic chat)
    const result = await streamText({
      model,
      system: TRADING_SYSTEM_PROMPT,
      messages,
      // tools: tradingTools, // TODO: Fix tool schemas for AI SDK 5.0
    });

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
