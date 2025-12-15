"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersonaStore, useActivePersona } from '@/lib/stores/persona-store';
import { getPersonasByCategory } from '@/lib/personas/persona-configs';
import type { PersonaId, Persona } from '@/lib/types/persona';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Landmark,
  Zap,
  Shield,
  FileSearch,
  GraduationCap,
  Target,
  LineChart,
  Check,
} from 'lucide-react';

// Map persona icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Landmark,
  Zap,
  Shield,
  FileSearch,
  GraduationCap,
  Target,
  LineChart,
};

function PersonaIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = iconMap[iconName] || FileSearch;
  return <Icon className={className} />;
}

type PersonaSelectorProps = {
  disabled?: boolean;
};

export function PersonaSelector({ disabled }: PersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const activePersona = useActivePersona();
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);

  const tradingPersonas = getPersonasByCategory('trading');
  const coachingPersonas = getPersonasByCategory('coaching');
  const allPersonas = [...tradingPersonas, ...coachingPersonas];

  // Reset focus when opening
  useEffect(() => {
    if (isOpen) {
      const currentIndex = allPersonas.findIndex(p => p.id === activePersona.id);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, activePersona.id, allPersonas]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < allPersonas.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : allPersonas.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allPersonas.length) {
          handleSelectPersona(allPersonas[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelectPersona = (id: PersonaId) => {
    setActivePersona(id);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-11 w-11 rounded-xl shrink-0"
          title={`Persona: ${activePersona.name}`}
          onKeyDown={handleKeyDown}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted"
          >
            <PersonaIcon iconName={activePersona.visual.icon} className="h-4 w-4 text-foreground" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-72 p-0 rounded-xl"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Select Persona</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose your AI assistant&apos;s style
          </p>
        </div>

        {/* Persona list */}
        <div className="max-h-[320px] overflow-y-auto scrollbar-thin p-2">
          <PersonaCategory
            title="Trading Style"
            personas={tradingPersonas}
            activeId={activePersona.id}
            onSelect={handleSelectPersona}
            focusedIndex={focusedIndex}
            indexOffset={0}
          />
          <PersonaCategory
            title="Coaching Style"
            personas={coachingPersonas}
            activeId={activePersona.id}
            onSelect={handleSelectPersona}
            focusedIndex={focusedIndex}
            indexOffset={tradingPersonas.length}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

type PersonaCategoryProps = {
  title: string;
  personas: Persona[];
  activeId: PersonaId;
  onSelect: (id: PersonaId) => void;
  focusedIndex: number;
  indexOffset: number;
};

function PersonaCategory({
  title,
  personas,
  activeId,
  onSelect,
  focusedIndex,
  indexOffset,
}: PersonaCategoryProps) {
  return (
    <div className="py-1">
      <div className="px-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="space-y-0.5">
        {personas.map((persona, index) => (
          <PersonaOption
            key={persona.id}
            persona={persona}
            isActive={persona.id === activeId}
            isFocused={focusedIndex === indexOffset + index}
            onSelect={() => onSelect(persona.id)}
          />
        ))}
      </div>
    </div>
  );
}

type PersonaOptionProps = {
  persona: Persona;
  isActive: boolean;
  isFocused: boolean;
  onSelect: () => void;
};

function PersonaOption({ persona, isActive, isFocused, onSelect }: PersonaOptionProps) {
  const optionRef = useRef<HTMLButtonElement>(null);

  // Scroll focused option into view
  useEffect(() => {
    if (isFocused && optionRef.current) {
      optionRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isFocused]);

  return (
    <button
      ref={optionRef}
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
        "transition-colors duration-150",
        isActive
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50",
        isFocused && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
          isActive ? "bg-foreground text-background" : "bg-muted text-foreground"
        )}
      >
        <PersonaIcon iconName={persona.visual.icon} className="h-4 w-4" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{persona.name}</span>
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground"
            >
              <Check className="h-2.5 w-2.5" />
            </motion.div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {persona.shortDescription}
        </p>
      </div>
    </button>
  );
}
