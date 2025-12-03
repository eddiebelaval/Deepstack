import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

export type LLMProvider = 'claude' | 'grok' | 'deepseek' | 'perplexity';

export const providerConfig = {
  claude: {
    name: 'Claude',
    description: 'Best for trading analysis and strategy',
    icon: '🤖',
    color: 'var(--ds-claude)',
    supportsTools: true,
  },
  grok: {
    name: 'Grok',
    description: 'Fast analysis and alternative perspectives',
    icon: '⚡',
    color: 'var(--ds-grok)',
    supportsTools: true,
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'Code and math-heavy analysis',
    icon: '🔬',
    color: 'var(--ds-deepseek)',
    supportsTools: true,
  },
  perplexity: {
    name: 'Perplexity',
    description: 'Real-time news and research',
    icon: '🔍',
    color: 'var(--ds-perplexity)',
    supportsTools: false,
  },
} as const;

export function getProviderModel(provider: LLMProvider) {
  switch (provider) {
    case 'claude':
      return anthropic('claude-sonnet-4-20250514');

    case 'grok':
      if (!process.env.XAI_API_KEY) {
        throw new Error('XAI_API_KEY not configured');
      }
      return createOpenAI({
        baseURL: 'https://api.x.ai/v1',
        apiKey: process.env.XAI_API_KEY,
      })('grok-beta');

    case 'deepseek':
      if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY not configured');
      }
      return createOpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY,
      })('deepseek-chat');

    case 'perplexity':
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error('PERPLEXITY_API_KEY not configured');
      }
      return createOpenAI({
        baseURL: 'https://api.perplexity.ai',
        apiKey: process.env.PERPLEXITY_API_KEY,
      })('llama-3.1-sonar-large-128k-online');

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
