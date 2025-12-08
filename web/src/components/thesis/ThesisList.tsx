'use client';

import React, { useState } from 'react';
import { useThesisStore, type ThesisEntry } from '@/lib/stores/thesis-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThesisCard } from './ThesisCard';
import { ThesisDialog } from './ThesisDialog';
import { ThesisDashboard } from './ThesisDashboard';
import { Plus, Lightbulb, Target, CheckCircle, XCircle, Archive, ArrowLeft } from 'lucide-react';

export function ThesisList() {
    const { theses, deleteThesis } = useThesisStore();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | undefined>(undefined);
    const [selectedThesis, setSelectedThesis] = useState<ThesisEntry | null>(null);
    const [activeTab, setActiveTab] = useState('active');

    const handleNew = () => {
        setEditingId(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (id: string) => {
        setEditingId(id);
        setDialogOpen(true);
    };

    const handleSelect = (thesis: ThesisEntry) => {
        setSelectedThesis(thesis);
    };

    // Group theses by status
    const grouped = {
        drafting: theses.filter(t => t.status === 'drafting'),
        active: theses.filter(t => t.status === 'active'),
        validated: theses.filter(t => t.status === 'validated'),
        invalidated: theses.filter(t => t.status === 'invalidated'),
        archived: theses.filter(t => t.status === 'archived'),
    };

    const statusCounts = {
        drafting: grouped.drafting.length,
        active: grouped.active.length,
        validated: grouped.validated.length,
        invalidated: grouped.invalidated.length,
    };

    // If a thesis is selected, show its dashboard
    if (selectedThesis) {
        return (
            <ThesisDashboard
                thesis={selectedThesis}
                onBack={() => setSelectedThesis(null)}
                onEdit={() => handleEdit(selectedThesis.id)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = '/'}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Lightbulb className="h-6 w-6 text-amber-500" />
                            Thesis Engine
                        </h1>
                        <p className="text-muted-foreground text-sm">Stress-test your trading ideas before risking capital</p>
                    </div>
                </div>
                <Button onClick={handleNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Thesis
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-500">{statusCounts.active}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-slate-500">{statusCounts.drafting}</div>
                    <div className="text-xs text-muted-foreground">Drafts</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-500">{statusCounts.validated}</div>
                    <div className="text-xs text-muted-foreground">Validated</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">{statusCounts.invalidated}</div>
                    <div className="text-xs text-muted-foreground">Invalidated</div>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="active" className="gap-1">
                        <Target className="h-4 w-4" /> Active
                    </TabsTrigger>
                    <TabsTrigger value="drafting" className="gap-1">
                        <Lightbulb className="h-4 w-4" /> Drafts
                    </TabsTrigger>
                    <TabsTrigger value="validated" className="gap-1">
                        <CheckCircle className="h-4 w-4" /> Validated
                    </TabsTrigger>
                    <TabsTrigger value="invalidated" className="gap-1">
                        <XCircle className="h-4 w-4" /> Invalidated
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                    <ThesisListSection
                        theses={grouped.active}
                        onSelect={handleSelect}
                        emptyMessage="No active theses. Create one and start tracking!"
                    />
                </TabsContent>

                <TabsContent value="drafting" className="mt-4">
                    <ThesisListSection
                        theses={grouped.drafting}
                        onSelect={handleSelect}
                        emptyMessage="No drafts. Start building your next thesis!"
                    />
                </TabsContent>

                <TabsContent value="validated" className="mt-4">
                    <ThesisListSection
                        theses={grouped.validated}
                        onSelect={handleSelect}
                        emptyMessage="No validated theses yet."
                    />
                </TabsContent>

                <TabsContent value="invalidated" className="mt-4">
                    <ThesisListSection
                        theses={grouped.invalidated}
                        onSelect={handleSelect}
                        emptyMessage="No invalidated theses."
                    />
                </TabsContent>
            </Tabs>

            <ThesisDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                editingId={editingId}
            />
        </div>
    );
}

interface ThesisListSectionProps {
    theses: ThesisEntry[];
    onSelect: (thesis: ThesisEntry) => void;
    emptyMessage: string;
}

function ThesisListSection({ theses, onSelect, emptyMessage }: ThesisListSectionProps) {
    if (theses.length === 0) {
        return (
            <Card className="p-8 text-center text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{emptyMessage}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {theses.map((thesis) => (
                <ThesisCard
                    key={thesis.id}
                    thesis={thesis}
                    onClick={() => onSelect(thesis)}
                />
            ))}
        </div>
    );
}
