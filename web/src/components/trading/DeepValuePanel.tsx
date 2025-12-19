'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Badge } from '@/components/ui/badge';
import { Play, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatTip } from '@/components/ui/chat-tip';

type ValueOpportunity = {
    symbol: string;
    value_score: number;
    metrics: {
        pe_ratio: number;
        pb_ratio: number;
        ev_ebitda: number;
        fcf_yield: number;
        debt_to_equity: number;
        current_ratio: number;
        roe: number;
    };
    thesis: string[];
    risks: string[];
    conviction: string;
    target_price: number;
};

export function DeepValuePanel() {
    const [opportunities, setOpportunities] = useState<ValueOpportunity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasRun, setHasRun] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const runScreen = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:8000/strategies/deep-value/screen');
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();

            setOpportunities(data);
            setHasRun(true);
        } catch (error) {
            console.error("Failed to run screen:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 max-w-5xl mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        Deep Value Screener
                        <Badge variant="outline" className="text-xs font-normal">
                            Icahn / Buffett Style
                        </Badge>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Find asymmetric opportunities trading significantly below intrinsic value.
                    </p>
                    <ChatTip
                        example="Find undervalued stocks with strong cash flow"
                        moreExamples={['Analyze INTC fundamentals', 'What stocks are trading below book value?']}
                        className="mt-1"
                    />
                </div>
                <Button
                    onClick={runScreen}
                    disabled={isLoading}
                    size="lg"
                    className="gap-2"
                >
                    <Play className="h-4 w-4" />
                    {isLoading ? "Screening..." : "Run Screen"}
                </Button>
            </div>

            {!hasRun && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-card/50">
                    <Info className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Ready to Scan</p>
                    <p className="text-sm max-w-md text-center mt-2">
                        The screener will look for stocks with P/B &lt; 1.0, P/E &lt; 10, High FCF Yield, and Strong Balance Sheets.
                    </p>
                </div>
            )}

            {hasRun && (
                <div className="flex-1 relative overflow-hidden -mx-4">
                    <ScrollArea className="h-full px-4" viewportRef={scrollRef} hideScrollbar>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                        {opportunities.map((opp) => (
                            <Card key={opp.symbol} className="overflow-hidden border-l-4 border-l-primary">
                                <CardHeader className="pb-2 bg-muted/30">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                {opp.symbol}
                                                <Badge
                                                    variant={opp.conviction === 'HIGH' ? 'default' : 'secondary'}
                                                    className={cn(
                                                        opp.conviction === 'HIGH' && "bg-green-600 hover:bg-green-700"
                                                    )}
                                                >
                                                    {opp.conviction} CONVICTION
                                                </Badge>
                                            </CardTitle>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                Score: <span className="font-bold text-foreground">{opp.value_score}/100</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-muted-foreground">Target</div>
                                            <div className="text-lg font-bold text-green-500">
                                                ${opp.target_price.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div className="p-2 bg-background rounded border">
                                            <div className="text-muted-foreground text-xs">P/B Ratio</div>
                                            <div className="font-mono font-medium">{opp.metrics.pb_ratio.toFixed(2)}</div>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <div className="text-muted-foreground text-xs">P/E Ratio</div>
                                            <div className="font-mono font-medium">{opp.metrics.pe_ratio.toFixed(1)}</div>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <div className="text-muted-foreground text-xs">FCF Yield</div>
                                            <div className="font-mono font-medium">{(opp.metrics.fcf_yield * 100).toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                                            Investment Thesis
                                        </h4>
                                        <ul className="text-sm space-y-1 text-muted-foreground">
                                            {opp.thesis.map((point, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="mt-1.5 h-1 w-1 rounded-full bg-green-500 shrink-0" />
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {opp.risks.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-amber-500">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                Risks
                                            </h4>
                                            <ul className="text-sm space-y-1 text-muted-foreground">
                                                {opp.risks.map((point, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    </ScrollArea>
                    <DotScrollIndicator
                        scrollRef={scrollRef}
                        maxDots={5}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        minHeightGrowth={0}
                    />
                </div>
            )}
        </div>
    );
}
