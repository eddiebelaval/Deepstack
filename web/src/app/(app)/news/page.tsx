'use client';

import { NewsPanel } from '@/components/trading/NewsPanel';

/**
 * News Page - Standalone page to view the NewsPanel
 * This is a test page to preview the Perplexity-style Discover design
 */
export default function NewsPage() {
  return (
    <div className="h-screen w-full max-w-2xl mx-auto">
      <NewsPanel />
    </div>
  );
}
