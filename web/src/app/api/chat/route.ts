import { streamText } from 'ai';
import { getProviderModel, providerConfig } from '@/lib/llm/providers';
import { TRADING_SYSTEM_PROMPT } from '@/lib/llm/system-prompt';
import { tradingTools } from '@/lib/llm/tools';
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

    // Check if provider supports tools
    const supportsTools = providerConfig[provider as LLMProvider].supportsTools;

    // Stream the response
    const result = await streamText({
      model,
      system: TRADING_SYSTEM_PROMPT,
      messages,
      tools: supportsTools ? tradingTools : undefined,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Chat API error:', error);

    // Return user-friendly error messages
    if (error.message?.includes('API_KEY')) {
      return new Response(
        JSON.stringify({
          error: 'API key not configured for this provider. Please check your environment variables.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
