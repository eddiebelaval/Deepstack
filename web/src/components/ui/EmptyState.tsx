'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  subtitle?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Unified empty state component with typewriter animation for subtitle transitions.
 * Uses the deepstack brand logo (Urbanist font) with animated subtitle.
 */
export function EmptyState({
  subtitle = 'What would you like to analyze?',
  className,
  size = 'md'
}: EmptyStateProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState(subtitle);
  const prevSubtitleRef = useRef(subtitle);

  const sizeConfig = {
    sm: {
      logo: 'text-xl',
      subtitle: 'text-xs',
      gap: 'space-y-1'
    },
    md: {
      logo: 'text-3xl',
      subtitle: 'text-sm',
      gap: 'space-y-3'
    },
    lg: {
      logo: 'text-4xl md:text-5xl',
      subtitle: 'text-base md:text-lg',
      gap: 'space-y-4'
    }
  };

  const config = sizeConfig[size];

  // Handle subtitle changes with delete-then-type animation
  useEffect(() => {
    if (subtitle !== prevSubtitleRef.current) {
      // Subtitle changed - trigger delete animation first
      setIsTyping(false);
      prevSubtitleRef.current = subtitle;
    }
  }, [subtitle]);

  // Typewriter effect
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing forward
      if (displayedText.length < currentSubtitle.length) {
        timeout = setTimeout(() => {
          setDisplayedText(currentSubtitle.slice(0, displayedText.length + 1));
        }, 30 + Math.random() * 20); // Slight randomization for natural feel
      }
    } else {
      // Deleting backward
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 15); // Faster delete
      } else {
        // Done deleting, switch to new subtitle and start typing
        setCurrentSubtitle(subtitle);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isTyping, currentSubtitle, subtitle]);

  // Initial type-in on mount
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    setCurrentSubtitle(subtitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        config.gap,
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Logo */}
      <motion.span
        className={cn(
          "font-urbanist font-normal text-primary tracking-tight",
          config.logo
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        deepstack
      </motion.span>

      {/* Animated Subtitle with cursor */}
      <div className={cn("text-muted-foreground min-h-[1.5em]", config.subtitle)}>
        <span>{displayedText}</span>
        <AnimatePresence>
          {(isTyping || displayedText.length > 0) && (
            <motion.span
              className="inline-block w-[2px] h-[1em] bg-primary/60 ml-0.5 align-middle"
              initial={{ opacity: 0 }}
              animate={{ opacity: [1, 0] }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: {
                  duration: 0.5,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut'
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Hook to get contextual subtitle based on app state
 */
export function useEmptyStateSubtitle(options: {
  hasActiveSymbol?: boolean;
  activeSymbol?: string;
  isMarketOpen?: boolean;
  mode?: 'chat' | 'analysis' | 'trading';
}) {
  const { hasActiveSymbol, activeSymbol, mode = 'chat' } = options;

  if (hasActiveSymbol && activeSymbol) {
    return `Ask me about ${activeSymbol}`;
  }

  switch (mode) {
    case 'analysis':
      return 'What would you like to analyze?';
    case 'trading':
      return 'Ready to help you trade';
    case 'chat':
    default:
      return 'What would you like to analyze?';
  }
}
