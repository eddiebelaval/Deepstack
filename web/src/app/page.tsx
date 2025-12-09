import { Metadata } from 'next';
import {
    MessageSquare,
    TrendingUp,
    Shield,
    BookOpen,
    Lightbulb,
    Keyboard,
    ChevronRight,
    Zap,
    BarChart3,
    Brain,
} from 'lucide-react';
import Link from 'next/link';
import NextImage from "next/image";
import { IntelligentBackground } from '@/components/landing/IntelligentBackground';
import { FrostedOverlay } from '@/components/landing/FrostedOverlay';

export const metadata: Metadata = {
    title: 'DeepStack - AI-Powered Trading Assistant',
    description: 'Trade smarter with AI-powered analysis, emotional discipline frameworks, and real-time market insights. Research and paper trade with confidence.',
    keywords: ['trading', 'AI', 'stock analysis', 'emotional trading', 'paper trading', 'market research', 'investment thesis'],
    openGraph: {
        title: 'DeepStack - AI-Powered Trading Assistant',
        description: 'Trade smarter with AI-powered analysis, emotional discipline frameworks, and real-time market insights.',
        type: 'website',
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'DeepStack - AI-Powered Trading Assistant',
        description: 'Trade smarter with AI-powered analysis and emotional discipline frameworks.',
    },
};

const FEATURES = [
    {
        icon: MessageSquare,
        title: 'AI Chat Assistant',
        description: 'Ask questions about stocks, get instant analysis, and receive trading insights powered by Claude AI.',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
    },
    {
        icon: TrendingUp,
        title: 'Real-Time Market Data',
        description: 'View live quotes, interactive charts, and technical indicators for thousands of stocks and ETFs.',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
    },
    {
        icon: Shield,
        title: 'Emotional Firewall',
        description: 'Our unique discipline system warns you before making potentially emotional trading decisions.',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
    },
    {
        icon: BookOpen,
        title: 'Trade Journal',
        description: 'Log trades with emotional state tracking, review your history, and identify patterns in your behavior.',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
    },
    {
        icon: Lightbulb,
        title: 'Thesis Engine',
        description: 'Document investment theses, track validation over time, and measure your analytical accuracy.',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
    },
    {
        icon: BarChart3,
        title: 'Options Analysis',
        description: 'Screen options chains, visualize payoff diagrams, and analyze strategy risk/reward profiles.',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
    },
];

const STATS = [
    { value: '20+', label: 'AI Research Tools' },
    { value: '10+', label: 'Emotion Categories' },
    { value: '∞', label: 'Symbols Supported' },
    { value: '0', label: 'Real Trades Executed' },
];

export default function Home() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Layer - Fixed position for parallax effect */}
            <div className="fixed inset-0 z-0">
                <IntelligentBackground />
            </div>

            {/* Frosted Glass Overlay - Sits on top of background */}
            <FrostedOverlay intensity="medium" className="fixed inset-0 z-10" />

            {/* Content Layer - Scrolls naturally */}
            <div className="relative z-20">
                {/* Navigation */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-md border-b border-border/20 supports-[backdrop-filter]:bg-background/20">
                    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="relative h-10 w-40">
                                <NextImage
                                    src="/logo-full.png"
                                    alt="DeepStack"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
                                Help
                            </Link>
                            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
                <section className="pt-40 pb-32 px-4 relative perspective-[2000px]">
                    <div className="max-w-5xl mx-auto text-center transform transition-all duration-700 hover:scale-[1.01]">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20 backdrop-blur-sm animate-float">
                            <Zap className="w-4 h-4" />
                            <span>Research Platform - Not a Broker</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-[1.1]">
                            Navigate the Market with
                            <br />
                            <span className="text-gradient-shimmer">Neural Precision</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
                            Uncover hidden market patterns and master your psychology. DeepStack is the AI-powered research platform that helps you trade with discipline, not emotion.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
                            <Link
                                href="/app"
                                className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all text-lg flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(251,146,60,0.4)] hover:shadow-[0_0_40px_rgba(251,146,60,0.6)]"
                            >
                                Start Free Analysis
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/help"
                                className="w-full sm:w-auto px-8 py-4 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-medium transition-all text-lg backdrop-blur-sm border border-primary/20"
                            >
                                How It Works
                            </Link>
                        </div>

                        {/* Trust Signal */}
                        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground/60 mb-20">
                            <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> Privacy Focused</span>
                            <span>•</span>
                            <span>No Brokerage Usage</span>
                            <span>•</span>
                            <span>Risk-Free Paper Trading</span>
                        </div>

                        {/* Product Reveal - Tilted 3D Card */}
                        <div className="relative mx-auto max-w-4xl transform rotate-x-12 hover:rotate-x-0 transition-transform duration-1000 ease-out group">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl -z-10 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-1000" />
                            <div className="bg-card/95 border border-border/50 rounded-xl backdrop-blur-md shadow-2xl overflow-hidden aspect-video relative flex flex-col">
                                {/* Mock App Header */}
                                <div className="h-8 border-b border-border/50 bg-muted/20 flex items-center px-4 gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                    </div>
                                    <div className="ml-4 h-4 w-32 bg-primary/10 rounded-full" />
                                </div>

                                {/* Mock App Body */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Mock Sidebar */}
                                    <div className="w-12 border-r border-border/50 bg-muted/10 flex flex-col items-center py-4 gap-4">
                                        <div className="w-6 h-6 rounded-md bg-primary/20" />
                                        <div className="w-6 h-6 rounded-md bg-muted/40" />
                                        <div className="w-6 h-6 rounded-md bg-muted/40" />
                                        <div className="w-6 h-6 rounded-md bg-muted/40" />
                                    </div>

                                    {/* Mock Main Content */}
                                    <div className="flex-1 flex">
                                        {/* Chat Area */}
                                        <div className="w-1/3 border-r border-border/50 p-4 flex flex-col gap-3">
                                            <div className="flex gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0" />
                                                <div className="flex-1 flex flex-col gap-1.5">
                                                    <div className="h-2 w-3/4 bg-muted/40 rounded-full" />
                                                    <div className="h-2 w-1/2 bg-muted/40 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-row-reverse">
                                                <div className="w-6 h-6 rounded-full bg-muted/30 flex-shrink-0" />
                                                <div className="bg-primary/10 rounded-lg p-2 rounded-tr-none">
                                                    <div className="h-2 w-24 bg-primary/20 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-auto">
                                                <div className="h-8 w-full bg-muted/20 rounded-lg border border-border/50" />
                                            </div>
                                        </div>

                                        {/* Chart Area */}
                                        <div className="flex-1 bg-background/50 p-4 relative">
                                            {/* Chart UI overlay */}
                                            <div className="absolute top-4 left-4 right-4 flex justify-between">
                                                <div className="flex gap-2">
                                                    <div className="h-6 w-16 bg-muted/30 rounded" />
                                                    <div className="h-6 w-10 bg-muted/30 rounded" />
                                                </div>
                                                <div className="h-6 w-20 bg-green-500/20 rounded" />
                                            </div>

                                            {/* Mock Chart Lines */}
                                            <div className="absolute inset-0 top-12 bottom-8 left-4 right-4">
                                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                                    {/* Grid */}
                                                    <line x1="0" y1="20%" x2="100%" y2="20%" stroke="currentColor" strokeOpacity="0.1" />
                                                    <line x1="0" y1="40%" x2="100%" y2="40%" stroke="currentColor" strokeOpacity="0.1" />
                                                    <line x1="0" y1="60%" x2="100%" y2="60%" stroke="currentColor" strokeOpacity="0.1" />
                                                    <line x1="0" y1="80%" x2="100%" y2="80%" stroke="currentColor" strokeOpacity="0.1" />

                                                    {/* Candle-ish path */}
                                                    <path
                                                        d="M0,80 Q20,70 40,75 T80,60 T120,50 T160,55 T200,40 T240,45 T280,30 T320,35 T360,20"
                                                        fill="none"
                                                        stroke="var(--primary)"
                                                        strokeWidth="2"
                                                        className="drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]"
                                                    />
                                                    {/* Area fill */}
                                                    <path
                                                        d="M0,80 Q20,70 40,75 T80,60 T120,50 T160,55 T200,40 T240,45 T280,30 T320,35 T360,20 V100 H0 Z"
                                                        fill="url(#gradient)"
                                                        opacity="0.2"
                                                    />
                                                    <defs>
                                                        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                                            <stop offset="0%" stopColor="var(--primary)" />
                                                            <stop offset="100%" stopColor="transparent" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Overlay Gradient/Glare */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-12 border-y border-border/30 bg-background/40 backdrop-blur-sm relative z-30">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="text-center group cursor-default">
                                <div className="text-4xl md:text-5xl font-bold text-primary mb-2 group-hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.5)] transition-all ease-out duration-300 transform group-hover:scale-110">20+</div>
                                <div className="text-sm text-muted-foreground font-medium">AI Research Tools</div>
                            </div>
                            <div className="text-center group cursor-default">
                                <div className="text-4xl md:text-5xl font-bold text-primary mb-2 group-hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.5)] transition-all ease-out duration-300 transform group-hover:scale-110">10+</div>
                                <div className="text-sm text-muted-foreground font-medium">Emotion Categories</div>
                            </div>
                            <div className="text-center group cursor-default">
                                <div className="text-4xl md:text-5xl font-bold text-primary mb-2 group-hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.5)] transition-all ease-out duration-300 transform group-hover:scale-110">∞</div>
                                <div className="text-sm text-muted-foreground font-medium">Symbols Supported</div>
                            </div>
                            <div className="text-center group cursor-default">
                                <div className="text-4xl md:text-5xl font-bold text-primary mb-2 group-hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.5)] transition-all ease-out duration-300 transform group-hover:scale-110">100%</div>
                                <div className="text-sm text-muted-foreground font-medium">Risk-Free Practice</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-32 px-4 relative">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for the Modern Trader</h2>
                            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
                                Powerful tools that help you master your psychology and validate your ideas.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {FEATURES.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-8 hover:border-primary/50 hover:bg-card/60 transition-all duration-300 group shadow-lg hover:shadow-xl"
                                >
                                    <div className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Keyboard Shortcuts Highlight */}
                <section className="py-24 px-4 bg-muted/30 border-y border-border/30 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse-soft pointer-events-none" />
                    <div className="max-w-5xl mx-auto relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-16">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 text-primary mb-6">
                                    <Keyboard className="w-6 h-6 animate-bounce" />
                                    <span className="font-bold tracking-wide uppercase text-sm">Power User Mode</span>
                                </div>
                                <h2 className="text-4xl font-bold mb-6 text-gradient-shimmer">Built for Speed</h2>
                                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                                    Navigate charts, switch timeframes, and search symbols without
                                    leaving the keyboard. Every action has a shortcut.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-3 bg-background/50 border border-border/50 px-4 py-2 rounded-lg">
                                        <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm font-mono font-bold">Cmd+K</kbd>
                                        <span className="text-sm font-medium">Search</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-background/50 border border-border/50 px-4 py-2 rounded-lg">
                                        <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm font-mono font-bold">1-5</kbd>
                                        <span className="text-sm font-medium">Timeframes</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 perspective-[1000px]">
                                {['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'TSLA'].map((symbol, i) => (
                                    <div
                                        key={symbol}
                                        className="bg-card/70 border border-border/50 rounded-xl p-6 text-center shadow-lg hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 hover:rotate-1"
                                        style={{ animationDelay: `${i * 100}ms` }}
                                    >
                                        <div className="font-mono font-bold text-xl mb-1">{symbol}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-widest">Ticker</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-32 px-4 relative">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Ready to See the Invisible?
                        </h2>
                        <p className="text-muted-foreground text-xl mb-10">
                            Join thousands of traders using DeepStack&apos;s neural intelligence to uncover hidden market opportunities.
                        </p>
                        <Link
                            href="/app"
                            className="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold transition-all text-xl group shadow-[0_0_30px_rgba(251,146,60,0.4)] hover:shadow-[0_0_50px_rgba(251,146,60,0.6)] hover:scale-105"
                        >
                            Launch DeepStack
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 px-4 border-t border-border/20 bg-background/60 backdrop-blur-md">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <div className="relative h-8 w-32">
                                    <NextImage
                                        src="/logo-full.png"
                                        alt="DeepStack"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <span className="text-muted-foreground text-sm ml-2 px-2 py-0.5 bg-muted rounded-full">Research Platform</span>
                            </div>
                            <div className="flex items-center gap-8 text-sm font-medium">
                                <Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">
                                    Help Center
                                </Link>
                                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                                    Terms
                                </Link>
                                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                                    Privacy
                                </Link>
                            </div>
                        </div>
                        <div className="mt-8 text-center text-xs text-muted-foreground/60 max-w-2xl mx-auto leading-relaxed">
                            DeepStack is a research and paper-trading platform powered by AI. It does not execute real money trades or provide personalized financial advice.
                            All trading involves risk.
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
