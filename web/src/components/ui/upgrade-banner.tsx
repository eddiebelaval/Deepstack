'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Crown, Zap, ArrowRight, Sparkles, TrendingUp, Lock } from 'lucide-react';

export type UpgradeBannerVariant = 'sidebar' | 'inline' | 'prominent' | 'minimal';

interface UpgradeBannerProps {
    variant?: UpgradeBannerVariant;
    title?: string;
    description?: string;
    feature?: string;
    showUsage?: { used: number; limit: number };
    className?: string;
    onUpgradeClick?: () => void;
}

const variantStyles = {
    sidebar: {
        container: 'p-3 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-600/10 border border-amber-500/20',
        title: 'text-xs font-semibold text-amber-400',
        description: 'text-[10px] text-muted-foreground mt-0.5',
        button: 'w-full h-8 text-xs mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
        icon: 'h-3.5 w-3.5',
    },
    inline: {
        container: 'p-4 rounded-lg bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 border border-amber-500/20',
        title: 'text-sm font-semibold',
        description: 'text-xs text-muted-foreground mt-1',
        button: 'h-9 text-sm mt-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
        icon: 'h-4 w-4',
    },
    prominent: {
        container: 'p-6 rounded-xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-purple-500/10 border border-amber-500/30 shadow-lg shadow-amber-500/5',
        title: 'text-lg font-bold',
        description: 'text-sm text-muted-foreground mt-2',
        button: 'h-11 text-base mt-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
        icon: 'h-5 w-5',
    },
    minimal: {
        container: 'py-2 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10',
        title: 'text-xs font-medium text-amber-500',
        description: 'text-[10px] text-muted-foreground',
        button: 'h-7 text-xs px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400',
        icon: 'h-3 w-3',
    },
};

export function UpgradeBanner({
    variant = 'inline',
    title,
    description,
    feature,
    showUsage,
    className,
    onUpgradeClick,
}: UpgradeBannerProps) {
    const styles = variantStyles[variant];

    // Default content based on variant
    const defaultTitles = {
        sidebar: 'Unlock Pro Features',
        inline: feature ? `Upgrade for ${feature}` : 'Upgrade to Pro',
        prominent: 'Ready to Trade Smarter?',
        minimal: 'Upgrade',
    };

    const defaultDescriptions = {
        sidebar: 'Get unlimited AI chats, real-time data & more',
        inline: feature
            ? `${feature} and other premium features are waiting for you`
            : 'Unlock unlimited AI analysis and real-time market data',
        prominent: 'Join thousands of traders using AI-powered insights to make better decisions',
        minimal: '',
    };

    const displayTitle = title || defaultTitles[variant];
    const displayDescription = description || defaultDescriptions[variant];

    const IconComponent = variant === 'prominent' ? Sparkles : variant === 'sidebar' ? Crown : Zap;

    const handleClick = () => {
        onUpgradeClick?.();
    };

    return (
        <div className={cn(styles.container, className)}>
            {/* Usage indicator */}
            {showUsage && (
                <div className="mb-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Daily AI Chats</span>
                        <span className={cn(
                            "font-mono font-semibold",
                            showUsage.used >= showUsage.limit ? "text-loss" :
                            showUsage.used >= showUsage.limit * 0.8 ? "text-amber-400" : "text-muted-foreground"
                        )}>
                            {showUsage.used}/{showUsage.limit}
                        </span>
                    </div>
                    <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                showUsage.used >= showUsage.limit
                                    ? "bg-gradient-to-r from-loss to-red-600"
                                    : showUsage.used >= showUsage.limit * 0.8
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                        : "bg-gradient-to-r from-primary to-primary/80"
                            )}
                            style={{ width: `${Math.min(100, (showUsage.used / showUsage.limit) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex items-start gap-2">
                {variant !== 'minimal' && (
                    <div className={cn(
                        "shrink-0 rounded-full p-1.5",
                        variant === 'prominent' ? 'bg-amber-500/20' : 'bg-amber-500/10'
                    )}>
                        <IconComponent className={cn(styles.icon, "text-amber-500")} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className={styles.title}>{displayTitle}</p>
                    {displayDescription && variant !== 'minimal' && (
                        <p className={styles.description}>{displayDescription}</p>
                    )}
                </div>
            </div>

            {/* CTA Button */}
            <Button
                asChild
                className={cn(styles.button, variant === 'minimal' && 'ml-auto')}
                onClick={handleClick}
            >
                <Link href="/pricing">
                    {variant === 'minimal' ? (
                        <>
                            <Crown className={cn(styles.icon, "mr-1")} />
                            Pro
                        </>
                    ) : variant === 'sidebar' ? (
                        <>
                            <TrendingUp className={cn(styles.icon, "mr-1.5")} />
                            Upgrade Now
                        </>
                    ) : (
                        <>
                            <Sparkles className={cn(styles.icon, "mr-2")} />
                            Upgrade to Pro
                            <ArrowRight className={cn(styles.icon, "ml-2")} />
                        </>
                    )}
                </Link>
            </Button>
        </div>
    );
}

// Pre-configured components for common use cases
export function SidebarUpgradeBanner({ showUsage, className }: { showUsage?: { used: number; limit: number }; className?: string }) {
    return <UpgradeBanner variant="sidebar" showUsage={showUsage} className={className} />;
}

export function ChatLimitBanner({ used, limit, className }: { used: number; limit: number; className?: string }) {
    const isAtLimit = used >= limit;
    const isNearLimit = used >= limit * 0.8;

    return (
        <UpgradeBanner
            variant={isAtLimit ? 'prominent' : isNearLimit ? 'inline' : 'minimal'}
            title={isAtLimit
                ? "You've reached your daily limit"
                : isNearLimit
                    ? `${limit - used} chat${limit - used === 1 ? '' : 's'} left today`
                    : undefined
            }
            description={isAtLimit
                ? "Upgrade to Pro for unlimited AI-powered research and analysis"
                : isNearLimit
                    ? "Upgrade to Pro for unlimited chats and real-time data"
                    : undefined
            }
            showUsage={isAtLimit || isNearLimit ? { used, limit } : undefined}
            className={className}
        />
    );
}

export function FeatureLockedBanner({ feature, className }: { feature: string; className?: string }) {
    return (
        <div className={cn(
            "p-4 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border",
            className
        )}>
            <div className="flex items-center gap-3">
                <div className="shrink-0 p-2 rounded-full bg-amber-500/10">
                    <Lock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{feature}</p>
                    <p className="text-xs text-muted-foreground">Available with Pro</p>
                </div>
                <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                    <Link href="/pricing">
                        <Crown className="h-3.5 w-3.5 mr-1.5" />
                        Unlock
                    </Link>
                </Button>
            </div>
        </div>
    );
}
