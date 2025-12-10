'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedChartIconProps {
  className?: string;
  size?: number;
}

/**
 * Animated mini-chart icon with green trend line
 * Shows static chart at rest, animates upward trend on hover
 */
export function AnimatedChartIcon({ className, size = 16 }: AnimatedChartIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Chart background grid lines */}
        <g className="opacity-20">
          <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="0.5" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="0.5" />
          <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="0.5" />
        </g>

        {/* Chart axes */}
        <path
          d="M4 4 L4 20 L20 20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="opacity-40"
        />

        {/* Animated trend line - green upward trend */}
        <path
          d="M6 16 L9 14 L12 15 L15 10 L18 6"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className={cn(
            'transition-all duration-500 ease-out',
            isHovered ? 'opacity-100' : 'opacity-60'
          )}
          style={{
            strokeDasharray: isHovered ? '0' : '50',
            strokeDashoffset: isHovered ? '0' : '50',
            transition: 'stroke-dasharray 0.6s ease-out, stroke-dashoffset 0.6s ease-out, opacity 0.3s',
          }}
        />

        {/* Data points that appear on hover */}
        <g
          className={cn(
            'transition-opacity duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <circle cx="6" cy="16" r="2" fill="#22c55e" />
          <circle cx="9" cy="14" r="2" fill="#22c55e" />
          <circle cx="12" cy="15" r="2" fill="#22c55e" />
          <circle cx="15" cy="10" r="2" fill="#22c55e" />
          <circle cx="18" cy="6" r="2" fill="#22c55e" />
        </g>

        {/* Glow effect on hover */}
        {isHovered && (
          <path
            d="M6 16 L9 14 L12 15 L15 10 L18 6"
            stroke="#22c55e"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="opacity-30 blur-[2px]"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Alternative: Smaller variant for tight spaces
 */
export function AnimatedChartIconSmall({ className }: { className?: string }) {
  return <AnimatedChartIcon className={className} size={14} />;
}

export default AnimatedChartIcon;
