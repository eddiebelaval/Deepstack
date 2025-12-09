'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * SquareCard - Unified 1:1 aspect ratio card component
 *
 * Used across:
 * - Prediction Markets (BetsCarouselCard)
 * - News Feed (NewsFeedCard)
 * - Market Watch panels
 *
 * Features:
 * - Enforces 1:1 aspect ratio via CSS
 * - Consistent styling with hover/active states
 * - Slot-based layout: Header, Content, Footer
 * - Supports highlighted/watched states
 * - Responsive sizing based on container
 */

interface SquareCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  isHighlighted?: boolean;
  isSelected?: boolean;
  hoverGradient?: string;
  as?: 'div' | 'a' | 'button';
}

const SquareCard = React.forwardRef<HTMLDivElement, SquareCardProps>(
  (
    {
      children,
      className,
      onClick,
      href,
      isHighlighted = false,
      isSelected = false,
      hoverGradient,
      as = 'div',
    },
    ref
  ) => {
    const baseStyles = cn(
      // 1:1 aspect ratio - the key feature
      'aspect-square',
      // Flex column layout for slotted content
      'relative flex flex-col p-3 overflow-hidden',
      // Visual styling matching existing cards
      'rounded-xl transition-all duration-200',
      'border border-border/50 hover:border-border/80',
      'bg-card/80 hover:bg-card hover:shadow-lg',
      // Interaction states
      'cursor-pointer group',
      // Highlighted state (watchlist/bookmarked)
      isHighlighted && 'ring-2 ring-primary/30',
      // Selected state
      isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/30',
      className
    );

    const content = (
      <>
        {/* Optional hover gradient overlay */}
        {hoverGradient && (
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
              hoverGradient
            )}
          />
        )}
        {children}
      </>
    );

    // Render as anchor if href provided
    if (href || as === 'a') {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={baseStyles}
          onClick={onClick}
        >
          {content}
        </a>
      );
    }

    // Render as button if specified
    if (as === 'button') {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          className={baseStyles}
          onClick={onClick}
          type="button"
        >
          {content}
        </button>
      );
    }

    // Default: render as div
    return (
      <div ref={ref} className={baseStyles} onClick={onClick}>
        {content}
      </div>
    );
  }
);
SquareCard.displayName = 'SquareCard';

/**
 * SquareCardHeader - Top section for badges and action buttons
 */
interface SquareCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

function SquareCardHeader({ children, className }: SquareCardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between mb-1.5 shrink-0 relative z-10',
        className
      )}
    >
      {children}
    </div>
  );
}
SquareCardHeader.displayName = 'SquareCardHeader';

/**
 * SquareCardContent - Main content area (flexible height)
 */
interface SquareCardContentProps {
  children: React.ReactNode;
  className?: string;
}

function SquareCardContent({ children, className }: SquareCardContentProps) {
  return (
    <div className={cn('flex-1 min-h-0 relative z-10', className)}>
      {children}
    </div>
  );
}
SquareCardContent.displayName = 'SquareCardContent';

/**
 * SquareCardFooter - Bottom section for stats and actions
 */
interface SquareCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

function SquareCardFooter({ children, className }: SquareCardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-end justify-between shrink-0 relative z-10 mt-auto',
        className
      )}
    >
      {children}
    </div>
  );
}
SquareCardFooter.displayName = 'SquareCardFooter';

/**
 * SquareCardTitle - Consistent title styling with line clamping
 */
interface SquareCardTitleProps {
  children: React.ReactNode;
  className?: string;
  lines?: 2 | 3;
}

function SquareCardTitle({
  children,
  className,
  lines = 2,
}: SquareCardTitleProps) {
  return (
    <h3
      className={cn(
        'text-xs font-semibold text-foreground leading-tight relative z-10',
        lines === 2 ? 'line-clamp-2 min-h-[2rem]' : 'line-clamp-3',
        className
      )}
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </h3>
  );
}
SquareCardTitle.displayName = 'SquareCardTitle';

/**
 * SquareCardActionButton - Consistent action button styling (star, bookmark, etc)
 */
interface SquareCardActionButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  isActive?: boolean;
  activeClassName?: string;
  title?: string;
}

function SquareCardActionButton({
  children,
  onClick,
  isActive = false,
  activeClassName = 'text-yellow-500 hover:text-yellow-400',
  title,
}: SquareCardActionButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.(e);
      }}
      className={cn(
        'p-1 rounded-full transition-all',
        isActive
          ? activeClassName
          : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100'
      )}
      title={title}
    >
      {children}
    </button>
  );
}
SquareCardActionButton.displayName = 'SquareCardActionButton';

export {
  SquareCard,
  SquareCardHeader,
  SquareCardContent,
  SquareCardFooter,
  SquareCardTitle,
  SquareCardActionButton,
};
