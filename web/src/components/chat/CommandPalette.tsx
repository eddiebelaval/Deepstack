"use client"

import * as React from "react"
import {
    CreditCard,
    TrendingUp,
    Search,
    Activity,
    Terminal
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
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
                <CommandGroup heading="Trading Tools">
                    <CommandItem onSelect={() => runCommand("/analyze")}>
                        <Activity className="mr-2 h-4 w-4" />
                        <span>Analyze Ticker</span>
                        <CommandShortcut>⌘A</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/screen")}>
                        <Search className="mr-2 h-4 w-4" />
                        <span>Stock Screener</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/order")}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <span>Place Order</span>
                        <CommandShortcut>⌘O</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="System">
                    <CommandItem onSelect={() => runCommand("/portfolio")}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Portfolio Summary</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/risk")}>
                        <Terminal className="mr-2 h-4 w-4" />
                        <span>Risk Report</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
