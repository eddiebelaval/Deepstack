'use client';

import React from 'react';
import { ChatInput } from './ChatInput';

interface InputBarProps {
    onSend: (message: string) => void;
    isLoading?: boolean;
}

export function InputBar({ onSend, isLoading }: InputBarProps) {
    return (
        <div className="sticky bottom-0 z-10 p-3 glass-surface-elevated border-t border-border/50">
            <div className="max-w-3xl mx-auto w-full">
                <ChatInput onSend={onSend} disabled={isLoading} />
            </div>
        </div>
    );
}
