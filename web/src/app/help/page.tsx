import { Metadata } from 'next';
import Link from 'next/link';
import { Keyboard, MessageSquare, BarChart3, Shield, BookOpen, Lightbulb } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Help & Getting Started | DeepStack',
    description: 'Learn how to use DeepStack - keyboard shortcuts, features, and tips',
};

const KEYBOARD_SHORTCUTS = [
    { keys: ['Cmd/Ctrl', 'K'], description: 'Open symbol search', category: 'Navigation' },
    { keys: ['1'], description: '1 hour timeframe', category: 'Chart' },
    { keys: ['2'], description: '4 hour timeframe', category: 'Chart' },
    { keys: ['3'], description: '1 day timeframe', category: 'Chart' },
    { keys: ['4'], description: '1 week timeframe', category: 'Chart' },
    { keys: ['5'], description: '1 month timeframe', category: 'Chart' },
    { keys: ['c'], description: 'Candlestick chart', category: 'Chart' },
    { keys: ['l'], description: 'Line chart', category: 'Chart' },
    { keys: ['a'], description: 'Area chart', category: 'Chart' },
    { keys: ['Escape'], description: 'Close dialogs/panels', category: 'Navigation' },
];

const FEATURES = [
    {
        icon: MessageSquare,
        title: 'AI Chat Assistant',
        description: 'Ask questions about stocks, get analysis, and receive trading insights. Try: "Analyze AAPL" or "What are the best tech stocks today?"',
    },
    {
        icon: BarChart3,
        title: 'Market Data & Charts',
        description: 'Real-time quotes, interactive charts, and technical indicators. Click any symbol to view detailed charts.',
    },
    {
        icon: Shield,
        title: 'Emotional Firewall',
        description: 'Our unique discipline system helps prevent emotional trading decisions. Get warned before making risky trades.',
    },
    {
        icon: BookOpen,
        title: 'Trade Journal',
        description: 'Log your trades, track emotions, and learn from your history. Link entries to your trading thesis.',
    },
    {
        icon: Lightbulb,
        title: 'Thesis Engine',
        description: 'Document your investment thesis, track validation, and measure your accuracy over time.',
    },
];

const FAQ = [
    {
        question: 'Does DeepStack execute real trades?',
        answer: 'No. DeepStack is a research and analysis platform only. It provides paper trading simulations but does not connect to or execute trades through any brokerage.',
    },
    {
        question: 'How do I add symbols to my watchlist?',
        answer: 'Use Cmd/Ctrl+K to open the search, find your symbol, and click the star icon. Or ask the AI: "Add TSLA to my watchlist".',
    },
    {
        question: 'Where does the market data come from?',
        answer: 'We use Alpaca Markets for real-time and historical market data. Some data may be delayed by 15 minutes for free-tier users.',
    },
    {
        question: 'How does the Emotional Firewall work?',
        answer: 'It monitors your trading patterns and alerts you when it detects potentially emotional decisions, like trading during a losing streak or making oversized positions.',
    },
    {
        question: 'Can I export my trade journal?',
        answer: 'Yes, you can export your journal entries and thesis documents. This feature is available in the Journal and Thesis pages.',
    },
    {
        question: 'Is my data private?',
        answer: 'Yes. Your watchlists, journal entries, and thesis documents are private to your account. See our Privacy Policy for details.',
    },
];

export default function HelpPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-4xl mx-auto py-12 px-4">
                <Link href="/" className="text-primary hover:underline text-sm mb-8 inline-block">
                    &larr; Back to DeepStack
                </Link>

                <h1 className="text-3xl font-bold mb-2">Help & Getting Started</h1>
                <p className="text-muted-foreground mb-12">
                    Everything you need to know to get the most out of DeepStack.
                </p>

                {/* Quick Start */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
                    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">1</div>
                            <div>
                                <h3 className="font-medium">Start a conversation</h3>
                                <p className="text-sm text-muted-foreground">Type a question like &quot;What&apos;s happening with NVDA today?&quot; or &quot;Analyze the tech sector&quot;</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">2</div>
                            <div>
                                <h3 className="font-medium">Build your watchlist</h3>
                                <p className="text-sm text-muted-foreground">Press Cmd/Ctrl+K to search for symbols and add them to your watchlist</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">3</div>
                            <div>
                                <h3 className="font-medium">Track your trades</h3>
                                <p className="text-sm text-muted-foreground">Use the Journal to log trades and the Thesis Engine to document your investment ideas</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Features</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {FEATURES.map((feature) => (
                            <div key={feature.title} className="bg-card border border-border rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <feature.icon className="h-5 w-5 text-primary" />
                                    <h3 className="font-medium">{feature.title}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Keyboard Shortcuts */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                        <Keyboard className="h-6 w-6" />
                        Keyboard Shortcuts
                    </h2>
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-3 text-sm font-medium">Shortcut</th>
                                    <th className="text-left p-3 text-sm font-medium">Action</th>
                                    <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Category</th>
                                </tr>
                            </thead>
                            <tbody>
                                {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                                    <tr key={i} className="border-t border-border">
                                        <td className="p-3">
                                            <div className="flex gap-1">
                                                {shortcut.keys.map((key, j) => (
                                                    <span key={j}>
                                                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{key}</kbd>
                                                        {j < shortcut.keys.length - 1 && <span className="mx-1 text-muted-foreground">+</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm">{shortcut.description}</td>
                                        <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{shortcut.category}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* FAQ */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {FAQ.map((item, i) => (
                            <details key={i} className="bg-card border border-border rounded-lg group">
                                <summary className="p-4 cursor-pointer font-medium list-none flex justify-between items-center">
                                    {item.question}
                                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                                        &darr;
                                    </span>
                                </summary>
                                <div className="px-4 pb-4 text-sm text-muted-foreground">
                                    {item.answer}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>

                {/* Footer Links */}
                <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm">
                    <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    <a href="mailto:support@deepstack.app" className="text-primary hover:underline">Contact Support</a>
                </div>
            </div>
        </div>
    );
}
