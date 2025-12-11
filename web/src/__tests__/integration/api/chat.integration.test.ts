/**
 * Chat API Integration Tests
 *
 * Tests the /api/chat endpoint including:
 * - Rate limiting
 * - Provider selection and validation
 * - Context passing
 * - Error handling
 * - Streaming responses
 * - Extended thinking mode
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/chat/route';
import { createRequest } from '../test-utils';
import { mockStreamText, configureStream, resetStreamConfig } from '../../mocks/ai-sdk';

// Mock rate limiter - bypass rate limiting in tests
vi.mock('@/lib/rate-limit-server', () => ({
  checkRateLimit: vi.fn(() => ({
    success: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
  })),
  rateLimitResponse: vi.fn(() => new Response(
    JSON.stringify({ error: 'Too many requests', message: 'Please try again later' }),
    {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Reset': String(Math.ceil((Date.now() + 60000) / 1000)),
      },
    }
  )),
}));

// Mock AI SDK
vi.mock('ai', () => ({
  streamText: mockStreamText,
}));

// Mock LLM providers to avoid needing real API keys
vi.mock('@/lib/llm/providers', () => ({
  providerConfig: {
    claude: {
      name: 'Sonnet 4.5',
      description: 'Best for everyday tasks',
      icon: 'Brain',
      color: 'var(--ds-claude)',
      supportsTools: true,
    },
    claude_opus: {
      name: 'Opus 4.5',
      description: 'Most capable for complex work',
      icon: 'Brain',
      color: 'var(--ds-claude)',
      supportsTools: true,
    },
    claude_haiku: {
      name: 'Haiku 4.5',
      description: 'Fastest for quick answers',
      icon: 'Brain',
      color: 'var(--ds-claude)',
      supportsTools: true,
    },
    grok: {
      name: 'Grok',
      description: 'Fast analysis',
      icon: 'Zap',
      color: 'var(--ds-grok)',
      supportsTools: true,
    },
  },
  getProviderModel: vi.fn((provider: string) => `mock-model-${provider}`),
}));

// Mock trading tools
vi.mock('@/lib/llm/tools', () => ({
  tradingTools: {
    analyzeStock: {
      description: 'Analyze a stock',
      parameters: {},
    },
  },
}));

// Mock system prompt
vi.mock('@/lib/llm/system-prompt', () => ({
  TRADING_SYSTEM_PROMPT: 'You are a helpful trading assistant.',
}));

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStreamConfig();
  });

  afterEach(() => {
    resetStreamConfig();
  });

  describe('Basic Message Handling', () => {
    it('should handle a simple chat message', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'What is AAPL?' }],
          provider: 'claude',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      expect(mockStreamText).toHaveBeenCalledTimes(1);
    });

    it('should pass messages to streamText correctly', async () => {
      const messages = [
        { role: 'user', content: 'What is TSLA?' },
        { role: 'assistant', content: 'TSLA is Tesla Inc.' },
        { role: 'user', content: 'What is its current price?' },
      ];

      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages, provider: 'claude' },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
        })
      );
    });

    it('should include system prompt and tools', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Analyze AAPL' }],
          provider: 'claude',
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('You are a helpful trading assistant.'),
          tools: expect.objectContaining({
            analyzeStock: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('Provider Selection', () => {
    it('should use claude provider by default', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
        },
      });

      await POST(request);

      const { getProviderModel } = await import('@/lib/llm/providers');
      expect(getProviderModel).toHaveBeenCalledWith('claude');
    });

    it('should accept claude_opus provider', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Complex analysis' }],
          provider: 'claude_opus',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const { getProviderModel } = await import('@/lib/llm/providers');
      expect(getProviderModel).toHaveBeenCalledWith('claude_opus');
    });

    it('should accept claude_haiku provider', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Quick question' }],
          provider: 'claude_haiku',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const { getProviderModel } = await import('@/lib/llm/providers');
      expect(getProviderModel).toHaveBeenCalledWith('claude_haiku');
    });

    it('should accept grok provider', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Alternative view' }],
          provider: 'grok',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const { getProviderModel } = await import('@/lib/llm/providers');
      expect(getProviderModel).toHaveBeenCalledWith('grok');
    });

    it('should return 400 for invalid provider', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
          provider: 'invalid_provider',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid provider');
    });
  });

  describe('Context Passing', () => {
    it('should pass activeSymbol in context', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'What do you think?' }],
          provider: 'claude',
          context: {
            activeSymbol: 'AAPL',
          },
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Current active symbol: AAPL'),
        })
      );
    });

    it('should pass positions in context', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Review my positions' }],
          provider: 'claude',
          context: {
            positions: [
              { symbol: 'AAPL', qty: 100, unrealizedPL: 500 },
              { symbol: 'TSLA', qty: 50, unrealizedPL: -200 },
            ],
          },
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringMatching(/AAPL: 100 shares.*\+\$500\.00/),
        })
      );
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringMatching(/TSLA: 50 shares.*-\$200\.00/),
        })
      );
    });

    it('should pass watchlist in context', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'What should I watch?' }],
          provider: 'claude',
          context: {
            watchlist: ['AAPL', 'TSLA', 'NVDA', 'AMD'],
          },
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Watchlist: AAPL, TSLA, NVDA, AMD'),
        })
      );
    });

    it('should pass prediction market context', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'What about this market?' }],
          provider: 'claude',
          context: {
            selectedMarket: {
              id: 'market-123',
              platform: 'kalshi' as const,
              title: 'Will Bitcoin reach $100k by end of 2025?',
              yesPrice: 0.65,
              noPrice: 0.35,
              volume: 1500000,
              category: 'Crypto',
            },
          },
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringMatching(/Will Bitcoin reach \$100k by end of 2025\?/),
        })
      );
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringMatching(/YES: 65%[\s\S]*NO: 35%/),
        })
      );
    });

    it('should pass active investment theses', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Review my thesis' }],
          provider: 'claude',
          context: {
            activeTheses: [
              {
                id: 'thesis-1',
                symbol: 'AAPL',
                hypothesis: 'AI integration will drive growth',
                timeframe: '6-12 months',
                targetEntry: 180,
                targetExit: 220,
                stopLoss: 165,
                confidence: 75,
                status: 'active' as const,
              },
            ],
          },
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringMatching(/AAPL:.*AI integration will drive growth/),
        })
      );
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringMatching(/75% confidence/),
        })
      );
    });

    it('should pass emotional firewall state when triggered', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Should I buy now?' }],
          provider: 'claude',
          context: {
            emotionalState: {
              isTriggered: true,
              triggerReason: 'High stress detected after recent loss',
              cooldownEndsAt: new Date(Date.now() + 3600000).toISOString(),
              recentEmotions: ['anxious', 'frustrated', 'desperate'],
            },
          },
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringMatching(/⚠️ EMOTIONAL FIREWALL ACTIVE/),
        })
      );
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringMatching(/High stress detected after recent loss/),
        })
      );
    });

    it('should handle multiple context fields together', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Full analysis please' }],
          provider: 'claude',
          context: {
            activeSymbol: 'TSLA',
            activePanel: 'chart',
            positions: [{ symbol: 'TSLA', qty: 50, unrealizedPL: 1000 }],
            watchlist: ['TSLA', 'RIVN', 'LCID'],
          },
        },
      });

      await POST(request);

      const callArgs = mockStreamText.mock.calls[0][0];
      expect(callArgs.system).toContain('Current active symbol: TSLA');
      expect(callArgs.system).toContain('Currently viewing: chart panel');
      expect(callArgs.system).toContain('TSLA: 50 shares');
      expect(callArgs.system).toContain('Watchlist: TSLA, RIVN, LCID');
    });
  });

  describe('Extended Thinking Mode', () => {
    it('should enable extended thinking for Claude providers', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Deep analysis needed' }],
          provider: 'claude',
          useExtendedThinking: true,
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          experimental_thinking: {
            type: 'enabled',
            budget_tokens: 10000,
          },
        })
      );
    });

    it('should enable extended thinking for Claude Opus', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Complex problem' }],
          provider: 'claude_opus',
          useExtendedThinking: true,
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          experimental_thinking: expect.any(Object),
        })
      );
    });

    it('should enable extended thinking for Claude Haiku', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Think deeply' }],
          provider: 'claude_haiku',
          useExtendedThinking: true,
        },
      });

      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          experimental_thinking: expect.any(Object),
        })
      );
    });

    it('should not add extended thinking for Grok', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Analysis' }],
          provider: 'grok',
          useExtendedThinking: true,
        },
      });

      await POST(request);

      const callArgs = mockStreamText.mock.calls[0][0] as any;
      expect(callArgs.experimental_thinking).toBeUndefined();
    });

    it('should not add extended thinking when disabled', async () => {
      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Quick answer' }],
          provider: 'claude',
          useExtendedThinking: false,
        },
      });

      await POST(request);

      const callArgs = mockStreamText.mock.calls[0][0] as any;
      expect(callArgs.experimental_thinking).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limits', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit-server');

      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          provider: 'claude',
        },
      });

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        expect.any(Object),
        { limit: 20, windowMs: 60000 }
      );
    });

    it('should return 429 when rate limit exceeded', async () => {
      const { checkRateLimit, rateLimitResponse } = await import('@/lib/rate-limit-server');

      // Mock rate limit exceeded
      vi.mocked(checkRateLimit).mockReturnValueOnce({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Too many requests' }],
          provider: 'claude',
        },
      });

      await POST(request);

      expect(rateLimitResponse).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API key missing error', async () => {
      configureStream({
        error: new Error('XAI_API_KEY not configured'),
      });

      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          provider: 'claude',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('API key not configured');
      expect(body.error_code).toBe('API_KEY_MISSING');
    });

    it('should handle generic errors gracefully', async () => {
      configureStream({
        error: new Error('Network timeout'),
      });

      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          provider: 'claude',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Unable to process your request. Please try again.');
      expect(body.error_code).toBe('CHAT_ERROR');
    });

    it('should not expose internal error details to client', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      configureStream({
        error: new Error('Internal database connection failed at server.ts:123'),
      });

      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          provider: 'claude',
        },
      });

      const response = await POST(request);
      const body = await response.json();

      // Should not expose internal file paths or details
      expect(body.error).not.toContain('server.ts');
      expect(body.error).not.toContain('database connection');

      // But should log full error server-side
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Chat API error details:',
        expect.anything()
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Streaming Response', () => {
    it('should return streaming response', async () => {
      configureStream({
        chunks: ['Hello ', 'from ', 'AI ', 'assistant'],
      });

      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
          provider: 'claude',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');

      // Read the stream
      const text = await response.text();
      expect(text).toBe('Hello from AI assistant');
    });

    it('should stream with proper encoding', async () => {
      configureStream({
        chunks: ['🚀 ', 'Trading ', 'assistant '],
      });

      const request = createRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
          provider: 'claude',
        },
      });

      const response = await POST(request);
      const text = await response.text();

      // Should handle emoji properly
      expect(text).toContain('🚀');
      expect(text).toBe('🚀 Trading assistant ');
    });
  });
});
