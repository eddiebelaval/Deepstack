import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PRESETS } from '@/lib/presets';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PresetGridProps {
    onSelect: (prompt: string) => void;
    className?: string;
}

export function PresetGrid({ onSelect, className }: PresetGridProps) {
    const { isMobile } = useIsMobile();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    // Auto-rotate every 4 seconds on mobile
    useEffect(() => {
        if (!isMobile || isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % PRESETS.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [isMobile, isPaused]);

    // Pause auto-rotate on interaction, resume after 8 seconds
    const handleInteraction = useCallback(() => {
        setIsPaused(true);
        const timeout = setTimeout(() => setIsPaused(false), 8000);
        return () => clearTimeout(timeout);
    }, []);

    const goToNext = useCallback(() => {
        handleInteraction();
        setCurrentIndex((prev) => (prev + 1) % PRESETS.length);
    }, [handleInteraction]);

    const goToPrev = useCallback(() => {
        handleInteraction();
        setCurrentIndex((prev) => (prev - 1 + PRESETS.length) % PRESETS.length);
    }, [handleInteraction]);

    const goToIndex = useCallback((index: number) => {
        handleInteraction();
        setCurrentIndex(index);
    }, [handleInteraction]);

    // Handle touch swipe gestures
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;

        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50; // Minimum swipe distance

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                goToNext(); // Swiped left
            } else {
                goToPrev(); // Swiped right
            }
        }

        touchStartX.current = null;
        touchEndX.current = null;
    };

    // Mobile: Single card carousel with dots
    if (isMobile) {
        const currentPreset = PRESETS[currentIndex];

        return (
            <div className={cn("flex flex-col gap-2", className)}>
                {/* Carousel card with swipe */}
                <div
                    className="relative"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Navigation arrows */}
                    <button
                        onClick={goToPrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 p-1.5 rounded-full bg-background/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                        aria-label="Previous suggestion"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <button
                        onClick={goToNext}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 p-1.5 rounded-full bg-background/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                        aria-label="Next suggestion"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Card */}
                    <button
                        key={currentPreset.prompt}
                        onClick={() => onSelect(currentPreset.prompt)}
                        className="w-full group bg-card/40 hover:bg-card/60 border border-border/40 hover:border-border/60 rounded-xl p-4 flex items-center gap-3 transition-all duration-200 text-left mx-auto"
                    >
                        <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 text-primary transition-colors">
                            <currentPreset.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {currentPreset.prompt}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {currentPreset.desc}
                            </div>
                        </div>
                    </button>
                </div>

                {/* Navigation dots */}
                <div className="flex justify-center gap-1.5">
                    {PRESETS.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToIndex(index)}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                index === currentIndex
                                    ? "w-4 bg-primary"
                                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                            )}
                            aria-label={`Go to suggestion ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Desktop: Grid layout
    return (
        <div className={cn("grid grid-cols-2 gap-3", className)}>
            {PRESETS.map((preset) => (
                <button
                    key={preset.prompt}
                    onClick={() => onSelect(preset.prompt)}
                    className="group bg-card/40 hover:bg-card/60 border border-border/40 hover:border-border/60 rounded-xl p-4 flex items-center gap-3 transition-all duration-200 text-left"
                >
                    <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 text-primary transition-colors">
                        <preset.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {preset.prompt}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {preset.desc}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
