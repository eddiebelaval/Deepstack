'use client';

import { TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { AffiliateInline } from '@/components/ui/affiliate-widget';
import Link from 'next/link';

export interface ContextualPrompt {
  id: string;
  type: 'affiliate' | 'upgrade' | 'paper-trade';
  symbol?: string;
  title: string;
  description: string;
}

interface ContextualPromptCardProps {
  prompt: ContextualPrompt;
}

export function ContextualPromptCard({ prompt }: ContextualPromptCardProps) {
  if (prompt.type === 'affiliate') {
    return <AffiliateInline symbol={prompt.symbol} className="mt-4" />;
  }

  if (prompt.type === 'paper-trade') {
    return (
      <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{prompt.title}</p>
            <p className="text-xs text-muted-foreground">{prompt.description}</p>
          </div>
          <Link
            href="/app?panel=portfolio"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            Paper Trade
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  if (prompt.type === 'upgrade') {
    return (
      <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{prompt.title}</p>
            <p className="text-xs text-muted-foreground">{prompt.description}</p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 transition-opacity"
          >
            Upgrade
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

// Utility to detect if a message should show contextual prompts
const TRADE_KEYWORDS = [
  'buy',
  'sell',
  'long',
  'short',
  'position',
  'entry',
  'exit',
  'trade',
  'invest',
  'purchase',
];

const COMMON_TICKERS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK', 'JPM',
  'V', 'UNH', 'MA', 'HD', 'PG', 'JNJ', 'XOM', 'CVX', 'MRK', 'ABBV',
  'LLY', 'PEP', 'KO', 'COST', 'AVGO', 'MCD', 'WMT', 'CSCO', 'ACN', 'TMO',
  'ABT', 'DHR', 'NEE', 'LIN', 'PM', 'TXN', 'AMD', 'ORCL', 'CRM', 'NKE',
  'VZ', 'INTC', 'QCOM', 'T', 'IBM', 'GE', 'CAT', 'BA', 'HON', 'UPS',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'ARKK', 'XLF', 'XLE', 'XLK',
]);

export function detectContextualPrompts(
  content: string,
  messageIndex: number,
  conversationPromptCount: number
): ContextualPrompt[] {
  const prompts: ContextualPrompt[] = [];

  // Only show prompts occasionally (not every message)
  if (messageIndex < 2) return prompts; // Skip first few messages
  if (conversationPromptCount >= 2) return prompts; // Max 2 per conversation

  // Check for trade-related content
  const lowerContent = content.toLowerCase();
  const hasTradeKeyword = TRADE_KEYWORDS.some((kw) => lowerContent.includes(kw));

  if (!hasTradeKeyword) return prompts;

  // Extract potential stock symbols (1-5 uppercase letters)
  const symbolMatches = content.match(/\b[A-Z]{1,5}\b/g) || [];
  const detectedSymbols = symbolMatches.filter((s) => COMMON_TICKERS.has(s));

  if (detectedSymbols.length > 0) {
    const symbol = detectedSymbols[0]; // Use first detected symbol

    // Show affiliate prompt
    prompts.push({
      id: `affiliate-${symbol}-${messageIndex}`,
      type: 'affiliate',
      symbol,
      title: `Ready to trade ${symbol}?`,
      description: 'Execute your thesis with commission-free trading',
    });
  }

  return prompts;
}
