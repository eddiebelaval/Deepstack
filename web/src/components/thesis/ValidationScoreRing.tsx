'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getScoreColor, getScoreLabel } from '@/lib/thesis-validation';
import { Badge } from '@/components/ui/badge';

interface ValidationScoreRingProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const SIZE_CONFIG = {
    sm: {
        svgSize: 'w-16 h-16',
        radius: 28,
        strokeWidth: 6,
        textSize: 'text-lg',
        labelSize: 'text-xs',
    },
    md: {
        svgSize: 'w-32 h-32',
        radius: 56,
        strokeWidth: 8,
        textSize: 'text-3xl',
        labelSize: 'text-sm',
    },
    lg: {
        svgSize: 'w-40 h-40',
        radius: 70,
        strokeWidth: 10,
        textSize: 'text-4xl',
        labelSize: 'text-base',
    },
};

export function ValidationScoreRing({
    score,
    size = 'md',
    showLabel = false,
    className,
}: ValidationScoreRingProps) {
    const config = SIZE_CONFIG[size];
    const scoreColor = getScoreColor(score);
    const scoreLabel = getScoreLabel(score);

    // Calculate circumference for progress circle
    const circumference = 2 * Math.PI * config.radius;
    const progressOffset = circumference - (score / 100) * circumference;

    return (
        <div className={cn('flex flex-col items-center gap-2', className)}>
            <div className="relative" style={{ width: 'fit-content' }}>
                {/* SVG Progress Ring */}
                <svg
                    className={cn(config.svgSize, 'transform -rotate-90')}
                    viewBox={`0 0 ${config.radius * 2 + config.strokeWidth * 2} ${config.radius * 2 + config.strokeWidth * 2}`}
                >
                    {/* Background circle */}
                    <circle
                        className="text-muted"
                        strokeWidth={config.strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={config.radius}
                        cx={config.radius + config.strokeWidth}
                        cy={config.radius + config.strokeWidth}
                    />
                    {/* Progress circle */}
                    <circle
                        className={cn('transition-all duration-500 ease-out', scoreColor.text)}
                        strokeWidth={config.strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={progressOffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={config.radius}
                        cx={config.radius + config.strokeWidth}
                        cy={config.radius + config.strokeWidth}
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className={cn('font-bold', config.textSize)}>{score}%</div>
                    </div>
                </div>
            </div>

            {/* Label badge */}
            {showLabel && (
                <Badge
                    variant="outline"
                    className={cn('font-medium', scoreColor.text, config.labelSize)}
                >
                    {scoreLabel}
                </Badge>
            )}
        </div>
    );
}
