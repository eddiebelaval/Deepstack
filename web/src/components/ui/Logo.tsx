'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Brand logo using Urbanist Regular 400
 * All lowercase "deepstack" for modern, clean aesthetic
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
        'font-urbanist font-normal tracking-tight text-foreground',
        sizeClasses[size],
        className
      )}
    >
      deepstack
    </span>
  );
}

/**
 * Standalone brand name component for use anywhere in the app
 * Uses Urbanist Regular 400, always lowercase
 */
export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn('font-urbanist font-normal', className)}>
      deepstack
    </span>
  );
}
