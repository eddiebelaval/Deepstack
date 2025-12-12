'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { Persona } from '@/lib/types/persona';
import { cn } from '@/lib/utils';

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * PersonaCard Component
 * A selectable card displaying persona information with visual styling
 */
export function PersonaCard({ persona, isSelected, onSelect }: PersonaCardProps) {
  // Dynamically get the Lucide icon component
  const IconComponent = (LucideIcons as any)[persona.visual.icon] || LucideIcons.CircleHelp;

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative w-full p-4 rounded-xl border-2 transition-all duration-200',
        'text-left group overflow-hidden',
        'bg-card hover:bg-card/80',
        isSelected
          ? 'border-primary shadow-lg shadow-primary/20'
          : 'border-border hover:border-primary/50'
      )}
    >
      {/* Gradient Background */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300',
          isSelected && 'opacity-20',
          persona.visual.gradient && `bg-gradient-to-br ${persona.visual.gradient}`
        )}
      />

      {/* Content */}
      <div className="relative z-10 flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            'transition-colors duration-200',
            isSelected ? 'bg-primary/20' : 'bg-muted'
          )}
          style={{
            color: isSelected ? `var(--${persona.visual.color})` : undefined,
          }}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm">{persona.name}</h4>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-primary-foreground" />
              </motion.div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {persona.shortDescription}
          </p>
          <p className="text-xs text-foreground/70 line-clamp-2">
            {persona.description}
          </p>
        </div>
      </div>

      {/* Selected Border Glow */}
      {isSelected && (
        <motion.div
          layoutId="selected-persona"
          className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
    </motion.button>
  );
}
