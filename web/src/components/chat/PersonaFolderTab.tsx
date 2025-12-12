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
  const containerRef = useRef<HTMLDivElement>(null);
  const activePersona = useActivePersona();
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);

  const tradingPersonas = getPersonasByCategory('trading');
  const coachingPersonas = getPersonasByCategory('coaching');

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

  const handleSelectPersona = (id: PersonaId) => {
    setActivePersona(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute -top-3 left-4 z-[60]">
      {/* Layered Manila Folder Tab */}
      <div className="relative manila-folder-layers">
        <motion.button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-label={`Persona selector. Currently selected: ${activePersona.name}`}
          className={cn(
            // Base structure
            "relative flex items-center gap-1.5 px-4 py-2",
            // Authentic manila folder shape - rounded top with curves
            "rounded-t-[14px]",
            // Manila gradient (CSS class - Tailwind vars don't work here)
            "manila-tab-gradient",
            // Border without bottom (connects to input)
            "border border-b-0 border-amber-600/40 dark:border-amber-500/40",
            // Multi-layer shadow for depth
            "manila-edge-shadow",
            // Paper texture overlay
            "manila-paper-texture",
            // Typography
            "text-amber-900 dark:text-amber-100",
            "text-xs font-medium tracking-tight",
            // Interaction states
            "transition-all duration-200",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen && "shadow-lg"
          )}
          style={{
            transformStyle: 'preserve-3d',
          }}
          whileHover={!disabled ? {
            y: -3,
            scale: 1.02,
            transition: {
              type: "spring",
              stiffness: 400,
              damping: 25
            }
          } : undefined}
          whileTap={!disabled ? {
            scale: 0.98,
            y: -1,
            transition: { duration: 0.1 }
          } : undefined}
          animate={isOpen ? { y: -2 } : { y: 0 }}
        >
          {/* Persona icon */}
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-amber-500/20 to-amber-600/30 dark:from-amber-400/20 dark:to-amber-500/30">
            <PersonaIcon iconName={activePersona.visual.icon} className="h-3 w-3" />
          </div>

          {/* Persona name */}
          <span className="max-w-[120px] truncate">{activePersona.name}</span>

          {/* Chevron indicator */}
          <motion.div
            animate={{ rotate: isOpen ? 0 : 180 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <ChevronUp className="h-3 w-3 opacity-50" />
          </motion.div>
        </motion.button>
      </div>

      {/* Slide-up Panel - Folder Interior */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95, rotateX: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              rotateX: 0,
            }}
            exit={{
              opacity: 0,
              y: 10,
              scale: 0.97,
              rotateX: 4,
              transition: { duration: 0.15, ease: [0.4, 0, 1, 1] }
            }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: 0.25 }
            }}
            style={{
              transformOrigin: "bottom left",
              transformPerspective: 1200,
              transformStyle: "preserve-3d",
            }}
            className={cn(
              "absolute bottom-full left-0 mb-0 w-72",
              // Folder interior colors (CSS class - Tailwind vars don't work)
              "manila-panel-bg",
              "backdrop-blur-xl",
              // Folder crease at top
              "manila-crease",
              // Borders (no bottom-left to connect with tab)
              "border border-amber-600/30 dark:border-amber-500/30",
              "rounded-xl rounded-bl-none",
              // Elevated shadow
              "shadow-[0_-8px_32px_rgba(0,0,0,0.12),0_-2px_12px_rgba(120,80,40,0.15)]",
              "dark:shadow-[0_-8px_40px_rgba(0,0,0,0.4),0_-2px_16px_rgba(80,50,20,0.3)]",
              // Paper texture
              "manila-paper-texture",
              "overflow-hidden"
            )}
            role="listbox"
            aria-label="Available personas"
          >
            {/* Panel Header */}
            <div className="px-4 py-3 manila-panel-header">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Select Persona
              </h3>
              <p className="text-xs text-amber-700/60 dark:text-amber-300/50 mt-0.5">
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
              />
              <PersonaCategory
                title="Coaching Style"
                personas={coachingPersonas}
                activeId={activePersona.id}
                onSelect={handleSelectPersona}
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
};

function PersonaCategory({ title, personas, activeId, onSelect }: PersonaCategoryProps) {
  return (
    <div className="py-2">
      <div className="px-4 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/60 dark:text-amber-400/50">
          {title}
        </span>
      </div>
      <div className="space-y-0.5 px-2">
        {personas.map((persona, index) => (
          <PersonaOption
            key={persona.id}
            persona={persona}
            isActive={persona.id === activeId}
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
  onSelect: () => void;
  delay?: number;
};

function PersonaOption({ persona, isActive, onSelect, delay = 0 }: PersonaOptionProps) {
  return (
    <motion.button
      onClick={onSelect}
      role="option"
      aria-selected={isActive}
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
              "bg-gradient-to-r from-amber-200/70 to-amber-300/50",
              "dark:from-amber-800/50 dark:to-amber-700/30",
              "shadow-sm",
              // Bookmark indicator
              "manila-bookmark"
            ]
          : [
              "hover:bg-amber-100/40 dark:hover:bg-amber-900/25",
              "text-amber-800 dark:text-amber-200"
            ]
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
            isActive ? "text-amber-950 dark:text-amber-50" : ""
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
              className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white shadow-sm"
            >
              <Check className="h-2.5 w-2.5" />
            </motion.div>
          )}
        </div>
        <p className={cn(
          "text-[11px] truncate",
          isActive
            ? "text-amber-800/70 dark:text-amber-200/60"
            : "text-amber-700/50 dark:text-amber-300/40"
        )}>
          {persona.shortDescription}
        </p>
      </div>
    </motion.button>
  );
}
