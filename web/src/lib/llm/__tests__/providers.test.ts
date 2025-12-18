import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProviderModel, providerConfig, type LLMProvider } from '../providers';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Mock the AI SDK modules
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn((model: string) => ({ model, provider: 'anthropic' })),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn((config: any) => {
    return vi.fn((model: string) => ({ model, provider: 'openai', config }));
  }),
}));

// createOpenAICompatible returns an object with chatModel method
vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: vi.fn((config: any) => ({
    chatModel: (model: string) => ({ model, provider: 'openai-compatible', config }),
  })),
}));

describe('LLM Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.XAI_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
  });

  describe('providerConfig', () => {
    it('should have configuration for all providers', () => {
      expect(providerConfig).toHaveProperty('claude');
      expect(providerConfig).toHaveProperty('claude_opus');
      expect(providerConfig).toHaveProperty('claude_haiku');
      expect(providerConfig).toHaveProperty('grok');
      expect(providerConfig).toHaveProperty('sonar_reasoning');
      expect(providerConfig).toHaveProperty('perplexity');
    });

    it('should have correct structure for Claude Sonnet config', () => {
      expect(providerConfig.claude).toEqual({
        name: 'Sonnet 4.5',
        description: 'Best for everyday tasks',
        icon: 'Brain',
        color: 'var(--ds-claude)',
        supportsTools: true,
      });
    });

    it('should have correct structure for Claude Opus config', () => {
      expect(providerConfig.claude_opus).toEqual({
        name: 'Opus 4.5',
        description: 'Most capable for complex work',
        icon: 'Brain',
        color: 'var(--ds-claude)',
        supportsTools: true,
      });
    });

    it('should have correct structure for Claude Haiku config', () => {
      expect(providerConfig.claude_haiku).toEqual({
        name: 'Haiku 4.5',
        description: 'Fastest for quick answers',
        icon: 'Brain',
        color: 'var(--ds-claude)',
        supportsTools: true,
      });
    });

    it('should have correct structure for Grok config', () => {
      expect(providerConfig.grok).toEqual({
        name: 'Grok',
        description: 'Fast analysis and alternative perspectives',
        icon: 'Zap',
        color: 'var(--ds-grok)',
        supportsTools: true,
      });
    });

    it('should have correct structure for Sonar Reasoning config', () => {
      expect(providerConfig.sonar_reasoning).toEqual({
        name: 'DeepSeek R1',
        description: 'Advanced reasoning via Perplexity',
        icon: 'FlaskConical',
        color: 'var(--ds-perplexity)',
        supportsTools: false,
      });
    });

    it('should have correct structure for Perplexity config', () => {
      expect(providerConfig.perplexity).toEqual({
        name: 'Perplexity',
        description: 'Real-time news and research',
        icon: 'Search',
        color: 'var(--ds-perplexity)',
        supportsTools: false,
      });
    });

    it('should mark only certain providers as supporting tools', () => {
      expect(providerConfig.claude.supportsTools).toBe(true);
      expect(providerConfig.claude_opus.supportsTools).toBe(true);
      expect(providerConfig.claude_haiku.supportsTools).toBe(true);
      expect(providerConfig.grok.supportsTools).toBe(true);
      expect(providerConfig.sonar_reasoning.supportsTools).toBe(false);
      expect(providerConfig.perplexity.supportsTools).toBe(false);
    });
  });

  describe('getProviderModel', () => {
    describe('Claude Sonnet provider', () => {
      it('should return correct model for claude provider', () => {
        const model = getProviderModel('claude');

        expect(anthropic).toHaveBeenCalledWith('claude-sonnet-4-5-20250929');
        expect(model).toEqual({
          model: 'claude-sonnet-4-5-20250929',
          provider: 'anthropic',
        });
      });
    });

    describe('Claude Opus provider', () => {
      it('should return correct model for claude_opus provider', () => {
        const model = getProviderModel('claude_opus');

        expect(anthropic).toHaveBeenCalledWith('claude-opus-4-5-20251101');
        expect(model).toEqual({
          model: 'claude-opus-4-5-20251101',
          provider: 'anthropic',
        });
      });
    });

    describe('Claude Haiku provider', () => {
      it('should return correct model for claude_haiku provider', () => {
        const model = getProviderModel('claude_haiku');

        expect(anthropic).toHaveBeenCalledWith('claude-3-5-haiku-20241022');
        expect(model).toEqual({
          model: 'claude-3-5-haiku-20241022',
          provider: 'anthropic',
        });
      });
    });

    describe('Grok provider', () => {
      it('should return correct model for grok provider when API key is set', () => {
        process.env.XAI_API_KEY = 'test-xai-key';

        const model = getProviderModel('grok');

        expect(createOpenAI).toHaveBeenCalledWith({
          baseURL: 'https://api.x.ai/v1',
          apiKey: 'test-xai-key',
        });
        // Model is returned from the function returned by createOpenAI
        expect(model).toBeDefined();
        expect((model as any).model).toBe('grok-3');
      });

      it('should throw error when XAI_API_KEY is not set', () => {
        delete process.env.XAI_API_KEY;

        expect(() => getProviderModel('grok')).toThrow('XAI_API_KEY not configured');
      });
    });

    describe('Sonar Reasoning provider', () => {
      it('should return correct model for sonar_reasoning provider when API key is set', () => {
        process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';

        const model = getProviderModel('sonar_reasoning');

        expect(createOpenAICompatible).toHaveBeenCalledWith({
          name: 'perplexity',
          baseURL: 'https://api.perplexity.ai',
          apiKey: 'test-perplexity-key',
        });
        expect(model).toEqual({
          model: 'sonar-reasoning-pro',
          provider: 'openai-compatible',
          config: {
            name: 'perplexity',
            baseURL: 'https://api.perplexity.ai',
            apiKey: 'test-perplexity-key',
          },
        });
      });

      it('should throw error when PERPLEXITY_API_KEY is not set', () => {
        delete process.env.PERPLEXITY_API_KEY;

        expect(() => getProviderModel('sonar_reasoning')).toThrow('PERPLEXITY_API_KEY not configured');
      });
    });

    describe('Perplexity provider', () => {
      it('should return correct model for perplexity provider when API key is set', () => {
        process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';

        const model = getProviderModel('perplexity');

        expect(createOpenAICompatible).toHaveBeenCalledWith({
          name: 'perplexity',
          baseURL: 'https://api.perplexity.ai',
          apiKey: 'test-perplexity-key',
        });
        expect(model).toEqual({
          model: 'sonar',
          provider: 'openai-compatible',
          config: {
            name: 'perplexity',
            baseURL: 'https://api.perplexity.ai',
            apiKey: 'test-perplexity-key',
          },
        });
      });

      it('should throw error when PERPLEXITY_API_KEY is not set', () => {
        delete process.env.PERPLEXITY_API_KEY;

        expect(() => getProviderModel('perplexity')).toThrow('PERPLEXITY_API_KEY not configured');
      });
    });

    describe('Unknown provider', () => {
      it('should throw error for unknown provider', () => {
        expect(() => getProviderModel('unknown' as LLMProvider)).toThrow('Unknown provider: unknown');
      });
    });
  });

  describe('API key handling', () => {
    it('should handle empty string API keys for Grok', () => {
      process.env.XAI_API_KEY = '';

      // Empty string is falsy, so should throw
      expect(() => getProviderModel('grok')).toThrow('XAI_API_KEY not configured');
    });

    it('should handle empty string API keys for Perplexity', () => {
      process.env.PERPLEXITY_API_KEY = '';

      // Empty string is falsy, so should throw
      expect(() => getProviderModel('perplexity')).toThrow('PERPLEXITY_API_KEY not configured');
    });

    it('should handle whitespace-only API keys for Grok', () => {
      process.env.XAI_API_KEY = '   ';

      // Whitespace is truthy, so should not throw (SDK will validate)
      expect(() => getProviderModel('grok')).not.toThrow();
    });
  });

  describe('Provider configuration consistency', () => {
    it('should have all providers defined in both config and getProviderModel', () => {
      const configProviders = Object.keys(providerConfig);

      // Test that each provider in config can be used with getProviderModel
      configProviders.forEach((provider) => {
        if (provider === 'grok') {
          process.env.XAI_API_KEY = 'test-key';
        } else if (provider === 'sonar_reasoning' || provider === 'perplexity') {
          process.env.PERPLEXITY_API_KEY = 'test-key';
        }

        expect(() => getProviderModel(provider as LLMProvider)).not.toThrow('Unknown provider');
      });
    });

    it('should have consistent provider naming', () => {
      // All provider keys should be lowercase with underscores
      const providers = Object.keys(providerConfig);
      providers.forEach((provider) => {
        expect(provider).toMatch(/^[a-z_]+$/);
      });
    });
  });
});
