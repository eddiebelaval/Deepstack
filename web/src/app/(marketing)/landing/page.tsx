import { Metadata } from 'next';
import Link from 'next/link';
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

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="w-7 h-7 text-primary" />
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
                            href="/"
                            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors"
                        >
                            Try Demo
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
                        <Zap className="w-4 h-4" />
                        <span>Research Platform - Not a Broker</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                        Trade Smarter with
                        <span className="text-primary"> AI-Powered</span>
                        <br />
                        Discipline
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                        DeepStack combines AI analysis with emotional discipline frameworks
                        to help you make better research decisions. Paper trade, journal, and
                        build conviction before risking real capital.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/"
                            className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all text-lg flex items-center justify-center gap-2 group"
                        >
                            Start Demo
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/help"
                            className="w-full sm:w-auto px-8 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl font-medium transition-all text-lg"
                        >
                            Learn More
                        </Link>
                    </div>

                    {/* Trust Signal */}
                    <p className="mt-6 text-sm text-muted-foreground">
                        No credit card required. No real trades executed.
                    </p>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 border-y border-border/50 bg-muted/20">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {STATS.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                                <div className="text-sm text-muted-foreground">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Research</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Powerful tools to analyze markets, track your thoughts, and maintain trading discipline.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature) => (
                            <div
                                key={feature.title}
                                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group"
                            >
                                <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                </div>
                                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Keyboard Shortcuts Highlight */}
            <section className="py-20 px-4 bg-muted/20 border-y border-border/50">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-primary mb-4">
                                <Keyboard className="w-5 h-5" />
                                <span className="font-medium">Power User Mode</span>
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Built for Speed</h2>
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                Navigate charts, switch timeframes, and search symbols without
                                leaving the keyboard. Every action has a shortcut.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <kbd className="px-3 py-1.5 bg-background border border-border rounded text-sm font-mono">Cmd+K</kbd>
                                <span className="text-muted-foreground text-sm self-center">Search</span>
                                <kbd className="px-3 py-1.5 bg-background border border-border rounded text-sm font-mono">1-5</kbd>
                                <span className="text-muted-foreground text-sm self-center">Timeframes</span>
                                <kbd className="px-3 py-1.5 bg-background border border-border rounded text-sm font-mono">c/l/a</kbd>
                                <span className="text-muted-foreground text-sm self-center">Chart types</span>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            {['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'TSLA'].map((symbol) => (
                                <div
                                    key={symbol}
                                    className="bg-card border border-border rounded-lg p-4 text-center"
                                >
                                    <div className="font-mono font-bold text-lg">{symbol}</div>
                                    <div className="text-xs text-muted-foreground">Sample</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Ready to Trade with Discipline?
                    </h2>
                    <p className="text-muted-foreground text-lg mb-8">
                        Start researching with AI-powered analysis. No account required for demo mode.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all text-lg group"
                    >
                        Launch DeepStack
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 border-t border-border">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            <span className="font-semibold">DeepStack</span>
                            <span className="text-muted-foreground text-sm">Research Platform</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                            <Link href="/help" className="text-muted-foreground hover:text-foreground transition-colors">
                                Help
                            </Link>
                            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                                Terms
                            </Link>
                            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                                Privacy
                            </Link>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-xs text-muted-foreground">
                        DeepStack is a research platform. It does not execute real trades or provide financial advice.
                    </div>
                </div>
            </footer>
        </div>
    );
}
