'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  fallbackClassName?: string;
  fallbackChar?: string;
  onError?: () => void;
}

/**
 * OptimizedImage - Wrapper around next/image with fallback handling
 *
 * Benefits:
 * - Automatic WebP/AVIF conversion
 * - Lazy loading by default
 * - Proper sizing with srcset
 * - Graceful fallback on error
 */
export function OptimizedImage({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  className,
  containerClassName,
  fallbackClassName,
  fallbackChar,
  onError,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError || !src) {
    return (
      <div
        className={cn(
          'bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center',
          fill && 'absolute inset-0',
          fallbackClassName
        )}
      >
        {fallbackChar && (
          <span className="text-4xl font-bold text-muted-foreground/20">
            {fallbackChar}
          </span>
        )}
      </div>
    );
  }

  // For external URLs, use next/image with unoptimized for problematic sources
  // or regular optimization for known good sources
  const isExternalUrl = src.startsWith('http');

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn('object-cover', className)}
        onError={handleError}
        unoptimized={isExternalUrl} // Avoid optimization issues with external images
      />
    );
  }

  return (
    <div className={containerClassName}>
      <Image
        src={src}
        alt={alt}
        width={width || 400}
        height={height || 300}
        sizes={sizes}
        priority={priority}
        className={cn('object-cover', className)}
        onError={handleError}
        unoptimized={isExternalUrl}
      />
    </div>
  );
}

export default OptimizedImage;
