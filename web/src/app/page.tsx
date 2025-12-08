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
                            <Brain className="w-7 h-7 text-primary animate-pulse-soft" />
                            <span className="text-xl font-semibold tracking-tight">DeepStack</span>
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
                <section className="pt-40 pb-32 px-4 relative">
                    <div className="max-w-5xl mx-auto text-center transform transition-all duration-700 hover:scale-[1.01]">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20 backdrop-blur-sm animate-float">
                            <Zap className="w-4 h-4" />
                            <span>Research Platform - Not a Broker</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-[1.1]">
                            The Intelligence
                            <br />
                            <span className="text-gradient-shimmer">Beneath the Market</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
                            DeepStack lurks in the data, using AI to map market patterns and enforce emotional discipline.
                            <br />
                            <span className="text-foreground/80 text-lg mt-2 block">See what others miss.</span>
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link
                                href="/app"
                                className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all text-lg flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(251,146,60,0.4)] hover:shadow-[0_0_40px_rgba(251,146,60,0.6)]"
                            >
                                Start Researching
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/help"
                                className="w-full sm:w-auto px-8 py-4 bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 rounded-xl font-medium transition-all text-lg backdrop-blur-sm border border-border/50"
                            >
                                How It Works
                            </Link>
                        </div>

                        {/* Trust Signal */}
                        <p className="mt-8 text-sm text-muted-foreground/80 font-medium">
                            No credit card required · Demo mode available
                        </p>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-12 border-y border-border/30 bg-background/40 backdrop-blur-sm">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {STATS.map((stat) => (
                                <div key={stat.label} className="text-center group cursor-default">
                                    <div className="text-4xl md:text-5xl font-bold text-primary mb-2 group-hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.5)] transition-all ease-out duration-300 transform group-hover:scale-110">{stat.value}</div>
                                    <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                                </div>
                            ))}
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
                                <Brain className="w-5 h-5 text-primary" />
                                <span className="font-semibold tracking-tight">DeepStack</span>
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
