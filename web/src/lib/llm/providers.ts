import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export type LLMProvider = 'claude' | 'claude_opus' | 'claude_haiku' | 'grok' | 'sonar_reasoning' | 'perplexity';

export const providerConfig = {
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
    description: 'Fast analysis and alternative perspectives',
    icon: 'Zap',
    color: 'var(--ds-grok)',
    supportsTools: true,
  },
  sonar_reasoning: {
    name: 'DeepSeek R1',
    description: 'Advanced reasoning via Perplexity',
    icon: 'FlaskConical',
    color: 'var(--ds-perplexity)',
    supportsTools: false,
  },
  perplexity: {
    name: 'Perplexity',
    description: 'Real-time news and research',
    icon: 'Search',
    color: 'var(--ds-perplexity)',
    supportsTools: false,
  },
} as const;

export function getProviderModel(provider: LLMProvider) {
  switch (provider) {
    case 'claude':
      return anthropic('claude-sonnet-4-5-20250929');

    case 'claude_opus':
      return anthropic('claude-opus-4-5-20251101');

    case 'claude_haiku':
      return anthropic('claude-3-5-haiku-20241022');

    case 'grok':
      if (!process.env.XAI_API_KEY) {
        throw new Error('XAI_API_KEY not configured');
      }
      return createOpenAI({
        baseURL: 'https://api.x.ai/v1',
        apiKey: process.env.XAI_API_KEY,
      })('grok-3');

    case 'sonar_reasoning':
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error('PERPLEXITY_API_KEY not configured');
      }
      return createOpenAICompatible({
        name: 'perplexity',
        baseURL: 'https://api.perplexity.ai',
        apiKey: process.env.PERPLEXITY_API_KEY,
      }).chatModel('sonar-reasoning-pro');

    case 'perplexity':
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error('PERPLEXITY_API_KEY not configured');
      }
      return createOpenAICompatible({
        name: 'perplexity',
        baseURL: 'https://api.perplexity.ai',
        apiKey: process.env.PERPLEXITY_API_KEY,
      }).chatModel('sonar');

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
