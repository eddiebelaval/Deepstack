'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useUIStore } from '@/lib/stores/ui-store';
import { Button } from '@/components/ui/button';
import { X, Monitor, Volume2, Globe, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function SettingsPanel() {
    const { settingsOpen, toggleSettings, credits } = useUIStore();
    useTheme(); // Hook must be called but values not directly used (used by ThemeToggle)

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
                                <p className="text-sm text-muted-foreground mt-1">
                                    Credits: <span className="font-mono text-primary font-bold">{credits}</span>
                                </p>
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
                                            <Switch />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Trading Interface */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Database className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Trading Interface</h3>
                                    </div>
                                    <div className="space-y-4 pl-7">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>One-Click Trading</Label>
                                                <p className="text-xs text-muted-foreground">Execute trades with a single click</p>
                                            </div>
                                            <Switch />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Show Order Confirmations</Label>
                                                <p className="text-xs text-muted-foreground">Confirm before placing orders</p>
                                            </div>
                                            <Switch checked={true} />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Notifications */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Volume2 className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Notifications</h3>
                                    </div>
                                    <div className="space-y-4 pl-7">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Trade Executions</Label>
                                                <p className="text-xs text-muted-foreground">Notify when trades are filled</p>
                                            </div>
                                            <Switch checked={true} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Price Alerts</Label>
                                                <p className="text-xs text-muted-foreground">Notify when price targets are hit</p>
                                            </div>
                                            <Switch checked={true} />
                                        </div>
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
                                                <p className="text-xs text-muted-foreground">English (US)</p>
                                            </div>
                                            <Button variant="outline" size="sm">Change</Button>
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
