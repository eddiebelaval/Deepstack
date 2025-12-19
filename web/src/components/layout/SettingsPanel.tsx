'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useUIStore } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { useNewsStore } from '@/lib/stores/news-store';
import { Button } from '@/components/ui/button';
import { X, Monitor, Bell, Globe, Brain, Database, Download, Clock, User, Newspaper, RefreshCw, MessageSquare, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PersonaSection } from '@/components/settings/PersonaSection';

export function SettingsPanel() {
    const { settingsOpen, toggleSettings, toggleUsage } = useUIStore();
    const { activeProvider, setActiveProvider, useExtendedThinking, setUseExtendedThinking } = useChatStore();
    const {
        autoRefreshEnabled,
        setAutoRefresh,
        includeSocial,
        setIncludeSocial,
        sourcesHealth,
        fetchSourcesHealth,
    } = useNewsStore();
    useTheme(); // Hook must be called but values not directly used (used by ThemeToggle)

    // Local state for settings that don't have stores yet
    const [compactMode, setCompactMode] = React.useState(false);
    const [marketAlerts, setMarketAlerts] = React.useState(true);
    const [researchUpdates, setResearchUpdates] = React.useState(true);
    const [predictionAlerts, setPredictionAlerts] = React.useState(false);
    const [timezone, setTimezone] = React.useState('auto');
    const [isLoadingHealth, setIsLoadingHealth] = React.useState(false);

    // Fetch source health when settings panel opens
    useEffect(() => {
        if (settingsOpen && !sourcesHealth) {
            setIsLoadingHealth(true);
            fetchSourcesHealth().finally(() => setIsLoadingHealth(false));
        }
    }, [settingsOpen, sourcesHealth, fetchSourcesHealth]);

    const handleExportData = () => {
        // Export user data (theses, journal entries) as JSON
        const thesesData = localStorage.getItem('deepstack-thesis-storage');
        const journalData = localStorage.getItem('deepstack-journal-storage');

        const exportData = {
            exportedAt: new Date().toISOString(),
            theses: thesesData ? JSON.parse(thesesData) : null,
            journal: journalData ? JSON.parse(journalData) : null,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deepstack-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AnimatePresence>
            {settingsOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={toggleSettings}
                        className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm"
                    />

                    {/* Slide-out Panel */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 bottom-0 w-[400px] z-50 bg-background/80 backdrop-blur-md border-r border-border shadow-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                                <button
                                    onClick={() => {
                                        toggleSettings(); // Close settings
                                        toggleUsage(); // Open usage panel
                                    }}
                                    className="text-sm text-muted-foreground mt-1 text-left hover:text-foreground transition-colors group"
                                >
                                    <span className="group-hover:underline">View Usage</span>
                                </button>
                            </div>
                            <Button variant="ghost" size="icon" onClick={toggleSettings}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-8">
                                {/* Appearance */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Monitor className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Appearance</h3>
                                    </div>
                                    <div className="space-y-4 pl-7">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Theme</Label>
                                                <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
                                            </div>
                                            <ThemeToggle variant="buttons" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Compact Mode</Label>
                                                <p className="text-xs text-muted-foreground">Reduce spacing for higher density</p>
                                            </div>
                                            <Switch
                                                checked={compactMode}
                                                onCheckedChange={setCompactMode}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* AI Persona */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <User className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">AI Persona</h3>
                                    </div>
                                    <div className="pl-7">
                                        <PersonaSection />
                                    </div>
                                </div>

                                <Separator />

                                {/* AI Assistant */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Brain className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">AI Model</h3>
                                    </div>
                                    <div className="space-y-4 pl-7">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Default Model</Label>
                                                <p className="text-xs text-muted-foreground">AI model for conversations</p>
                                            </div>
                                            <Select
                                                value={activeProvider}
                                                onValueChange={(value) => setActiveProvider(value as any)}
                                            >
                                                <SelectTrigger className="w-[160px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="claude_haiku">Haiku (Fast)</SelectItem>
                                                    <SelectItem value="perplexity">Perplexity (Search)</SelectItem>
                                                    <SelectItem value="sonar_reasoning">DeepSeek R1 (Reasoning)</SelectItem>
                                                    <SelectItem value="grok">Grok (Fast)</SelectItem>
                                                    <SelectItem value="claude">Sonnet (Balanced)</SelectItem>
                                                    <SelectItem value="claude_opus">Opus (Advanced)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Extended Thinking</Label>
                                                <p className="text-xs text-muted-foreground">Enable deeper reasoning for complex questions</p>
                                            </div>
                                            <Switch
                                                checked={useExtendedThinking}
                                                onCheckedChange={setUseExtendedThinking}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                                            Use Haiku for quick tasks, Opus for complex analysis.
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Notifications */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Bell className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Notifications</h3>
                                    </div>
                                    <div className="space-y-4 pl-7">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Market Alerts</Label>
                                                <p className="text-xs text-muted-foreground">Price targets and market events</p>
                                            </div>
                                            <Switch
                                                checked={marketAlerts}
                                                onCheckedChange={setMarketAlerts}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Research Updates</Label>
                                                <p className="text-xs text-muted-foreground">New insights on watched stocks</p>
                                            </div>
                                            <Switch
                                                checked={researchUpdates}
                                                onCheckedChange={setResearchUpdates}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Prediction Markets</Label>
                                                <p className="text-xs text-muted-foreground">Changes to tracked predictions</p>
                                            </div>
                                            <Switch
                                                checked={predictionAlerts}
                                                onCheckedChange={setPredictionAlerts}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* News & Data Sources */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Newspaper className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">News Feed</h3>
                                    </div>
                                    <div className="space-y-4 pl-7">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="flex items-center gap-1.5">
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                    Auto-Refresh
                                                </Label>
                                                <p className="text-xs text-muted-foreground">Automatically check for new articles</p>
                                            </div>
                                            <Switch
                                                checked={autoRefreshEnabled}
                                                onCheckedChange={setAutoRefresh}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="flex items-center gap-1.5">
                                                    <MessageSquare className="h-3.5 w-3.5" />
                                                    Social Media
                                                </Label>
                                                <p className="text-xs text-muted-foreground">Include StockTwits posts in feed</p>
                                            </div>
                                            <Switch
                                                checked={includeSocial}
                                                onCheckedChange={setIncludeSocial}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Data Sources Health */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Database className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Data Sources</h3>
                                    </div>
                                    <div className="space-y-3 pl-7">
                                        {isLoadingHealth ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Checking source status...</span>
                                            </div>
                                        ) : sourcesHealth ? (
                                            <>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Overall Status</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {sourcesHealth.overall_healthy ? (
                                                            <>
                                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                <span className="text-green-500 font-medium">Healthy</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="h-4 w-4 text-amber-500" />
                                                                <span className="text-amber-500 font-medium">Degraded</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {Object.entries(sourcesHealth.sources).map(([name, status]) => (
                                                        <div key={name} className="flex items-center justify-between text-sm">
                                                            <span className="capitalize text-muted-foreground">{name}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                {!status.configured ? (
                                                                    <span className="text-xs text-muted-foreground/60">Not configured</span>
                                                                ) : status.healthy ? (
                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                                ) : (
                                                                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground pt-2">
                                                    {sourcesHealth.healthy_sources} of {sourcesHealth.total_sources} sources active
                                                </p>
                                            </>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setIsLoadingHealth(true);
                                                    fetchSourcesHealth().finally(() => setIsLoadingHealth(false));
                                                }}
                                            >
                                                Check Status
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* System */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Globe className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">System</h3>
                                    </div>
                                    <div className="space-y-4 pl-7">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Language</Label>
                                                <p className="text-xs text-muted-foreground">Interface language</p>
                                            </div>
                                            <Select defaultValue="en">
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en">English (US)</SelectItem>
                                                    <SelectItem value="es" disabled>Español (Soon)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    Timezone
                                                </Label>
                                                <p className="text-xs text-muted-foreground">For market hours display</p>
                                            </div>
                                            <Select value={timezone} onValueChange={setTimezone}>
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="auto">Auto-detect</SelectItem>
                                                    <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                                                    <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                                                    <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                                                    <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="flex items-center gap-1.5">
                                                    <Download className="h-3.5 w-3.5" />
                                                    Export Data
                                                </Label>
                                                <p className="text-xs text-muted-foreground">Download theses & journal</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleExportData}
                                            >
                                                Export
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
