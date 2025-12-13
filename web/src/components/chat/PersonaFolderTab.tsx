"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersonaStore, useActivePersona } from '@/lib/stores/persona-store';
import { getPersonasByCategory } from '@/lib/personas/persona-configs';
import type { PersonaId, Persona } from '@/lib/types/persona';
import { cn } from '@/lib/utils';
import {
  Landmark,
  Zap,
  Shield,
  FileSearch,
  GraduationCap,
  Target,
  LineChart,
  Check,
  ChevronUp,
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

type PersonaFolderTabProps = {
  disabled?: boolean;
};

export function PersonaFolderTab({ disabled }: PersonaFolderTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePersona = useActivePersona();
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);

  const tradingPersonas = getPersonasByCategory('trading');
  const coachingPersonas = getPersonasByCategory('coaching');

  // Flatten all personas for keyboard navigation
  const allPersonas = [...tradingPersonas, ...coachingPersonas];

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Keyboard navigation for listbox
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
      return;
    }

    function handleKeyNav(event: KeyboardEvent) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev < allPersonas.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : allPersonas.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < allPersonas.length) {
            handleSelectPersona(allPersonas[focusedIndex].id);
          }
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(allPersonas.length - 1);
          break;
      }
    }

    document.addEventListener('keydown', handleKeyNav);
    return () => document.removeEventListener('keydown', handleKeyNav);
  }, [isOpen, focusedIndex, allPersonas]);

  const handleSelectPersona = (id: PersonaId) => {
    setActivePersona(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute -top-6 left-0 z-[60]">
      {/* Lifted Folder Tab - sticks out above container */}
      <motion.button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        data-state={isOpen ? "open" : "closed"}
        aria-label={`Persona selector. Currently selected: ${activePersona.name}`}
        className={cn(
          // Lifted glass-tab styling from CSS
          "glass-tab",
          // Layout - taller for better touch target (44px min)
          "flex items-center gap-2 px-3.5 py-2.5",
          // Typography
          "text-xs font-medium text-foreground/80",
          // Interaction
          "transition-colors duration-150",
          // Focus-visible for keyboard accessibility
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        whileHover={!disabled ? { y: -1, scale: 1.02 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
      >
        {/* Persona icon with amber accent */}
        <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/20">
          <PersonaIcon iconName={activePersona.visual.icon} className="h-3 w-3 text-primary" />
        </div>

        {/* Persona name */}
        <span className="max-w-[120px] truncate">{activePersona.name}</span>

        {/* Chevron indicator - points UP when panel is open (opens upward) */}
        <motion.div
          animate={{ rotate: isOpen ? 0 : 180 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronUp className="h-3 w-3 opacity-50" />
        </motion.div>
      </motion.button>

      {/* Dropdown Panel - Opens UPWARD */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              // Position ABOVE the tab (opens up), aligned to left edge
              "absolute bottom-full left-0 mb-1 w-72",
              // Unified glass-panel styling
              "glass-panel",
              "overflow-hidden"
            )}
            role="listbox"
            aria-label="Available personas"
          >
            {/* Panel Header */}
            <div className="glass-panel-header px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                Select Persona
              </h3>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Choose your AI assistant&apos;s personality
              </p>
            </div>

            {/* Persona Categories with Stagger Animation */}
            <motion.div
              className="max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-300/30 dark:scrollbar-thumb-amber-700/30"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.04,
                    delayChildren: 0.1
                  }
                }
              }}
              initial="hidden"
              animate="visible"
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function PersonaCategory({ title, personas, activeId, onSelect, focusedIndex, indexOffset }: PersonaCategoryProps) {
  return (
    <div className="py-2">
      <div className="px-4 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
          {title}
        </span>
      </div>
      <div className="space-y-0.5 px-2">
        {personas.map((persona, index) => (
          <PersonaOption
            key={persona.id}
            persona={persona}
            isActive={persona.id === activeId}
            isFocused={focusedIndex === indexOffset + index}
            onSelect={() => onSelect(persona.id)}
            delay={index * 0.03}
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
  delay?: number;
};

function PersonaOption({ persona, isActive, isFocused, onSelect, delay = 0 }: PersonaOptionProps) {
  return (
    <motion.button
      onClick={onSelect}
      role="option"
      aria-selected={isActive}
      data-focused={isFocused}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay,
        ease: [0.16, 1, 0.3, 1]
      }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg relative",
        "text-left transition-all duration-150",
        isActive
          ? [
              "bg-primary/12",
              "shadow-[inset_0_0_12px_rgba(178,120,50,0.08)]",
              "border border-primary/20"
            ]
          : [
              "hover:bg-primary/8",
              "text-foreground"
            ],
        // Keyboard focus ring
        isFocused && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background"
      )}
      whileHover={{ x: 4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon with gradient background */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
          "bg-gradient-to-br",
          persona.visual.gradient || "from-amber-400 to-amber-600",
          "text-white shadow-sm"
        )}
      >
        <PersonaIcon iconName={persona.visual.icon} className="h-4 w-4" />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-medium truncate",
            isActive ? "text-foreground" : "text-foreground/90"
          )}>
            {persona.name}
          </span>
          {isActive && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 25,
                delay: 0.1
              }}
              className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground shadow-sm"
            >
              <Check className="h-2.5 w-2.5" />
            </motion.div>
          )}
        </div>
        <p className={cn(
          "text-[11px] truncate",
          isActive
            ? "text-muted-foreground"
            : "text-muted-foreground/70"
        )}>
          {persona.shortDescription}
        </p>
      </div>
    </motion.button>
  );
}
