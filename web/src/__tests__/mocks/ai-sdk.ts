/**
 * AI SDK Mock
 *
 * Provides mock implementations for Vercel AI SDK streaming responses.
 * Supports text streaming, tool calls, and error scenarios.
 */
import { vi } from 'vitest';

// Mock response configurations
interface StreamConfig {
  chunks?: string[];
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
  error?: Error;
  delay?: number;
}

let streamConfig: StreamConfig = {
  chunks: ['Hello, ', "I'm ", 'your AI ', 'trading assistant.'],
};

/**
 * Configure the mock stream behavior
 */
export function configureStream(config: StreamConfig) {
  streamConfig = { ...streamConfig, ...config };
}

/**
 * Reset stream configuration to default
 */
export function resetStreamConfig() {
  streamConfig = {
    chunks: ['Hello, ', "I'm ", 'your AI ', 'trading assistant.'],
  };
}

/**
 * Create an async iterable that mimics AI SDK text stream
 */
async function* createTextStream(chunks: string[], delay = 0): AsyncIterable<string> {
  for (const chunk of chunks) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    yield chunk;
  }
}

/**
 * Mock streamText function from 'ai' package
 */
export const mockStreamText = vi.fn(async (options: {
  model: unknown;
  system?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: Record<string, unknown>;
}) => {
  if (streamConfig.error) {
    throw streamConfig.error;
  }

  const chunks = streamConfig.chunks || [];
  const fullText = chunks.join('');

  return {
    // Text stream for streaming responses
    textStream: createTextStream(chunks, streamConfig.delay),

    // Full text promise
    text: Promise.resolve(fullText),

    // Tool calls if any
    toolCalls: streamConfig.toolCalls || [],

    // Tool results
    toolResults: (streamConfig.toolCalls || []).map((tc) => ({
      toolName: tc.name,
      args: tc.args,
      result: tc.result,
    })),

    // Usage information
    usage: Promise.resolve({
      promptTokens: 100,
      completionTokens: chunks.join('').length,
      totalTokens: 100 + chunks.join('').length,
    }),

    // Response methods
    toTextStreamResponse: vi.fn(() => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }),

    toDataStreamResponse: vi.fn(() => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // AI SDK data stream format
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
          }
          controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }),
  };
});

/**
 * Mock generateText function from 'ai' package
 */
export const mockGenerateText = vi.fn(async (options: {
  model: unknown;
  system?: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
}) => {
  if (streamConfig.error) {
    throw streamConfig.error;
  }

  const text = (streamConfig.chunks || []).join('');

  return {
    text,
    toolCalls: streamConfig.toolCalls || [],
    toolResults: (streamConfig.toolCalls || []).map((tc) => ({
      toolName: tc.name,
      args: tc.args,
      result: tc.result,
    })),
    usage: {
      promptTokens: 100,
      completionTokens: text.length,
      totalTokens: 100 + text.length,
    },
    finishReason: 'stop',
  };
});

/**
 * Mock AI SDK module
 */
export const mockAiSdk = {
  streamText: mockStreamText,
  generateText: mockGenerateText,
};
