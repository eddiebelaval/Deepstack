'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Shield, Target, ArrowRight, PieChart } from 'lucide-react';

type HedgedPosition = {
    symbol: string;
    total_shares: number;
    entry_price: number;
    current_value: number;
    total_pnl: number;
    conviction: {
        shares: number;
        value: number;
        pnl: number;
    };
    tactical: {
        shares: number;
        value: number;
        pnl: number;
        shares_sold: number;
    };
    next_target: number;
};

export function HedgedPositionsPanel() {
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState(100);
    const [price, setPrice] = useState(150.00);
    const [convictionPct, setConvictionPct] = useState([60]);
    const [createdPosition, setCreatedPosition] = useState<HedgedPosition | null>(null);

    const handleCreate = async () => {
        try {
            const res = await fetch('http://localhost:8000/positions/hedged/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol.toUpperCase(),
                    entry_price: price,
                    total_shares: shares,
                    conviction_pct: convictionPct[0] / 100,
                    tactical_pct: (100 - convictionPct[0]) / 100
                })
            });

            if (!res.ok) throw new Error('Failed to create position');
            const data = await res.json();
            setCreatedPosition(data);
        } catch (error) {
            console.error("Failed to create position:", error);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        Hedged Position Manager
                        <Badge variant="outline" className="text-xs font-normal">
                            Conviction + Tactical
                        </Badge>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Split positions into &quot;Moon Bag&quot; (Conviction) and &quot;Income Generator&quot; (Tactical).
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">New Position</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Symbol</Label>
                            <Input
                                placeholder="e.g. GME"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Shares</Label>
                            <Input
                                type="number"
                                value={shares}
                                onChange={(e) => setShares(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Entry Price</Label>
                            <Input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-blue-500">Conviction {convictionPct}%</span>
                                <span className="font-medium text-orange-500">Tactical {100 - convictionPct[0]}%</span>
                            </div>
                            <Slider
                                value={convictionPct}
                                onValueChange={setConvictionPct}
                                min={10}
                                max={90}
                                step={5}
                                className="py-2"
                            />
                            <p className="text-xs text-muted-foreground">
                                <strong>Conviction:</strong> Held for long-term thesis.<br />
                                <strong>Tactical:</strong> Scaled out at 2x, 3x, 5x.
                            </p>
                        </div>

                        <Button className="w-full mt-2" onClick={handleCreate} disabled={!symbol}>
                            Create Strategy
                        </Button>
                    </CardContent>
                </Card>

                {/* Visualization / Result Panel */}
                <div className="lg:col-span-2 space-y-4">
                    {createdPosition ? (
                        <Card className="bg-muted/20 border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2">
                                        {createdPosition.symbol} Strategy
                                        <Badge variant="outline">Active</Badge>
                                    </CardTitle>
                                    <div className="text-sm text-muted-foreground">
                                        Total Value: <span className="font-mono text-foreground">${createdPosition.current_value.toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Visual Split */}
                                <div className="flex h-4 w-full rounded-full overflow-hidden">
                                    <div
                                        className="bg-blue-500 h-full transition-all duration-500"
                                        style={{ width: `${(createdPosition.conviction.shares / createdPosition.total_shares) * 100}%` }}
                                    />
                                    <div
                                        className="bg-orange-500 h-full transition-all duration-500"
                                        style={{ width: `${(createdPosition.tactical.shares / createdPosition.total_shares) * 100}%` }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                        <div className="flex items-center gap-2 mb-2 text-blue-500 font-semibold">
                                            <Shield className="h-4 w-4" />
                                            Conviction Pod
                                        </div>
                                        <div className="text-2xl font-bold">{createdPosition.conviction.shares} shares</div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Hold until thesis break or moon.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                                        <div className="flex items-center gap-2 mb-2 text-orange-500 font-semibold">
                                            <Target className="h-4 w-4" />
                                            Tactical Pod
                                        </div>
                                        <div className="text-2xl font-bold">{createdPosition.tactical.shares} shares</div>
                                        <div className="mt-2 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span>Next Target (2x):</span>
                                                <span className="font-mono">${createdPosition.next_target.toFixed(2)}</span>
                                            </div>
                                            <div className="w-full bg-background/50 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-orange-500 h-full w-[10%]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-background p-4 rounded-lg border">
                                    <h4 className="font-medium mb-3 text-sm">Tactical Scaling Plan</h4>
                                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                                        <div className="space-y-1">
                                            <div className="text-muted-foreground text-xs">Target 1</div>
                                            <div className="font-bold">2.0x</div>
                                            <div className="text-xs text-green-500">Sell 25%</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-muted-foreground text-xs">Target 2</div>
                                            <div className="font-bold">3.5x</div>
                                            <div className="text-xs text-green-500">Sell 25%</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-muted-foreground text-xs">Target 3</div>
                                            <div className="font-bold">6.0x</div>
                                            <div className="text-xs text-green-500">Sell 25%</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-muted-foreground text-xs">Target 4</div>
                                            <div className="font-bold">10.0x</div>
                                            <div className="text-xs text-green-500">Sell 25%</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/50 text-muted-foreground">
                            <div className="text-center">
                                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Configure a position to see the strategy breakdown</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
