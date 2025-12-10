'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StickySectionProps {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  // Control how tall the scrollable area is (content scrolls beneath sticky header)
  scrollHeight?: string;
  // Whether to show the gradient fade on header
  showGradient?: boolean;
  // Badge text above title
  badge?: string;
  badgeIcon?: React.ReactNode;
}

export function StickySection({
  id,
  title,
  subtitle,
  children,
  className,
  headerClassName,
  contentClassName,
  scrollHeight = 'min-h-[60vh]',
  showGradient = true,
  badge,
  badgeIcon,
}: StickySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  // Track scroll progress within this section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Transform values for smooth header animations
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1, 0.8, 1], [0.7, 1, 1, 0.5]);
  const headerScale = useTransform(scrollYProgress, [0, 0.1, 0.8, 1], [0.95, 1, 1, 0.98]);
  const headerY = useTransform(scrollYProgress, [0, 0.1], [20, 0]);

  return (
    <section
      id={id}
      ref={sectionRef}
      className={cn('relative', scrollHeight, className)}
    >
      {/* Sticky Header */}
      <motion.header
        style={{
          opacity: headerOpacity,
          scale: headerScale,
          y: headerY,
        }}
        className={cn(
          // Sticky with more breathing room - about 1/3 down the viewport
          'sticky top-[20vh] z-30 pt-8 pb-6',
          // Gradient background that fades to transparent
          showGradient && 'bg-gradient-to-b from-background via-background/90 to-transparent',
          'backdrop-blur-md',
          headerClassName
        )}
      >
        <div className="max-w-6xl mx-auto px-4">
          {/* Optional badge */}
          {badge && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20"
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
            className="text-3xl md:text-5xl font-bold tracking-tight"
          >
            {title}
          </motion.h2>

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </motion.header>

      {/* Content that scrolls beneath header */}
      <div className={cn('relative z-20 px-4', contentClassName)}>
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </section>
  );
}

// Scroll progress indicator for the entire page
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-primary z-[100] origin-left"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

// Feature card that animates in on scroll
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

// Step card for "How it works" section
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
