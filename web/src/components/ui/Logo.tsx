'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Text-based logo with BIOS/terminal aesthetic
 * Uses Geist Mono for that DOS command-line feel
 */
export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <span
      className={cn(
        'font-mono font-bold tracking-tight text-foreground',
        sizeClasses[size],
        className
      )}
    >
      deepstack
    </span>
  );
}
