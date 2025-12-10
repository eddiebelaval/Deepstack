'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect } from 'react';
import {
  MessageSquare,
  TrendingUp,
  Shield,
  BookOpen,
  Lightbulb,
  ChevronRight,
  Zap,
  BarChart3,
  Brain,
  Search,
  Target,
  LineChart,
  Sparkles,
} from 'lucide-react';

import { IntelligentBackground } from '@/components/landing/IntelligentBackground';
import { FrostedOverlay } from '@/components/landing/FrostedOverlay';
import {
  ScrollProgressBar,
  FeatureCard,
  StepCard,
} from '@/components/landing/StickySection';

const FEATURES = [
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'AI Research Assistant',
    description: 'Ask about any stock. Get analysis, news summaries, and thesis validation in seconds.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Live Market Data',
    description: 'Real-time quotes, interactive charts, and technical indicators for every ticker.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Emotional Firewall',
    description: 'Get warned before FOMO, fear, or greed influence your research decisions.',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Trade Journal',
    description: 'Log your reasoning with emotional tags. Review patterns in your decision-making.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: 'Thesis Engine',
    description: 'Document hypotheses with price targets. Track which ideas played out correctly.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Prediction Markets',
    description: 'See probability-weighted outcomes from Polymarket and Kalshi alongside your research.',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Ask anything about a stock',
    description: '"What\'s happening with NVDA?" or "Analyze semiconductor sector risks" — the AI researches in real-time.',
  },
  {
    step: 2,
    title: 'Build your investment thesis',
    description: 'Document your hypothesis with entry/exit targets. The AI remembers and validates against new information.',
  },
  {
    step: 3,
    title: 'Track your decision patterns',
    description: 'Journal entries with emotional tags reveal when you\'re thinking clearly vs. reacting emotionally.',
  },
  {
    step: 4,
    title: 'Get smarter over time',
    description: 'Review which theses played out. Learn from your hits and misses. Compound your edge.',
  },
];

const AI_CAPABILITIES = [
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Real-time research',
    description: 'News, filings, price action — synthesized instantly',
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: 'Thesis awareness',
    description: 'AI knows your active positions and validates new info against them',
  },
  {
    icon: <LineChart className="w-5 h-5" />,
    title: 'Technical analysis',
    description: 'Chart patterns, support/resistance, momentum indicators',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Emotional context',
    description: 'Reads your journal — warns when emotions might cloud judgment',
  },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Parallax transforms for hero
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 50]);

  // Enable scrolling on landing page (overrides global overflow:hidden)
  useEffect(() => {
    document.documentElement.classList.add('landing-page');
    document.body.classList.add('landing-page');
    return () => {
      document.documentElement.classList.remove('landing-page');
      document.body.classList.remove('landing-page');
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Background Layer - Fixed position */}
      <div className="fixed inset-0 z-0">
        <IntelligentBackground />
      </div>

      {/* Frosted Glass Overlay */}
      <FrostedOverlay intensity="medium" className="fixed inset-0 z-10" />

      {/* Content Layer */}
      <div className="relative z-20">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-md border-b border-border/20 supports-[backdrop-filter]:bg-background/20">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-7 h-7 text-primary animate-pulse-soft" />
              <span className="text-xl font-semibold tracking-tight">DeepStack</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/help"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
              >
                Help
              </Link>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/"
                className="px-4 py-2 text-sm bg-primary/90 text-primary-foreground hover:bg-primary rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(251,146,60,0.3)] hover:shadow-[0_0_25px_rgba(251,146,60,0.5)]"
              >
                Try Demo
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section - Parallax on scroll */}
        <section ref={heroRef} className="min-h-screen flex items-center justify-center pt-16 px-4 relative">
          <motion.div
            style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
            className="max-w-5xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20 backdrop-blur-sm"
            >
              <Zap className="w-4 h-4" />
              <span>Research Platform — Not a Broker</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-[1.1]"
            >
              The Intelligence
              <br />
              <span className="text-gradient-shimmer">Beneath the Market</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              AI-powered research that knows your thesis, tracks your emotions, and helps you see what others miss.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/"
                className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all text-lg flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(251,146,60,0.4)] hover:shadow-[0_0_40px_rgba(251,146,60,0.6)]"
              >
                Start Researching
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 rounded-xl font-medium transition-all text-lg backdrop-blur-sm border border-border/50"
              >
                See How It Works
              </Link>
            </motion.div>

            {/* Trust Signal */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-8 text-sm text-muted-foreground/80"
            >
              Free to use · No credit card required · Your data stays private
            </motion.p>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
              >
                <motion.div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="mb-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20"
              >
                <Sparkles className="w-4 h-4" />
                How It Works
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl md:text-5xl font-bold tracking-tight"
              >
                Research that compounds
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl"
              >
                Most tools give you data. DeepStack gives you an edge that grows with every decision you make.
              </motion.p>
            </div>
            {/* Content */}
            <div className="grid md:grid-cols-2 gap-6">
              {HOW_IT_WORKS.map((item, i) => (
                <StepCard
                  key={item.step}
                  step={item.step}
                  title={item.title}
                  description={item.description}
                  delay={i * 0.1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 bg-card/20">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="mb-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20"
              >
                <Zap className="w-4 h-4" />
                Features
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl md:text-5xl font-bold tracking-tight"
              >
                Everything you need to research smarter
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl"
              >
                Six tools. One integrated workspace. Zero context-switching.
              </motion.p>
            </div>
            {/* Feature cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feature, i) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  color={feature.color}
                  bgColor={feature.bgColor}
                  delay={i * 0.08}
                />
              ))}
            </div>
          </div>
        </section>

        {/* AI Assistant Section */}
        <section id="ai-assistant" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="mb-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20"
              >
                <Brain className="w-4 h-4" />
                AI Assistant
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl md:text-5xl font-bold tracking-tight"
              >
                An AI that actually knows your portfolio
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl"
              >
                Not a generic chatbot. A research partner that remembers your thesis, reads your journal, and warns you before emotions take over.
              </motion.p>
            </div>
            {/* AI capabilities */}
            <div className="grid md:grid-cols-2 gap-4">
              {AI_CAPABILITIES.map((cap, i) => (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex gap-4 p-4 rounded-xl bg-card/30 border border-border/30 backdrop-blur-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {cap.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold">{cap.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{cap.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Example prompts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 p-6 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md"
            >
              <p className="text-sm text-muted-foreground mb-4">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  '"What\'s happening with NVDA today?"',
                  '"Review my recent journal — am I trading emotionally?"',
                  '"What are my active theses?"',
                  '"Analyze AAPL\'s risk/reward at current levels"',
                ].map((prompt) => (
                  <span
                    key={prompt}
                    className="px-3 py-1.5 text-sm bg-muted/50 rounded-full border border-border/50"
                  >
                    {prompt}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              Ready to research differently?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-muted-foreground text-xl mb-10"
            >
              Join thousands of investors using DeepStack to build conviction and track their edge.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link
                href="/"
                className="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold transition-all text-xl group shadow-[0_0_30px_rgba(251,146,60,0.4)] hover:shadow-[0_0_50px_rgba(251,146,60,0.6)] hover:scale-105"
              >
                Launch DeepStack
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-border/20 bg-background/60 backdrop-blur-md">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="font-semibold tracking-tight">DeepStack</span>
                <span className="text-muted-foreground text-sm ml-2 px-2 py-0.5 bg-muted rounded-full">
                  Research Platform
                </span>
              </div>
              <div className="flex items-center gap-8 text-sm font-medium">
                <Link
                  href="/help"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Help Center
                </Link>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </div>
            <div className="mt-8 text-center text-xs text-muted-foreground/60 max-w-2xl mx-auto leading-relaxed">
              DeepStack is a research platform powered by AI. It does not execute trades or provide
              personalized financial advice. All investing involves risk.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
