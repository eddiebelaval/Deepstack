'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface TourPingProps {
    isActive: boolean;
    title: string;
    description: string;
    tip?: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    onDismiss: () => void;
    className?: string;
}

/**
 * Animated radar ping component for contextual tour guidance
 * Shows an orange pulsing ring (mini radar effect) that expands to a tooltip when clicked
 */
export function TourPing({
    isActive,
    title,
    description,
    tip,
    position = 'bottom',
    onDismiss,
    className,
}: TourPingProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Position styles for the tooltip
    const positionStyles = {
        top: 'bottom-full mb-3 left-1/2 -translate-x-1/2',
        bottom: 'top-full mt-3 left-1/2 -translate-x-1/2',
        left: 'right-full mr-3 top-1/2 -translate-y-1/2',
        right: 'left-full ml-3 top-1/2 -translate-y-1/2',
    };

    // Arrow styles for the tooltip
    const arrowStyles = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-card border-x-transparent border-b-transparent border-8',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-card border-x-transparent border-t-transparent border-8',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-card border-y-transparent border-r-transparent border-8',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-card border-y-transparent border-l-transparent border-8',
    };

    if (!isActive) return null;

    const handlePingClick = () => {
        setIsExpanded(true);
    };

    const handleDismiss = () => {
        setIsExpanded(false);
        onDismiss();
    };

    return (
        <div className={cn('relative inline-block', className)}>
            {/* Pulsing ping dot */}
            <AnimatePresence>
                {!isExpanded && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                        onClick={handlePingClick}
                        className="relative w-6 h-6 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full"
                        aria-label={`Tour: ${title}`}
                    >
                        {/* Expanding radar rings - mimics landing page ping */}
                        <span className="absolute inset-0 rounded-full border-2 border-primary/60 animate-[radar-ping_2s_ease-out_infinite]" />
                        <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-[radar-ping_2s_ease-out_infinite_0.6s]" />
                        <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-[radar-ping_2s_ease-out_infinite_1.2s]" />

                        {/* Center dot with glow */}
                        <span className="absolute inset-[8px] rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Expanded tooltip */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={cn(
                            'absolute z-50 w-72 bg-card border border-border/60 rounded-xl shadow-xl',
                            positionStyles[position]
                        )}
                    >
                        {/* Arrow */}
                        <div className={cn('absolute w-0 h-0', arrowStyles[position])} />

                        {/* Content */}
                        <div className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_6px_var(--primary)]" />
                                    <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
                                    aria-label="Dismiss"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                                {description}
                            </p>

                            {/* Tip */}
                            {tip && (
                                <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary">
                                    <strong>Tip:</strong> {tip}
                                </div>
                            )}

                            {/* Action */}
                            <button
                                onClick={handleDismiss}
                                className="mt-3 w-full py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default TourPing;
