'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FrostedOverlayProps {
    className?: string;
    intensity?: 'light' | 'medium' | 'heavy';
}

export function FrostedOverlay({ className, intensity = 'medium' }: FrostedOverlayProps) {
    // Map intensity to specific backdrop-blur values
    const blurMap = {
        light: 'backdrop-blur-[8px]',
        medium: 'backdrop-blur-[16px]',
        heavy: 'backdrop-blur-[24px]',
    };

    return (
        <div
            className={cn(
                "absolute inset-0 z-10 w-full h-full pointer-events-none",
                "bg-background/10", // Base transparency - reduced to let glow show through
                blurMap[intensity],
                "border-b border-border/10",
                // Add a subtle vignette/gradient to make it feel like glass
                "after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-b after:from-transparent after:via-background/10 after:to-background/80",
                className
            )}
        />
    );
}
