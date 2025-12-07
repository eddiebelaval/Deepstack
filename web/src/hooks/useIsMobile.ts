'use client';

import { useState, useEffect } from 'react';

interface ResponsiveState {
    isMobile: boolean;      // < 768px
    isTablet: boolean;      // 768px - 1023px
    isDesktop: boolean;     // >= 1024px
    width: number;
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

/**
 * Hook for detecting viewport size and responsive breakpoints.
 * Uses matchMedia for performance and adds resize listener for dynamic updates.
 *
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 */
export function useIsMobile(): ResponsiveState {
    const [state, setState] = useState<ResponsiveState>({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    });

    useEffect(() => {
        // Handler to update state based on window width
        const updateState = () => {
            const width = window.innerWidth;
            setState({
                isMobile: width < MOBILE_BREAKPOINT,
                isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
                isDesktop: width >= TABLET_BREAKPOINT,
                width,
            });
        };

        // Set initial state
        updateState();

        // Use matchMedia for better performance
        const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const tabletQuery = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`);

        const handleChange = () => updateState();

        // Modern API - addEventListener is preferred
        mobileQuery.addEventListener('change', handleChange);
        tabletQuery.addEventListener('change', handleChange);

        // Also listen to resize for edge cases
        window.addEventListener('resize', handleChange);

        return () => {
            mobileQuery.removeEventListener('change', handleChange);
            tabletQuery.removeEventListener('change', handleChange);
            window.removeEventListener('resize', handleChange);
        };
    }, []);

    return state;
}

/**
 * Simple boolean hook for mobile-only checks
 */
export function useIsMobileOnly(): boolean {
    const { isMobile } = useIsMobile();
    return isMobile;
}
