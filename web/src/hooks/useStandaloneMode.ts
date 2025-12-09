'use client';

import { useState, useEffect } from 'react';

interface StandaloneModeInfo {
  /** Whether the app is running in standalone/PWA mode */
  isStandalone: boolean;
  /** Whether the app is running on iOS */
  isIOS: boolean;
  /** Whether running in iOS standalone (home screen) mode */
  isIOSStandalone: boolean;
  /** Whether the app can be installed (has install prompt available) */
  canInstall: boolean;
  /** Display mode: 'browser', 'standalone', 'minimal-ui', etc. */
  displayMode: string;
}

/**
 * Hook to detect if the app is running in standalone/PWA mode
 *
 * ★ Insight ─────────────────────────────────────
 * iOS Safari has its own non-standard `navigator.standalone` property,
 * while other browsers use the standard `display-mode: standalone` media query.
 * We check both for cross-platform PWA detection.
 * ─────────────────────────────────────────────────
 *
 * @example
 * ```tsx
 * const { isStandalone, isIOS, canInstall } = useStandaloneMode();
 *
 * if (isStandalone) {
 *   // Show PWA-specific UI
 * } else if (canInstall) {
 *   // Show install prompt
 * }
 * ```
 */
export function useStandaloneMode(): StandaloneModeInfo {
  const [info, setInfo] = useState<StandaloneModeInfo>({
    isStandalone: false,
    isIOS: false,
    isIOSStandalone: false,
    canInstall: false,
    displayMode: 'browser',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandaloneMode = () => {
      // Check iOS
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      // Check iOS standalone mode (navigator.standalone is iOS-specific)
      const isIOSStandalone = isIOS && (window.navigator as any).standalone === true;

      // Check standard standalone mode via media query
      const standaloneQuery = window.matchMedia('(display-mode: standalone)');
      const minimalUIQuery = window.matchMedia('(display-mode: minimal-ui)');
      const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');

      const isStandalone = standaloneQuery.matches ||
        minimalUIQuery.matches ||
        fullscreenQuery.matches ||
        isIOSStandalone;

      // Determine display mode
      let displayMode = 'browser';
      if (standaloneQuery.matches) displayMode = 'standalone';
      else if (minimalUIQuery.matches) displayMode = 'minimal-ui';
      else if (fullscreenQuery.matches) displayMode = 'fullscreen';
      else if (isIOSStandalone) displayMode = 'standalone';

      setInfo(prev => ({
        ...prev,
        isStandalone,
        isIOS,
        isIOSStandalone,
        displayMode,
      }));
    };

    // Initial check
    checkStandaloneMode();

    // Listen for display mode changes
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkStandaloneMode();

    if (standaloneQuery.addEventListener) {
      standaloneQuery.addEventListener('change', handleChange);
    }

    // Listen for beforeinstallprompt to know if we can install
    const handleInstallPrompt = () => {
      setInfo(prev => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      if (standaloneQuery.removeEventListener) {
        standaloneQuery.removeEventListener('change', handleChange);
      }
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  return info;
}

/**
 * Hook to handle PWA install prompt
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;

      // Clear the deferred prompt
      setDeferredPrompt(null);

      return outcome === 'accepted';
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  };

  return {
    canPrompt: !!deferredPrompt,
    isInstalled,
    promptInstall,
  };
}
