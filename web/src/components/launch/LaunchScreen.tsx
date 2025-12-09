'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStandaloneMode } from '@/hooks/useStandaloneMode';

interface LaunchScreenProps {
  /** Duration of the launch animation in ms (default: 1500) */
  duration?: number;
  /** Callback when launch animation completes */
  onComplete?: () => void;
  /** Children to render after launch completes */
  children: React.ReactNode;
}

/**
 * Launch screen component that shows a branded animation when PWA launches
 *
 * ★ Insight ─────────────────────────────────────
 * Only shows in standalone (PWA) mode to give that native app feel.
 * Uses sessionStorage to ensure it only shows once per session.
 * The animation mirrors iOS app launch patterns.
 * ─────────────────────────────────────────────────
 *
 * @example
 * ```tsx
 * <LaunchScreen>
 *   <App />
 * </LaunchScreen>
 * ```
 */
export function LaunchScreen({
  duration = 1500,
  onComplete,
  children,
}: LaunchScreenProps) {
  const { isStandalone } = useStandaloneMode();
  const [showLaunch, setShowLaunch] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Only show launch screen in standalone mode and once per session
    if (typeof window === 'undefined') return;

    const hasLaunched = sessionStorage.getItem('deepstack-launched');

    if (isStandalone && !hasLaunched) {
      setShowLaunch(true);
      sessionStorage.setItem('deepstack-launched', 'true');

      // Auto-complete after duration
      const timer = setTimeout(() => {
        setShowLaunch(false);
        setIsComplete(true);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Skip launch screen
      setIsComplete(true);
    }
  }, [isStandalone, duration, onComplete]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showLaunch && (
          <motion.div
            key="launch-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] bg-background flex items-center justify-center"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex flex-col items-center gap-6">
              {/* Logo animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1] // Custom ease for "pop" effect
                }}
                className="relative"
              >
                {/* Glow effect behind logo */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0.3 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2,
                    ease: 'easeOut'
                  }}
                  className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
                />

                {/* Logo SVG - DeepStack card logo */}
                <motion.svg
                  viewBox="0 0 100 100"
                  className="w-24 h-24 md:w-32 md:h-32 relative z-10"
                  initial={{ rotateY: -30 }}
                  animate={{ rotateY: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  {/* Card stack */}
                  <motion.rect
                    x="20"
                    y="15"
                    width="60"
                    height="80"
                    rx="4"
                    fill="currentColor"
                    className="text-muted-foreground/20"
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 20, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  />
                  <motion.rect
                    x="25"
                    y="10"
                    width="60"
                    height="80"
                    rx="4"
                    fill="currentColor"
                    className="text-muted-foreground/40"
                    initial={{ x: 35, opacity: 0 }}
                    animate={{ x: 25, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  />
                  <motion.rect
                    x="30"
                    y="5"
                    width="60"
                    height="80"
                    rx="4"
                    fill="currentColor"
                    className="text-primary"
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 30, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  />
                  {/* D letter on top card */}
                  <motion.text
                    x="60"
                    y="55"
                    fontSize="36"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="currentColor"
                    className="text-background"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    D
                  </motion.text>
                </motion.svg>
              </motion.div>

              {/* Text */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-center"
              >
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  DeepStack
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  AI Trading Assistant
                </p>
              </motion.div>

              {/* Loading indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                className="flex gap-1 mt-4"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Only render children after launch is complete to prevent flash */}
      {isComplete && children}
    </>
  );
}

/**
 * Simpler version that just provides a fade-in effect without the full launch screen
 */
export function FadeInOnMount({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
