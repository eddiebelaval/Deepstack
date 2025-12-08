'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Undo, Redo } from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Write your notes...', className }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
        ],
        content,
        immediatelyRender: false, // Prevent SSR hydration issues
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[120px] px-3 py-2',
            },
        },
    });

    if (!editor) {
        return null;
    }

    return (
        <div className={cn("border border-border rounded-lg overflow-hidden bg-background", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    data-active={editor.isActive('bold')}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    data-active={editor.isActive('italic')}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    data-active={editor.isActive('bulletList')}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    data-active={editor.isActive('orderedList')}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo className="h-4 w-4" />
                </Button>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />
        </div>
    );
}
