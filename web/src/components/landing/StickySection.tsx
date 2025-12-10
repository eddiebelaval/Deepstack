'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// STICKY SECTION - Linear.app style with alternating left/right headers
// ============================================================================

interface StickySectionProps {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  // Control how tall the scrollable area is
  scrollHeight?: string;
  // Whether to show the gradient fade on header
  showGradient?: boolean;
  // Badge text above title
  badge?: string;
  badgeIcon?: React.ReactNode;
  // Badge color scheme
  badgeColor?: string;
  // Title gradient/color
  titleAccent?: string;
  // Header alignment: 'left', 'right', or 'center'
  align?: 'left' | 'right' | 'center';
  // Deprecated: use align='center' instead
  centerHeader?: boolean;
}

export function StickySection({
  id,
  title,
  subtitle,
  children,
  className,
  headerClassName,
  contentClassName,
  scrollHeight = 'min-h-[100vh]',
  showGradient = true,
  badge,
  badgeIcon,
  badgeColor = 'bg-primary/10 text-primary border-primary/20',
  titleAccent,
  align = 'left',
  centerHeader,
}: StickySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  // Handle deprecated centerHeader prop
  const effectiveAlign = centerHeader !== undefined ? (centerHeader ? 'center' : 'left') : align;
  const isCenter = effectiveAlign === 'center';
  const isRight = effectiveAlign === 'right';
  const isLeft = effectiveAlign === 'left';

  // Track scroll progress within this section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Transform values for smooth header animations - FULL OPACITY, no fade
  const headerScale = useTransform(scrollYProgress, [0, 0.1, 0.7, 0.9], [0.98, 1, 1, 0.98]);
  const headerY = useTransform(scrollYProgress, [0, 0.1], [20, 0]);

  return (
    <section
      id={id}
      ref={sectionRef}
      className={cn('relative', scrollHeight, className)}
    >
      {/* Two-column layout with stagger: Header appears FIRST, content BELOW */}
      {!isCenter && (
        <div className="max-w-7xl mx-auto px-4 pt-16 lg:pt-24">
          {/* Header Row - shows FIRST at top of section */}
          <motion.header
            style={{
              scale: headerScale,
              y: headerY,
            }}
            className={cn(
              'lg:sticky lg:top-[20vh] lg:z-10',
              'lg:grid lg:grid-cols-2 lg:gap-16',
              headerClassName
            )}
          >
            <div className={cn(
              'max-w-lg',
              isRight && 'lg:col-start-2 lg:ml-auto lg:text-right',
              !isRight && 'lg:col-start-1'
            )}>
              {/* Optional badge */}
              {badge && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-6 border',
                    badgeColor,
                    isRight && 'lg:ml-auto'
                  )}
                >
                  {badgeIcon}
                  {badge}
                </motion.div>
              )}

              {/* Title - potentially with accent color */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]"
              >
                {titleAccent ? (
                  <>
                    {title.split(' ').slice(0, -1).join(' ')}{' '}
                    <span className={titleAccent}>{title.split(' ').slice(-1)}</span>
                  </>
                ) : (
                  title
                )}
              </motion.h2>

              {/* Subtitle */}
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mt-6 text-lg text-muted-foreground leading-relaxed"
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          </motion.header>

          {/* Content - positioned BELOW header with moderate offset */}
          <div className={cn(
            'lg:grid lg:grid-cols-2 lg:gap-16',
            'mt-12 lg:mt-[12vh]', // Moderate offset to keep content visible without huge gaps
            'pb-12'
          )}>
            <div className={cn(
              'relative',
              isRight && 'lg:col-start-1',
              !isRight && 'lg:col-start-2',
              contentClassName
            )}>
              {children}
            </div>
          </div>
        </div>
      )}

      {/* Centered layout - header at top, content below (no overlap) */}
      {isCenter && (
        <div className="max-w-6xl mx-auto px-4 pt-16 lg:pt-24">
          {/* Centered header */}
          <motion.header
            style={{
              scale: headerScale,
              y: headerY,
            }}
            className={cn(
              'text-center mb-16',
              headerClassName
            )}
          >
            <div className="max-w-4xl mx-auto flex flex-col items-center">
              {/* Optional badge */}
              {badge && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-6 border',
                    badgeColor
                  )}
                >
                  {badgeIcon}
                  {badge}
                </motion.div>
              )}

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
              >
                {titleAccent ? (
                  <>
                    {title.split(' ').slice(0, -1).join(' ')}{' '}
                    <span className={titleAccent}>{title.split(' ').slice(-1)}</span>
                  </>
                ) : (
                  title
                )}
              </motion.h2>

              {/* Subtitle */}
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          </motion.header>

          {/* Content - positioned below header with proper spacing */}
          <div className={cn('relative pb-16', contentClassName)}>
            {children}
          </div>
        </div>
      )}
    </section>
  );
}

// Helper for motion template
function useMotionTemplate(strings: TemplateStringsArray, ...values: MotionValue<number>[]) {
  return useTransform(values[0], (v) => `blur(${v}px)`);
}

// ============================================================================
// SCROLL PROGRESS BAR
// ============================================================================

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-primary z-[100] origin-left"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

// ============================================================================
// PARALLAX SECTION - Horizontal movement on scroll
// ============================================================================

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'left' | 'right';
  speed?: number; // 0-100, how much to move
}

export function ParallaxSection({
  children,
  className,
  direction = 'left',
  speed = 20,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    direction === 'left' ? [speed, -speed] : [-speed, speed]
  );

  return (
    <div ref={ref} className={cn('overflow-hidden', className)}>
      <motion.div style={{ x }}>
        {children}
      </motion.div>
    </div>
  );
}

// ============================================================================
// FEATURE CARD - Animated on scroll
// ============================================================================

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: string;
  bgColor?: string;
  delay?: number;
}

export function FeatureCard({
  icon,
  title,
  description,
  color = 'text-primary',
  bgColor = 'bg-primary/10',
  delay = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-6 hover:border-primary/50 hover:bg-card/60 transition-colors duration-300 group"
    >
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300', bgColor)}>
        <div className={color}>{icon}</div>
      </div>
      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

// ============================================================================
// STEP CARD - For "How it works" sections
// ============================================================================

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  delay?: number;
}

export function StepCard({ step, title, description, delay = 0 }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      className="flex gap-4 items-start"
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/30">
        {step}
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SCROLL REVEAL - Items that reveal on scroll with stagger
// ============================================================================

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
}: ScrollRevealProps) {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// SCALE ON SCROLL - Element scales based on scroll position
// ============================================================================

interface ScaleOnScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function ScaleOnScroll({ children, className }: ScaleOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.5, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ scale, opacity }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// FLOATING ELEMENT - Subtle floating animation
// ============================================================================

interface FloatingProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}

export function Floating({
  children,
  className,
  duration = 3,
  distance = 10,
}: FloatingProps) {
  return (
    <motion.div
      animate={{ y: [-distance / 2, distance / 2, -distance / 2] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// GRADIENT TEXT - Animated gradient text
// ============================================================================

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
}

export function GradientText({
  children,
  className,
  from = 'from-primary',
  via = 'via-orange-400',
  to = 'to-yellow-400',
}: GradientTextProps) {
  return (
    <span
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]',
        from,
        via,
        to,
        className
      )}
    >
      {children}
    </span>
  );
}
