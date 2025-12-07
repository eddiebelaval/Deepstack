'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Lock, Zap, Sparkles } from 'lucide-react';

export function PaywallModal() {
    const { paywallOpen, setPaywallOpen, setCredits } = useUIStore();

    useEffect(() => {
        const handlePaywallEvent = () => setPaywallOpen(true);
        const handleCreditEvent = (e: CustomEvent<number>) => setCredits(e.detail);

        if (typeof window !== 'undefined') {
            window.addEventListener('deepstack-paywall', handlePaywallEvent);
            // @ts-ignore - CustomEvent detail typing
            window.addEventListener('deepstack-credits', handleCreditEvent);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('deepstack-paywall', handlePaywallEvent);
                // @ts-ignore
                window.removeEventListener('deepstack-credits', handleCreditEvent);
            }
        };
    }, [setPaywallOpen, setCredits]);

    return (
        <AnimatePresence>
            {paywallOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
                        onClick={() => setPaywallOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md p-6 bg-card border border-border shadow-2xl rounded-xl"
                    >
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Lock className="h-8 w-8 text-primary" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight">Unlock Professional Research</h2>
                                <p className="text-muted-foreground">
                                    You've reached the limit of the Free Research Tier. Upgrade to Pro for:
                                </p>
                            </div>

                            <div className="w-full space-y-3 bg-secondary/30 p-4 rounded-lg">
                                <div className="flex items-center space-x-3 text-sm">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    <span>Unlimited AI Audit & Reasoning</span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    <span>Real-time Market Data (vs 15m delayed)</span>
                                </div>
                            </div>

                            <div className="w-full space-y-3">
                                <Button className="w-full text-lg py-6 font-semibold" onClick={() => window.open('https://deepstack.trade/pricing', '_blank')}>
                                    Upgrade to Pro
                                </Button>
                                <Button variant="ghost" className="w-full" onClick={() => setPaywallOpen(false)}>
                                    Maybe Later
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
