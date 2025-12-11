'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/stores/ui-store';
import { useUser } from '@/hooks/useUser';
import { useSession } from '@/hooks/useSession';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, User, Mail, Shield, CreditCard, LogOut, Check, Edit2, Crown, Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ProfilePanel() {
    const { profileOpen, toggleProfile } = useUIStore();
    const { user, profile, tier } = useUser();
    const { signOut } = useSession();

    // Edit states
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Get initials from name or email
    const getInitials = () => {
        if (profile?.full_name) {
            return profile.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        if (user?.email) {
            return user.email[0].toUpperCase();
        }
        return 'U';
    };

    // Get display name
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

    // Get tier display info
    const tierConfig = {
        free: { label: 'Free', color: 'bg-muted text-muted-foreground', icon: null as typeof Crown | null },
        pro: { label: 'Pro', color: 'bg-primary text-primary-foreground', icon: Crown },
        enterprise: { label: 'Enterprise', color: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white', icon: Sparkles },
    };
    const tierInfo = tierConfig[tier as keyof typeof tierConfig] || tierConfig.free;

    // Handle name edit
    const handleStartEdit = () => {
        setEditedName(profile?.full_name || '');
        setIsEditingName(true);
        setSaveError(null);
    };

    const handleSaveName = async () => {
        if (!user?.id || !editedName.trim()) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            const supabase = createClient();
            if (!supabase) {
                throw new Error('Database not configured');
            }

            const { error } = await supabase
                .from('profiles')
                .update({ full_name: editedName.trim(), updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (error) throw error;

            setIsEditingName(false);
        } catch (err) {
            console.error('Failed to update name:', err);
            setSaveError('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingName(false);
        setEditedName('');
        setSaveError(null);
    };

    // Handle sign out
    const handleSignOut = async () => {
        toggleProfile(); // Close panel first
        await signOut();
    };

    // Format date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

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
                                {/* User Info Card */}
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="relative">
                                        <Avatar className="h-24 w-24 border-2 border-primary/20">
                                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                                            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                                                {getInitials()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <Badge
                                            className={cn(
                                                "absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-semibold",
                                                tierInfo.color
                                            )}
                                        >
                                            {tierInfo.icon && <tierInfo.icon className="h-3 w-3 mr-1" />}
                                            {tierInfo.label}
                                        </Badge>
                                    </div>
                                    <div className="text-center space-y-1">
                                        {isEditingName ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    className="h-8 text-center w-40"
                                                    placeholder="Your name"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveName();
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={handleSaveName}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Check className="h-4 w-4 text-profit" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={handleCancelEdit}
                                                    disabled={isSaving}
                                                >
                                                    <X className="h-4 w-4 text-loss" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-semibold">{displayName}</h3>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6"
                                                    onClick={handleStartEdit}
                                                >
                                                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        )}
                                        {saveError && (
                                            <p className="text-xs text-loss">{saveError}</p>
                                        )}
                                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Account Section */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account</h4>

                                    <div className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">Member Since</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(profile?.created_at || user?.created_at || null)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <Mail className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">Email</p>
                                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                {user?.email || 'Not set'}
                                            </p>
                                        </div>
                                        {user?.email_confirmed_at && (
                                            <Badge variant="outline" className="text-profit border-profit/30">
                                                <Check className="h-3 w-3 mr-1" />
                                                Verified
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Subscription Section */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Subscription</h4>

                                    <div className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <CreditCard className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{tierInfo.label} Plan</p>
                                            <p className="text-sm text-muted-foreground">
                                                {profile?.subscription_status === 'active'
                                                    ? `Renews ${formatDate(profile?.subscription_ends_at)}`
                                                    : tier === 'free'
                                                        ? 'Limited features'
                                                        : 'Inactive'}
                                            </p>
                                        </div>
                                        {tier === 'free' && (
                                            <Button size="sm" variant="default" className="text-xs">
                                                Upgrade
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Security Section */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Security</h4>

                                    <div className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <Shield className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">Authentication</p>
                                            <p className="text-sm text-muted-foreground">
                                                {user?.app_metadata?.provider === 'google'
                                                    ? 'Google Sign-In'
                                                    : user?.app_metadata?.provider === 'github'
                                                        ? 'GitHub Sign-In'
                                                        : 'Email & Password'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Sign Out */}
                                <Button
                                    variant="outline"
                                    className="w-full text-loss hover:text-loss hover:bg-loss/10 border-loss/30"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </ScrollArea>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
