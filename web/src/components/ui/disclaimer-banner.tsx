'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

export function DisclaimerBanner() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-950/90 text-amber-100 border-t border-amber-800/50 backdrop-blur-md px-4 py-3 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
                <div className="text-xs md:text-sm space-y-1">
                    <p className="font-bold uppercase tracking-wider text-amber-200">
                        Disclaimer: Research Only. Not Financial Advice.
                    </p>
                    <p className="opacity-90 leading-relaxed text-xs">
                        DeepStack is a financial research and analysis platform providing data and AI-driven insights for informational purposes only.
                        <strong> This platform does NOT execute trades on your behalf.</strong> Trading in financial markets involves significant risk.
                        You should consult a qualified financial advisor before making any investment decisions.
                    </p>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-amber-300 hover:text-amber-100 transition-colors p-1"
                    aria-label="Dismiss disclaimer"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
