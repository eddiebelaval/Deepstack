'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStandaloneMode } from '@/hooks/useStandaloneMode';

interface IOSInstallBannerProps {
  /** Delay before showing the banner in ms (default: 3000) */
  delay?: number;
}

/**
 * Banner component that shows iOS users how to install the PWA
 *
 * ★ Insight ─────────────────────────────────────
 * iOS Safari doesn't support the standard Web App Install API,
 * so we need to manually guide users through the "Add to Home Screen"
 * process. This banner only shows for iOS Safari users who haven't
 * already installed the app.
 * ─────────────────────────────────────────────────
 */
export function IOSInstallBanner({ delay = 3000 }: IOSInstallBannerProps) {
  const { isIOS, isStandalone } = useStandaloneMode();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user has previously dismissed the banner
    const wasDismissed = localStorage.getItem('ios-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Only show on iOS Safari when not in standalone mode
    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isIOS, isStandalone, delay]);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('ios-install-dismissed', 'true');
  };

  const handleDismissTemporarily = () => {
    setShowBanner(false);
    // Will show again on next visit
  };

  if (dismissed || !showBanner || isStandalone || !isIOS) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
        }}
      >
        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {/* App icon */}
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">D</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Add deepstack</h3>
                <p className="text-sm text-muted-foreground">to your Home Screen</p>
              </div>
            </div>
            <button
              onClick={handleDismissTemporarily}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Instructions */}
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Install deepstack for the best experience with offline access and quick launch.
            </p>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">1</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span>Tap the</span>
                  <Share className="h-5 w-5 text-primary" />
                  <span>Share button</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">2</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span>Scroll down and tap</span>
                  <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                    <Plus className="h-4 w-4" />
                    <span className="text-xs font-medium">Add to Home Screen</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">3</span>
                </div>
                <div className="text-sm text-foreground">
                  <span>Tap</span>
                  <span className="font-medium text-primary"> Add</span>
                  <span> in the top right</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 pt-0 flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={handleDismiss}
            >
              Don&apos;t show again
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleDismissTemporarily}
            >
              Got it
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Simpler install prompt for non-iOS devices
 */
export function InstallPromptBanner() {
  const { isStandalone, canInstall } = useStandaloneMode();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wasDismissed = localStorage.getItem('install-prompt-dismissed');
    if (wasDismissed) return;

    if (!isStandalone && canInstall) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isStandalone, canInstall]);

  if (!showBanner) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50 p-4"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
      }}
    >
      <div className="bg-primary text-primary-foreground rounded-xl p-4 max-w-md mx-auto flex items-center justify-between gap-4 shadow-lg">
        <div>
          <p className="font-medium">Install deepstack</p>
          <p className="text-sm opacity-90">Add to home screen for the best experience</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setShowBanner(false);
              localStorage.setItem('install-prompt-dismissed', 'true');
            }}
          >
            Later
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-background/10 border-background/20 hover:bg-background/20"
            onClick={() => {
              // Trigger install prompt
              const event = new CustomEvent('trigger-install-prompt');
              window.dispatchEvent(event);
              setShowBanner(false);
            }}
          >
            Install
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
