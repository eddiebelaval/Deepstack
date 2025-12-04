'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/stores/ui-store';
import { Button } from '@/components/ui/button';
import { X, User, Mail, Shield, CreditCard, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export function ProfilePanel() {
    const { profileOpen, toggleProfile } = useUIStore();

    return (
        <AnimatePresence>
            {profileOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={toggleProfile}
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
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
                            <Button variant="ghost" size="icon" onClick={toggleProfile}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-8">
                                {/* User Info */}
                                <div className="flex flex-col items-center space-y-4">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src="https://github.com/shadcn.png" />
                                        <AvatarFallback>JD</AvatarFallback>
                                    </Avatar>
                                    <div className="text-center">
                                        <h3 className="text-xl font-semibold">John Doe</h3>
                                        <p className="text-sm text-muted-foreground">Pro Trader</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Profile Sections */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account</h4>

                                        <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">Personal Information</p>
                                                <p className="text-xs text-muted-foreground">Update your personal details</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <Mail className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">Email Settings</p>
                                                <p className="text-xs text-muted-foreground">Manage your email preferences</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Security</h4>

                                        <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <Shield className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">Password & Security</p>
                                                <p className="text-xs text-muted-foreground">Manage your password and 2FA</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Billing</h4>

                                        <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <CreditCard className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">Payment Methods</p>
                                                <p className="text-xs text-muted-foreground">Manage your payment cards</p>
                                            </div>
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
