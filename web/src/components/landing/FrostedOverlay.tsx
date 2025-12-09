'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FrostedOverlayProps {
    className?: string;
    intensity?: 'light' | 'medium' | 'heavy';
}

export function FrostedOverlay({ className, intensity = 'medium' }: FrostedOverlayProps) {
    // Map intensity to specific backdrop-blur values (reduced for better background visibility)
    const blurMap = {
        light: 'backdrop-blur-[4px]',
        medium: 'backdrop-blur-[8px]',
        heavy: 'backdrop-blur-[16px]',
    };

    return (
        <div
            className={cn(
                "absolute inset-0 z-10 w-full h-full pointer-events-none",
                "bg-background/3", // Minimal tint to let topographic background show through
                blurMap[intensity],
                "border-b border-border/10",
                // Add a subtle vignette/gradient - reduced opacity to show background
                "after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-b after:from-transparent after:via-background/5 after:to-background/60",
                className
            )}
        />
    );
}
