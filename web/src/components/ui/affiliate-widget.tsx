'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AFFILIATES,
  isAffiliateDismissed,
  dismissAffiliate,
  trackAffiliateClick,
} from '@/lib/affiliate-config';

// Alpaca llama icon
function AlpacaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.5 4c-.8 0-1.5.3-2 .8L14 6.5c-.5-.3-1-.5-1.5-.5-1.5 0-3 1-3.5 2.5L8.5 10c-1 .5-1.5 1.5-1.5 2.5v1.5c0 1 .5 2 1.5 2.5v3.5c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-3h2v3c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-3.5c1-.5 1.5-1.5 1.5-2.5v-1.5c0-.5-.1-1-.3-1.5l1.8-2.5c.3-.5.5-1 .5-1.5V5c0-.6-.4-1-1-1h-1zm-1 4c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z" />
    </svg>
  );
}

interface AffiliateWidgetProps {
  isExpanded: boolean;
  className?: string;
}

export function AffiliateWidget({ isExpanded, className = '' }: AffiliateWidgetProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash
  const affiliate = AFFILIATES.alpaca;

  useEffect(() => {
    setIsDismissed(isAffiliateDismissed(affiliate.id));
  }, [affiliate.id]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dismissAffiliate(affiliate.id);
    setIsDismissed(true);
  };

  const handleClick = () => {
    trackAffiliateClick(affiliate.id, 'sidebar');
    window.open(affiliate.referralUrl, '_blank', 'noopener,noreferrer');
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative ${className}`}
      >
        {isExpanded ? (
          // Expanded view
          <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-yellow-600/10 border border-yellow-500/20">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-background/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                <AlpacaIcon className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-semibold text-yellow-400 mb-0.5">
                  Trade with {affiliate.name}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mb-2">
                  {affiliate.tagline}
                </p>
                <button
                  onClick={handleClick}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-md bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                >
                  {affiliate.cta}
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Sponsored label */}
            <p className="text-[8px] text-muted-foreground/50 text-right mt-2">
              Sponsored
            </p>
          </div>
        ) : (
          // Collapsed view - just icon
          <button
            onClick={handleClick}
            className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center hover:bg-yellow-500/20 transition-colors group"
            title={`Trade with ${affiliate.name}`}
          >
            <AlpacaIcon className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Compact inline version for chat contextual prompts
interface AffiliateInlineProps {
  symbol?: string;
  className?: string;
}

export function AffiliateInline({ symbol, className = '' }: AffiliateInlineProps) {
  const affiliate = AFFILIATES.alpaca;

  const handleClick = () => {
    trackAffiliateClick(affiliate.id, 'chat');
    window.open(affiliate.referralUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`p-3 rounded-lg bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
          <AlpacaIcon className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {symbol ? `Ready to trade ${symbol}?` : 'Ready to execute?'}
          </p>
          <p className="text-xs text-muted-foreground">
            {affiliate.tagline}
          </p>
        </div>
        <button
          onClick={handleClick}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
        >
          {affiliate.cta}
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
