'use client';

import React from 'react';
import { ChatInput } from './ChatInput';

interface InputBarProps {
    onSend: (message: string) => void;
    isLoading?: boolean;
}

export function InputBar({ onSend, isLoading }: InputBarProps) {
    return (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-10 p-4">
            <div className="max-w-4xl mx-auto w-full">
                <ChatInput onSend={onSend} disabled={isLoading} />
            </div>
        </div>
    );
}
