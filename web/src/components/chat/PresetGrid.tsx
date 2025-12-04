import React from 'react';
import { PRESETS } from '@/lib/presets';
import { cn } from '@/lib/utils';

interface PresetGridProps {
    onSelect: (prompt: string) => void;
    className?: string;
}

export function PresetGrid({ onSelect, className }: PresetGridProps) {
    return (
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
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
