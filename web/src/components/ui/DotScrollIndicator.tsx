"use client"

import { useEffect, useState, useRef, RefObject } from 'react'
import { cn } from '@/lib/utils'

type DotScrollIndicatorProps = {
  scrollRef: RefObject<HTMLElement | null>
  maxDots?: number
  className?: string
  /** Minimum height increase from initial to show dots (default: 20px) */
  minHeightGrowth?: number
}

export function DotScrollIndicator({
  scrollRef,
  maxDots = 5,
  className,
  minHeightGrowth = 20
}: DotScrollIndicatorProps) {
  const initialHeightRef = useRef<number | null>(null)
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    hasGrown: false, // tracks if element has grown from initial size
    scrollPercent: 0,
    contentRatio: 1, // ratio of visible to total content
  })

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    // Capture initial height on first render
    if (initialHeightRef.current === null) {
      initialHeightRef.current = element.clientHeight
    }

    const updateScrollState = () => {
      const { scrollTop, scrollHeight, clientHeight } = element
      // Require at least 10px of overflow before considering scrollable
      const minOverflow = 10
      const isScrollable = scrollHeight > clientHeight + minOverflow
      const maxScroll = scrollHeight - clientHeight
      const scrollPercent = maxScroll > 0 ? scrollTop / maxScroll : 0
      const contentRatio = scrollHeight > 0 ? clientHeight / scrollHeight : 1

      // Check if element has grown from its initial height
      const hasGrown = initialHeightRef.current !== null &&
        clientHeight > initialHeightRef.current + minHeightGrowth

      setScrollState({ isScrollable, hasGrown, scrollPercent, contentRatio })
    }

    // Initial check
    updateScrollState()

    // Listen for scroll and content changes
    element.addEventListener('scroll', updateScrollState)

    // Use ResizeObserver for content changes
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(element)

    return () => {
      element.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [scrollRef, minHeightGrowth])

  // Don't render if not scrollable OR if element hasn't grown
  if (!scrollState.isScrollable || !scrollState.hasGrown) return null

  // Calculate number of dots based on content ratio (more content = more dots)
  const dotCount = Math.min(
    maxDots,
    Math.max(3, Math.ceil((1 / scrollState.contentRatio) * 2))
  )

  // Determine which dot is active based on scroll position
  const activeDotIndex = Math.round(scrollState.scrollPercent * (dotCount - 1))

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 py-2 animate-in fade-in duration-300",
        className
      )}
    >
      {Array.from({ length: dotCount }).map((_, index) => {
        const isActive = index === activeDotIndex
        return (
          <div
            key={index}
            className={cn(
              "rounded-full transition-all duration-200",
              isActive
                ? "w-2 h-2 bg-primary shadow-[0_0_6px_rgba(178,120,50,0.5)]"
                : "w-1.5 h-1.5 bg-primary/30"
            )}
          />
        )
      })}
    </div>
  )
}
