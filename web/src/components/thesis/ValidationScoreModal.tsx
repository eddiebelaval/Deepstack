'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { getScoreColor, getScoreLabel } from '@/lib/thesis-validation';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface ValidationScoreModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentScore: number;
    autoCalculatedScore: number;
    currentNotes?: string;
    onSave: (score: number, notes: string) => void;
}

export function ValidationScoreModal({
    open,
    onOpenChange,
    currentScore,
    autoCalculatedScore,
    currentNotes = '',
    onSave,
}: ValidationScoreModalProps) {
    const [manualScore, setManualScore] = useState(currentScore);
    const [notes, setNotes] = useState(currentNotes);

    const scoreColor = getScoreColor(manualScore);
    const scoreLabel = getScoreLabel(manualScore);

    const handleSave = () => {
        onSave(manualScore, notes);
        onOpenChange(false);
    };

    const handleUseAutoScore = () => {
        setManualScore(autoCalculatedScore);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Update Validation Score</DialogTitle>
                    <DialogDescription>
                        Manually adjust the thesis validation score and add notes about your assessment.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Auto-calculated score info */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <div className="text-sm font-medium">Auto-calculated Score</div>
                            <div className="text-xs text-muted-foreground">
                                Based on conditions, price movement, time, and trades
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-lg font-bold">
                                {autoCalculatedScore}%
                            </Badge>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleUseAutoScore}
                            >
                                Use
                            </Button>
                        </div>
                    </div>

                    {/* Manual score slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="score-slider">Manual Score</Label>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${scoreColor.text}`}>
                                    {manualScore}%
                                </span>
                                <Badge variant="outline" className={scoreColor.text}>
                                    {scoreLabel}
                                </Badge>
                            </div>
                        </div>
                        <Slider
                            id="score-slider"
                            value={[manualScore]}
                            onValueChange={(value) => setManualScore(value[0])}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0% (Poor)</span>
                            <span>50% (Moderate)</span>
                            <span>100% (Excellent)</span>
                        </div>
                    </div>

                    {/* Score range indicators */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-red-500/10 rounded border border-red-500/20 text-center">
                            <div className="font-medium text-red-500">0-39%</div>
                            <div className="text-muted-foreground">Poor</div>
                        </div>
                        <div className="p-2 bg-amber-500/10 rounded border border-amber-500/20 text-center">
                            <div className="font-medium text-amber-500">40-69%</div>
                            <div className="text-muted-foreground">Moderate</div>
                        </div>
                        <div className="p-2 bg-green-500/10 rounded border border-green-500/20 text-center">
                            <div className="font-medium text-green-500">70-100%</div>
                            <div className="text-muted-foreground">Strong</div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="validation-notes">Validation Notes</Label>
                        <Textarea
                            id="validation-notes"
                            placeholder="Add notes about why you're setting this score... What factors influenced your assessment?"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Document your reasoning for this validation score
                        </p>
                    </div>

                    {/* Warning if diverging significantly from auto score */}
                    {Math.abs(manualScore - autoCalculatedScore) > 20 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                                Your manual score differs significantly from the auto-calculated score
                                ({Math.abs(manualScore - autoCalculatedScore)}% difference).
                                Consider adding detailed notes to explain your reasoning.
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Score
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
