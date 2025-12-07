'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Settings, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserMenuProps {
    expanded?: boolean
    onProfileClick?: () => void
    onSettingsClick?: () => void
    profileOpen?: boolean
    settingsOpen?: boolean
}

export function UserMenu({
    expanded = true,
    onProfileClick,
    onSettingsClick,
    profileOpen,
    settingsOpen
}: UserMenuProps) {
    const { user, loading, signOut } = useAuth()

    if (loading) {
        return (
            <div className={cn(
                "flex items-center justify-center h-11",
                expanded ? "px-3" : "px-0"
            )}>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    const userEmail = user.email || 'User'
    const userName = user.user_metadata?.full_name || userEmail.split('@')[0]
    const userAvatar = user.user_metadata?.avatar_url
    const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

    return (
        <div className="space-y-1">
            {/* User Info with Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full rounded-xl h-11 tap-target",
                            expanded ? "justify-start px-3" : "justify-center px-0"
                        )}
                    >
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={userAvatar} alt={userName} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        {expanded && (
                            <div className="ml-2 flex-1 text-left truncate">
                                <span className="text-sm font-medium">{userName}</span>
                            </div>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align={expanded ? "start" : "center"}
                    side="right"
                    className="w-56"
                >
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userName}</p>
                            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onProfileClick}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onSettingsClick}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => signOut()}
                        className="text-destructive focus:text-destructive"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Button */}
            <Button
                variant={profileOpen ? "secondary" : "ghost"}
                onClick={onProfileClick}
                className={cn(
                    "w-full rounded-xl h-11 tap-target",
                    expanded ? "justify-start" : "justify-center px-0"
                )}
            >
                <User className="h-4 w-4" />
                {expanded && (
                    <>
                        <span className="ml-2 flex-1 text-left">Profile</span>
                        <ChevronRight className="h-3 w-3 opacity-50" />
                    </>
                )}
            </Button>

            {/* Settings Button */}
            <Button
                variant={settingsOpen ? "secondary" : "ghost"}
                onClick={onSettingsClick}
                className={cn(
                    "w-full rounded-xl h-11 tap-target",
                    expanded ? "justify-start" : "justify-center px-0"
                )}
            >
                <Settings className="h-4 w-4" />
                {expanded && (
                    <>
                        <span className="ml-2 flex-1 text-left">Settings</span>
                        <ChevronRight className="h-3 w-3 opacity-50" />
                    </>
                )}
            </Button>
        </div>
    )
}
