'use client';

import Link from 'next/link';
import { Keyboard, MessageSquare, BarChart3, Shield, BookOpen, Lightbulb, RotateCcw, TrendingUp, Bell } from 'lucide-react';
import { useTour } from '@/components/onboarding';
import { Button } from '@/components/ui/button';

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
    { keys: ['?'], description: 'Show shortcuts', category: 'Navigation' },
    { keys: ['Escape'], description: 'Close dialogs/panels', category: 'Navigation' },
];

const FEATURES = [
    {
        icon: MessageSquare,
        title: 'AI Research Assistant',
        description: 'Ask questions about stocks, get analysis, and receive research insights. The AI is aware of your thesis and journal for personalized guidance.',
    },
    {
        icon: BarChart3,
        title: 'Market Watch & Charts',
        description: 'Real-time market data, interactive charts with technical indicators. Expand the Market Watch panel for quick analysis.',
    },
    {
        icon: Lightbulb,
        title: 'Thesis Engine',
        description: 'Build investment hypotheses with entry/exit targets. Track validation over time and link to your research conversations.',
    },
    {
        icon: BookOpen,
        title: 'Trade Journal',
        description: 'Log trades with emotional tracking. Understanding your emotional patterns helps improve decision-making discipline.',
    },
    {
        icon: Shield,
        title: 'Emotional Firewall',
        description: 'Our discipline system helps you recognize emotional patterns that may affect investment decisions. The AI considers your emotional state.',
    },
    {
        icon: TrendingUp,
        title: 'Prediction Markets',
        description: 'View probability-weighted predictions from markets like Polymarket and Kalshi to inform your research.',
    },
];

const FAQ = [
    {
        question: 'Is DeepStack a brokerage?',
        answer: 'No. DeepStack is a research and analysis platform, not a brokerage. We help you research and track investment ideas, but do not execute trades or manage money.',
    },
    {
        question: 'How do I add symbols to my watchlist?',
        answer: 'Use Cmd/Ctrl+K to open the search, find your symbol, and click the star icon. Or ask the AI: "Add NVDA to my watchlist".',
    },
    {
        question: 'Where does the market data come from?',
        answer: 'We use Alpaca Markets for real-time and historical market data. News is also provided via Alpaca\'s news API.',
    },
    {
        question: 'Does the AI remember my thesis and journal?',
        answer: 'Yes! The AI has full semantic awareness of your active theses, journal entries, and emotional patterns. Ask "What are my active theses?" to see them.',
    },
    {
        question: 'How does the Emotional Firewall work?',
        answer: 'It monitors patterns in your journal entries and alerts you when emotional states (like fear, greed, or FOMO) might be influencing decisions. The AI will be extra cautious when your firewall is active.',
    },
    {
        question: 'Can I export my data?',
        answer: 'Yes! Go to Settings and use the "Export Data" button to download your theses and journal entries as JSON.',
    },
    {
        question: 'Is my data private?',
        answer: 'Yes. Your watchlists, journal entries, thesis documents, and conversations are private to your account. See our Privacy Policy for details.',
    },
    {
        question: 'What AI models are available?',
        answer: 'We support Claude (Sonnet, Opus, Haiku), GPT-4, and Groq Llama. You can switch models in Settings. Extended Thinking mode enables deeper reasoning for complex questions.',
    },
];

export default function HelpPage() {
    const { resetTour } = useTour();

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-4xl mx-auto py-12 px-4">
                <Link href="/" className="text-primary hover:underline text-sm mb-8 inline-block">
                    &larr; Back to DeepStack
                </Link>

                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-bold">Help & Getting Started</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={resetTour}
                        className="flex items-center gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Restart Tour
                    </Button>
                </div>
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
                                <h3 className="font-medium">Start researching</h3>
                                <p className="text-sm text-muted-foreground">Ask the AI questions like &quot;What&apos;s happening with NVDA today?&quot; or &quot;Analyze the semiconductor sector&quot;</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">2</div>
                            <div>
                                <h3 className="font-medium">Build your thesis</h3>
                                <p className="text-sm text-muted-foreground">Use the Thesis Engine to document investment hypotheses with targets and conditions</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">3</div>
                            <div>
                                <h3 className="font-medium">Track your journey</h3>
                                <p className="text-sm text-muted-foreground">Use the Journal to reflect on decisions, track emotions, and learn from your history</p>
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

                {/* AI Tips */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                        <Bell className="h-6 w-6" />
                        AI Assistant Tips
                    </h2>
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 space-y-3">
                        <div className="text-sm space-y-2">
                            <p><strong>Try these prompts:</strong></p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                                <li>&quot;Analyze AAPL and summarize the key risks&quot;</li>
                                <li>&quot;What are my active theses?&quot;</li>
                                <li>&quot;Review my recent journal entries - am I trading emotionally?&quot;</li>
                                <li>&quot;Show me prediction markets related to tech sector&quot;</li>
                                <li>&quot;Help me build a thesis for MSFT&quot;</li>
                            </ul>
                        </div>
                        <p className="text-xs text-muted-foreground border-t border-primary/20 pt-3">
                            The AI has access to your thesis, journal, and emotional state for personalized guidance.
                        </p>
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
