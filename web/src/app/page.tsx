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
  Sparkles,
  AlertTriangle,
  Clock,
  Flame,
  Ban,
  TrendingDown,
  Activity,
  Calculator,
  Newspaper,
  Eye,
  Lock,
  Calendar,
  Rocket,
  Quote,
} from 'lucide-react';

import { IntelligentBackground } from '@/components/landing/IntelligentBackground';
import { FrostedOverlay } from '@/components/landing/FrostedOverlay';
import { TypewriterChatDemo } from '@/components/landing/TypewriterChatDemo';
import {
  ScrollProgressBar,
  StickySection,
  ScaleOnScroll,
  ScrollReveal,
  ParallaxSection,
} from '@/components/landing/StickySection';

// Feature grid - now with 8 items including Options
const FEATURES = [
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'AI Research Assistant',
    description: '30+ tools for instant stock analysis, news synthesis, and thesis validation.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Live Market Data',
    description: 'Real-time quotes, OHLCV charts, and technical indicators via Alpaca.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Emotional Firewall',
    description: 'Detects revenge trading, overtrading, and emotional patterns in real-time.',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Trade Journal',
    description: 'Rich text entries with screenshot capture and emotion tagging.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: 'Thesis Engine',
    description: 'Structured hypotheses with entry/exit targets and auto-validation scoring.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Prediction Markets',
    description: 'Kalshi + Polymarket integration for thesis validation with real probabilities.',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: <Calculator className="w-6 h-6" />,
    title: 'Options Builder',
    description: 'Multi-leg strategy construction with visual P&L and Greeks display.',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: <Newspaper className="w-6 h-6" />,
    title: 'News & Screener',
    description: 'Auto-refreshing news feed and stock screener with deep value filters.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
];

// Emotional Firewall patterns
const FIREWALL_PATTERNS = [
  {
    icon: <Flame className="w-5 h-5" />,
    name: 'Revenge Trading',
    description: 'Blocked when you trade within 30 min of a loss',
    cooldown: '60 min cooldown',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/30',
  },
  {
    icon: <Activity className="w-5 h-5" />,
    name: 'Overtrading',
    description: 'Triggered at 3+ trades/hour or 10+ trades/day',
    cooldown: '4 hour cooldown',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    borderColor: 'border-orange-500/30',
  },
  {
    icon: <TrendingDown className="w-5 h-5" />,
    name: 'Streak Blindness',
    description: 'Warns during 5+ consecutive wins or losses',
    cooldown: '3 hour cooldown',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/15',
    borderColor: 'border-yellow-500/30',
  },
];

// AI Models powering the chat
const AI_MODELS = [
  {
    name: 'Claude',
    company: 'Anthropic',
    description: 'Sonnet, Opus & Haiku',
    // Official Anthropic logo from Bootstrap Icons
    icon: (
      <svg viewBox="0 0 16 16" className="w-8 h-8" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M9.218 2h2.402L16 12.987h-2.402zM4.379 2h2.512l4.38 10.987H8.82l-.895-2.308h-4.58l-.896 2.307H0L4.38 2.001zm2.755 6.64L5.635 4.777 4.137 8.64z"
        />
      </svg>
    ),
    color: 'text-amber-400',
  },
  {
    name: 'Grok',
    company: 'xAI',
    description: 'Fast analysis',
    // X/xAI style
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: 'text-white',
  },
  {
    name: 'Perplexity',
    company: 'Perplexity AI',
    description: 'Real-time search',
    // Official Perplexity logo - angular P shape
    icon: (
      <svg viewBox="0 0 512 509.64" className="w-8 h-8">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M348.851 128.063l-68.946 58.302h68.946v-58.302zm-83.908 48.709l100.931-85.349v94.942h32.244v143.421h-38.731v90.004l-94.442-86.662v83.946h-17.023v-83.906l-96.596 86.246v-89.628h-37.445V186.365h38.732V90.768l95.309 84.958v-83.16h17.023l-.002 84.206zm-29.209 26.616c-34.955.02-69.893 0-104.83 0v109.375h20.415v-27.121l84.415-82.254zm41.445 0l82.208 82.324v27.051h21.708V203.388c-34.617 0-69.274.02-103.916 0zm-42.874-17.023l-64.669-57.646v57.646h64.669zm13.617 124.076v-95.2l-79.573 77.516v88.731l79.573-71.047zm17.252-95.022v94.863l77.19 70.83c0-29.485-.012-58.943-.012-88.425l-77.178-77.268z"
        />
      </svg>
    ),
    color: 'text-cyan-400',
  },
  {
    name: 'DeepSeek R1',
    company: 'via Perplexity',
    description: 'Advanced reasoning',
    // DeepSeek official whale logo
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
      </svg>
    ),
    color: 'text-blue-400',
  },
];

// Data sources powering the platform
const DATA_SOURCES = [
  {
    name: 'Alpaca',
    description: 'Market data & news',
    // Alpaca llama head logo - friendly llama silhouette
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M17.5 4c-.8 0-1.5.3-2 .8L14 6.5c-.5-.3-1-.5-1.5-.5-1.5 0-3 1-3.5 2.5L8.5 10c-1 .5-1.5 1.5-1.5 2.5v1.5c0 1 .5 2 1.5 2.5v3.5c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-3h2v3c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-3.5c1-.5 1.5-1.5 1.5-2.5v-1.5c0-.5-.1-1-.3-1.5l1.8-2.5c.3-.5.5-1 .5-1.5V5c0-.6-.4-1-1-1h-1zm-1 4c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z" />
      </svg>
    ),
    color: 'text-yellow-400',
  },
  {
    name: 'Kalshi',
    description: 'CFTC-regulated markets',
    // K logo style
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M6 4h3v7l6-7h4l-7 8 7 8h-4l-6-7v7H6z" />
      </svg>
    ),
    color: 'text-green-400',
  },
  {
    name: 'Polymarket',
    description: 'Prediction markets',
    // P with market chart
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M7 4h5c3 0 5 2 5 5s-2 5-5 5H9v6H7V4zm2 8h3c1.7 0 3-1.3 3-3s-1.3-3-3-3H9v6z" />
      </svg>
    ),
    color: 'text-purple-400',
  },
  {
    name: 'Supabase',
    description: 'Auth & database',
    // Supabase style
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M13.5 21.5c-.4.6-1.4.2-1.4-.5V14h8.4c.9 0 1.4 1 .8 1.7l-7.8 5.8zM10.5 2.5c.4-.6 1.4-.2 1.4.5V10H3.5c-.9 0-1.4-1-.8-1.7l7.8-5.8z" />
      </svg>
    ),
    color: 'text-emerald-400',
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
              <span className="text-xl font-semibold tracking-tight">deepstack</span>
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
                href="/app"
                className="px-4 py-2 text-sm bg-primary/90 text-primary-foreground hover:bg-primary rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(251,146,60,0.3)] hover:shadow-[0_0_25px_rgba(251,146,60,0.5)]"
              >
                Try Demo
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
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
              <span>Free AI Research Platform</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-[1.1]"
            >
              Research Smarter.
              <br />
              <span className="text-gradient-shimmer">Trade with Discipline.</span>
            </motion.h1>

            {/* Evocative tagline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-2xl md:text-3xl text-foreground/90 mb-4 font-medium"
            >
              Stop trading against yourself.
            </motion.p>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              AI that knows your thesis, detects emotional blind spots, and validates your ideas with prediction markets.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/app"
                className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all text-lg flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(251,146,60,0.4)] hover:shadow-[0_0_40px_rgba(251,146,60,0.6)]"
              >
                Try Demo Free
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 rounded-xl font-medium transition-all text-lg backdrop-blur-sm border border-border/50"
              >
                See How It Works
              </Link>
            </motion.div>

            {/* Trust Signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground/80"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary/70" />
                No signup required
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary/70" />
                Data stays private
              </span>
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary/70" />
                Powered by Claude
              </span>
            </motion.div>

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

        {/* ================================================================== */}
        {/* THE PROBLEM - CENTERED (fast flow - punchy stats) */}
        {/* ================================================================== */}
        <StickySection
          id="problem"
          title="80% of retail traders lose money."
          subtitle="Not because they're stupid. Because they're human."
          badge="The Hard Truth"
          badgeIcon={<AlertTriangle className="w-4 h-4" />}
          badgeColor="bg-red-500/10 text-red-400 border-red-500/20"
          titleAccent="text-red-400"
          scrollHeight="min-h-fit"
          align="center"
        >
          {/* Pain points - horizontal grid for centered layout */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              {
                icon: <Flame className="w-6 h-6" />,
                title: 'Revenge Trading',
                stat: '62%',
                description: 'of traders chase losses immediately after a bad trade',
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: 'Overtrading',
                stat: '3.5x',
                description: 'more trades than necessary due to FOMO and boredom',
              },
              {
                icon: <Eye className="w-6 h-6" />,
                title: 'Confirmation Bias',
                stat: '78%',
                description: 'ignore information that contradicts their thesis',
              },
            ].map((pain, i) => (
              <ScrollReveal key={pain.title} delay={i * 0.1} direction="up">
                <div className="p-5 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm text-center">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 mx-auto mb-3">
                    {pain.icon}
                  </div>
                  <p className="text-3xl font-bold text-red-400 mb-1">{pain.stat}</p>
                  <h3 className="font-semibold mb-2">{pain.title}</h3>
                  <p className="text-sm text-muted-foreground">{pain.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.4} className="mt-10 text-center max-w-2xl mx-auto">
            <p className="text-muted-foreground text-lg">
              The tools you use don&apos;t help. They give you more data, more charts, more noise.
              <span className="text-foreground font-medium block mt-2">What you need is discipline.</span>
            </p>
          </ScrollReveal>
        </StickySection>

        {/* ================================================================== */}
        {/* SEE IT IN ACTION - TypewriterChatDemo */}
        {/* ================================================================== */}
        <section className="py-24 px-4 relative">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Copy */}
              <ScrollReveal direction="left">
                <div className="space-y-6">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                    <MessageSquare className="w-4 h-4" />
                    See It In Action
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                    An AI that catches
                    <br />
                    <span className="text-gradient-shimmer">your blind spots</span>
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    deepstack doesn&apos;t just answer questions. It notices patterns in your behavior,
                    challenges emotional decisions, and validates ideas against prediction markets.
                  </p>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Detects revenge trading and FOMO patterns
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Cross-references with prediction market odds
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Suggests actions aligned with YOUR strategy
                    </li>
                  </ul>
                </div>
              </ScrollReveal>

              {/* Right - Demo */}
              <ScrollReveal direction="right" delay={0.2}>
                <TypewriterChatDemo />
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* EMOTIONAL FIREWALL - STICKY (slow down - unique differentiator) */}
        {/* ================================================================== */}
        <StickySection
          id="firewall"
          title="Your Psychological Guardrails"
          subtitle="The Emotional Firewall detects destructive trading patterns before they cost you money. It's like having a mentor who stops you from yourself."
          badge="Only in deepstack"
          badgeIcon={<Shield className="w-4 h-4" />}
          badgeColor="bg-orange-500/15 text-orange-400 border-orange-500/30"
          titleAccent="text-orange-400"
          scrollHeight="min-h-fit"
          className="bg-gradient-to-b from-orange-950/10 via-transparent to-transparent"
          align="right"
        >
          {/* Content stacks vertically - scrolls alongside sticky header */}
          <div className="space-y-6">
            {/* Pattern cards */}
            {FIREWALL_PATTERNS.map((pattern, i) => (
              <ScrollReveal key={pattern.name} delay={i * 0.1} direction="up">
                <div className={`p-4 rounded-xl ${pattern.bgColor} border ${pattern.borderColor} backdrop-blur-sm flex items-start gap-4`}>
                  <div className={`w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center ${pattern.color} shrink-0`}>
                    {pattern.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold">{pattern.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground shrink-0">
                        {pattern.cooldown}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}

            {/* Firewall mockup */}
            <ScaleOnScroll>
              <div className="rounded-2xl bg-card/60 border border-border/50 backdrop-blur-md p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Emotional Firewall</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-sm text-orange-400 font-medium">Warning</span>
                  </div>
                </div>

                {/* Status bars */}
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Revenge Trading Risk</span>
                      <span className="text-orange-400">High</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '75%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Trade Frequency</span>
                      <span className="text-yellow-400">Elevated</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '55%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Win Streak</span>
                      <span className="text-green-400">Normal</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '25%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.7 }}
                        className="h-full bg-green-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Alert */}
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <div className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-400">Trading Restricted</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You lost $450 on TSLA 12 minutes ago. Cooldown: 48 min remaining.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/30">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">3</p>
                    <p className="text-xs text-muted-foreground">Trades Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">-$450</p>
                    <p className="text-xs text-muted-foreground">Last Trade</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">2</p>
                    <p className="text-xs text-muted-foreground">Blocks Today</p>
                  </div>
                </div>
              </div>
            </ScaleOnScroll>
          </div>
        </StickySection>

        {/* Thesis Builder and Prediction Markets sections removed - consolidated into Full Toolkit below */}

        {/* ================================================================== */}
        {/* FEATURES GRID - Full Toolkit */}
        {/* ================================================================== */}
        <StickySection
          id="features"
          title="Everything You Need"
          subtitle="Eight integrated tools. One workspace. Zero context-switching."
          badge="Full Toolkit"
          badgeIcon={<Sparkles className="w-4 h-4" />}
          scrollHeight="min-h-fit"
          className="bg-card/20"
          align="center"
        >
          {/* Feature cards with parallax */}
          <ParallaxSection speed={30} direction="left" className="mt-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.slice(0, 4).map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  whileHover={{
                    y: -8,
                    scale: 1.02,
                    transition: { duration: 0.25, ease: 'easeOut' }
                  }}
                  className="relative bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-5 hover:border-primary/50 hover:bg-card/60 transition-all duration-300 group hover:shadow-[0_8px_30px_rgba(251,146,60,0.15)]"
                >
                  <motion.div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feature.bgColor}`}
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`${feature.color} group-hover:drop-shadow-[0_0_8px_currentColor] transition-all duration-300`}>
                      {feature.icon}
                    </div>
                  </motion.div>
                  <h3 className="text-base font-bold mb-2 group-hover:text-primary transition-colors duration-200">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed group-hover:text-muted-foreground/90 transition-colors duration-200">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </ParallaxSection>

          <ParallaxSection speed={30} direction="right" className="mt-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.slice(4, 8).map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  whileHover={{
                    y: -8,
                    scale: 1.02,
                    transition: { duration: 0.25, ease: 'easeOut' }
                  }}
                  className="relative bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-5 hover:border-primary/50 hover:bg-card/60 transition-all duration-300 group hover:shadow-[0_8px_30px_rgba(251,146,60,0.15)]"
                >
                  <motion.div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feature.bgColor}`}
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`${feature.color} group-hover:drop-shadow-[0_0_8px_currentColor] transition-all duration-300`}>
                      {feature.icon}
                    </div>
                  </motion.div>
                  <h3 className="text-base font-bold mb-2 group-hover:text-primary transition-colors duration-200">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed group-hover:text-muted-foreground/90 transition-colors duration-200">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </ParallaxSection>
        </StickySection>

        {/* ================================================================== */}
        {/* CREDIBILITY Section - Built With Transparency */}
        {/* ================================================================== */}
        <section id="credibility" className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Section header with launch badges */}
            <ScrollReveal className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  <Rocket className="w-3 h-3" />
                  Early Access
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/50 text-muted-foreground text-xs font-medium border border-border/30">
                  <Calendar className="w-3 h-3" />
                  Launched December 2024
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Built With Transparency</h2>
              <p className="text-muted-foreground">
                Full transparency on what powers deepstack. No black boxes.
              </p>
            </ScrollReveal>

            {/* AI Models Section */}
            <ScrollReveal className="text-center mb-6">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                AI Models
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {AI_MODELS.map((model, i) => (
                <ScrollReveal key={model.name} delay={i * 0.1}>
                  <div className="group p-5 rounded-xl bg-card/30 border border-border/30 text-center hover:border-primary/30 hover:bg-card/50 transition-all duration-300">
                    <div
                      className={`${model.color} mb-3 flex justify-center opacity-70 group-hover:opacity-100 transition-opacity`}
                    >
                      {model.icon}
                    </div>
                    <p className="font-semibold mb-0.5">{model.name}</p>
                    <p className="text-[10px] text-muted-foreground/70 mb-1">{model.company}</p>
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Data Sources Section */}
            <ScrollReveal className="text-center mb-10">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">
                Real-time data from
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {DATA_SOURCES.map((source, i) => (
                <ScrollReveal key={source.name} delay={i * 0.1}>
                  <div className="group p-5 rounded-xl bg-card/30 border border-border/30 text-center hover:border-primary/30 hover:bg-card/50 transition-all duration-300">
                    <div
                      className={`${source.color} mb-3 flex justify-center opacity-70 group-hover:opacity-100 transition-opacity`}
                    >
                      {source.icon}
                    </div>
                    <p className="font-semibold mb-1">{source.name}</p>
                    <p className="text-xs text-muted-foreground">{source.description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Trust badges */}
            <ScrollReveal delay={0.4}>
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Enterprise-grade security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>SOC 2 compliant data handling</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Sub-100ms API latency</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Founder Story */}
            <ScrollReveal delay={0.5}>
              <div className="mt-12 p-8 rounded-2xl bg-card/40 border border-primary/20 text-center max-w-2xl mx-auto">
                <Quote className="w-8 h-8 text-primary/40 mx-auto mb-4" />
                <p className="text-lg italic text-foreground/90 mb-4 leading-relaxed">
                  &quot;I built deepstack because I kept making the same emotional trading mistakes.
                  Revenge trades after losses, overtrading when bored, ignoring my own rules.
                  I needed something that would call me out before I sabotaged myself.&quot;
                </p>
                <p className="text-sm text-muted-foreground font-medium">— Eddie, Founder</p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ================================================================== */}
        {/* Final CTA Section */}
        {/* ================================================================== */}
        <section className="py-32 px-4 relative">
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-3xl mx-auto text-center relative">
            <ScrollReveal>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Ready to trade
                <br />
                <span className="text-gradient-shimmer">with discipline?</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <p className="text-muted-foreground text-xl mb-10">
                The only platform that protects you from yourself while making you smarter with every trade.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/app"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold transition-all text-xl group shadow-[0_0_30px_rgba(251,146,60,0.4)] hover:shadow-[0_0_50px_rgba(251,146,60,0.6)] hover:scale-105"
                >
                  Launch deepstack
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <p className="mt-6 text-sm text-muted-foreground">
                Free forever · Upgrade when you&apos;re ready
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-border/20 bg-background/60 backdrop-blur-md">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="font-semibold tracking-tight">deepstack</span>
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
              deepstack is a research platform powered by AI. It does not execute trades or provide
              personalized financial advice. All investing involves risk.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
