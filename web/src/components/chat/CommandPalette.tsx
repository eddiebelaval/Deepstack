"use client"

import * as React from "react"
import {
    Activity,
    BarChart3,
    Bell,
    BookOpen,
    Brain,
    Briefcase,
    Calculator,
    Calendar,
    Diamond,
    FileSearch,
    Filter,
    Lightbulb,
    LineChart,
    Newspaper,
    Shield,
    Sparkles,
    TrendingUp,
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCommand: (command: string) => void
}

export function CommandPalette({ open, onOpenChange, onCommand }: CommandPaletteProps) {
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "Tab" && e.shiftKey) {
                e.preventDefault()
                onOpenChange(!open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [open, onOpenChange])

    const runCommand = React.useCallback((command: string) => {
        onOpenChange(false)
        onCommand(command)
    }, [onOpenChange, onCommand])

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {/* Core Tools */}
                <CommandGroup heading="Core Tools">
                    <CommandItem onSelect={() => runCommand("/journal")}>
                        <BookOpen className="mr-2 h-4 w-4 text-rose-400" />
                        <span>Trade Journal</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/thesis")}>
                        <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Thesis Engine</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/insights")}>
                        <Brain className="mr-2 h-4 w-4 text-violet-400" />
                        <span>AI Insights</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/research")}>
                        <FileSearch className="mr-2 h-4 w-4 text-blue-400" />
                        <span>Research Hub</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* Market Data */}
                <CommandGroup heading="Market Data">
                    <CommandItem onSelect={() => runCommand("/chart")}>
                        <LineChart className="mr-2 h-4 w-4 text-blue-400" />
                        <span>Chart</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/portfolio")}>
                        <Briefcase className="mr-2 h-4 w-4 text-green-400" />
                        <span>Portfolio</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/news")}>
                        <Newspaper className="mr-2 h-4 w-4 text-amber-400" />
                        <span>News</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/calendar")}>
                        <Calendar className="mr-2 h-4 w-4 text-purple-400" />
                        <span>Calendar</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/alerts")}>
                        <Bell className="mr-2 h-4 w-4 text-red-400" />
                        <span>Price Alerts</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* Screeners */}
                <CommandGroup heading="Screeners">
                    <CommandItem onSelect={() => runCommand("/screener")}>
                        <BarChart3 className="mr-2 h-4 w-4 text-cyan-400" />
                        <span>Stock Screener</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/deep-value")}>
                        <Diamond className="mr-2 h-4 w-4 text-pink-400" />
                        <span>Deep Value</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/options")}>
                        <Filter className="mr-2 h-4 w-4 text-orange-400" />
                        <span>Options Screener</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* Trading */}
                <CommandGroup heading="Trading">
                    <CommandItem onSelect={() => runCommand("/analyze")}>
                        <Activity className="mr-2 h-4 w-4 text-emerald-400" />
                        <span>Analyze Ticker</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/order")}>
                        <TrendingUp className="mr-2 h-4 w-4 text-green-400" />
                        <span>Place Order</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/hedged")}>
                        <Shield className="mr-2 h-4 w-4 text-teal-400" />
                        <span>Hedged Positions</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/builder")}>
                        <Calculator className="mr-2 h-4 w-4 text-indigo-400" />
                        <span>Options Builder</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/predictions")}>
                        <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
                        <span>Prediction Markets</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
