/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichTextEditor } from '../RichTextEditor';

// Mock TipTap
const mockEditor = {
  getHTML: vi.fn(() => '<p>Test content</p>'),
  isActive: vi.fn((_type?: string) => false),
  can: vi.fn(() => ({
    undo: vi.fn(() => true),
    redo: vi.fn(() => true),
  })),
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      toggleBold: vi.fn(() => ({ run: vi.fn() })),
      toggleItalic: vi.fn(() => ({ run: vi.fn() })),
      toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
      toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
      undo: vi.fn(() => ({ run: vi.fn() })),
      redo: vi.fn(() => ({ run: vi.fn() })),
    })),
  })),
};

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn((config) => {
    if (config?.onUpdate) {
      // Store onUpdate for testing
      (mockEditor as any).onUpdate = config.onUpdate;
    }
    return mockEditor;
  }),
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content">
      {editor ? 'Editor Active' : null}
    </div>
  ),
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: {},
}));

vi.mock('@tiptap/extension-placeholder', () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

describe('RichTextEditor', () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    content: '',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the editor', () => {
      render(<RichTextEditor {...defaultProps} />);
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('returns null when editor is not initialized', () => {
      const { useEditor } = require('@tiptap/react');
      useEditor.mockReturnValueOnce(null);

      const { container } = render(<RichTextEditor {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders toolbar with formatting buttons', () => {
      render(<RichTextEditor {...defaultProps} />);

      // Check for all toolbar buttons by their icons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Verify toolbar structure
      const toolbar = document.querySelector('.border-b');
      expect(toolbar).toBeInTheDocument();
    });

    it('applies custom className to container', () => {
      const { container } = render(
        <RichTextEditor {...defaultProps} className="custom-editor" />
      );

      const editorContainer = container.firstChild;
      expect(editorContainer).toHaveClass('custom-editor');
    });

    it('uses default placeholder', () => {
      const { useEditor } = require('@tiptap/react');
      const { default: Placeholder } = require('@tiptap/extension-placeholder');

      render(<RichTextEditor {...defaultProps} />);

      expect(Placeholder.configure).toHaveBeenCalledWith({
        placeholder: 'Write your notes...',
      });
    });

    it('uses custom placeholder', () => {
      const { default: Placeholder } = require('@tiptap/extension-placeholder');

      render(
        <RichTextEditor {...defaultProps} placeholder="Custom placeholder" />
      );

      expect(Placeholder.configure).toHaveBeenCalledWith({
        placeholder: 'Custom placeholder',
      });
    });
  });

  describe('toolbar buttons', () => {
    it('renders bold button', () => {
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const boldButton = buttons.find(btn =>
        btn.querySelector('.lucide-bold')
      );

      expect(boldButton).toBeInTheDocument();
    });

    it('renders italic button', () => {
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const italicButton = buttons.find(btn =>
        btn.querySelector('.lucide-italic')
      );

      expect(italicButton).toBeInTheDocument();
    });

    it('renders bullet list button', () => {
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const listButton = buttons.find(btn =>
        btn.querySelector('.lucide-list')
      );

      expect(listButton).toBeInTheDocument();
    });

    it('renders ordered list button', () => {
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const orderedListButton = buttons.find(btn =>
        btn.querySelector('.lucide-list-ordered')
      );

      expect(orderedListButton).toBeInTheDocument();
    });

    it('renders undo button', () => {
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const undoButton = buttons.find(btn =>
        btn.querySelector('.lucide-undo')
      );

      expect(undoButton).toBeInTheDocument();
    });

    it('renders redo button', () => {
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const redoButton = buttons.find(btn =>
        btn.querySelector('.lucide-redo')
      );

      expect(redoButton).toBeInTheDocument();
    });
  });

  describe('formatting actions', () => {
    it('toggles bold when bold button is clicked', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const boldButton = buttons.find(btn =>
        btn.querySelector('.lucide-bold')
      );

      if (boldButton) {
        await user.click(boldButton);

        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });

    it('toggles italic when italic button is clicked', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const italicButton = buttons.find(btn =>
        btn.querySelector('.lucide-italic')
      );

      if (italicButton) {
        await user.click(italicButton);

        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });

    it('toggles bullet list when bullet list button is clicked', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const listButton = buttons.find(btn =>
        btn.querySelector('.lucide-list')
      );

      if (listButton) {
        await user.click(listButton);

        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });

    it('toggles ordered list when ordered list button is clicked', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const orderedListButton = buttons.find(btn =>
        btn.querySelector('.lucide-list-ordered')
      );

      if (orderedListButton) {
        await user.click(orderedListButton);

        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });
  });

  describe('undo/redo functionality', () => {
    it('calls undo when undo button is clicked', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const undoButton = buttons.find(btn =>
        btn.querySelector('.lucide-undo')
      );

      if (undoButton) {
        await user.click(undoButton);

        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });

    it('calls redo when redo button is clicked', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const redoButton = buttons.find(btn =>
        btn.querySelector('.lucide-redo')
      );

      if (redoButton) {
        await user.click(redoButton);

        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });

    it('disables undo button when cannot undo', () => {
      mockEditor.can.mockReturnValue({
        undo: vi.fn(() => false),
        redo: vi.fn(() => true),
      } as any);

      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const undoButton = buttons.find(btn =>
        btn.querySelector('.lucide-undo')
      );

      expect(undoButton).toBeDisabled();
    });

    it('disables redo button when cannot redo', () => {
      mockEditor.can.mockReturnValue({
        undo: vi.fn(() => true),
        redo: vi.fn(() => false),
      } as any);

      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const redoButton = buttons.find(btn =>
        btn.querySelector('.lucide-redo')
      );

      expect(redoButton).toBeDisabled();
    });
  });

  describe('active state indication', () => {
    it('shows active state for bold when text is bold', () => {
      (mockEditor.isActive as ReturnType<typeof vi.fn>).mockImplementation(
        (type?: string): boolean => type === 'bold'
      );

      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const boldButton = buttons.find(btn =>
        btn.querySelector('.lucide-bold')
      );

      expect(boldButton).toHaveAttribute('data-active', 'true');
    });

    it('shows active state for italic when text is italic', () => {
      (mockEditor.isActive as ReturnType<typeof vi.fn>).mockImplementation(
        (type?: string): boolean => type === 'italic'
      );

      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const italicButton = buttons.find(btn =>
        btn.querySelector('.lucide-italic')
      );

      expect(italicButton).toHaveAttribute('data-active', 'true');
    });

    it('shows active state for bullet list when in bullet list', () => {
      (mockEditor.isActive as ReturnType<typeof vi.fn>).mockImplementation(
        (type?: string): boolean => type === 'bulletList'
      );

      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const listButton = buttons.find(btn =>
        btn.querySelector('.lucide-list')
      );

      expect(listButton).toHaveAttribute('data-active', 'true');
    });

    it('shows active state for ordered list when in ordered list', () => {
      (mockEditor.isActive as ReturnType<typeof vi.fn>).mockImplementation(
        (type?: string): boolean => type === 'orderedList'
      );

      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const orderedListButton = buttons.find(btn =>
        btn.querySelector('.lucide-list-ordered')
      );

      expect(orderedListButton).toHaveAttribute('data-active', 'true');
    });
  });

  describe('content updates', () => {
    it('calls onChange when content is updated', () => {
      const { useEditor } = require('@tiptap/react');

      render(<RichTextEditor {...defaultProps} />);

      // Get the onUpdate callback that was registered
      const lastCall = useEditor.mock.calls[useEditor.mock.calls.length - 1];
      const config = lastCall[0];
      const onUpdate = config.onUpdate;

      // Simulate content update
      mockEditor.getHTML.mockReturnValue('<p>New content</p>');
      onUpdate({ editor: mockEditor });

      expect(mockOnChange).toHaveBeenCalledWith('<p>New content</p>');
    });

    it('initializes with provided content', () => {
      const { useEditor } = require('@tiptap/react');

      render(<RichTextEditor {...defaultProps} content="<p>Initial content</p>" />);

      const lastCall = useEditor.mock.calls[useEditor.mock.calls.length - 1];
      const config = lastCall[0];

      expect(config.content).toBe('<p>Initial content</p>');
    });
  });

  describe('styling', () => {
    it('has border and rounded corners', () => {
      const { container } = render(<RichTextEditor {...defaultProps} />);

      const editorContainer = container.firstChild;
      expect(editorContainer).toHaveClass('border');
      expect(editorContainer).toHaveClass('rounded-lg');
    });

    it('has background color', () => {
      const { container } = render(<RichTextEditor {...defaultProps} />);

      const editorContainer = container.firstChild;
      expect(editorContainer).toHaveClass('bg-background');
    });

    it('toolbar has separator between button groups', () => {
      render(<RichTextEditor {...defaultProps} />);

      const separator = document.querySelector('.bg-border');
      expect(separator).toBeInTheDocument();
    });
  });

  describe('button types', () => {
    it('all buttons have type="button" to prevent form submission', () => {
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('editor props', () => {
    it('configures editor with correct attributes', () => {
      const { useEditor } = require('@tiptap/react');

      render(<RichTextEditor {...defaultProps} />);

      const lastCall = useEditor.mock.calls[useEditor.mock.calls.length - 1];
      const config = lastCall[0];

      expect(config.editorProps.attributes.class).toContain('prose');
      expect(config.editorProps.attributes.class).toContain('min-h-[120px]');
      expect(config.editorProps.attributes.class).toContain('focus:outline-none');
    });

    it('disables immediate rendering to prevent SSR issues', () => {
      const { useEditor } = require('@tiptap/react');

      render(<RichTextEditor {...defaultProps} />);

      const lastCall = useEditor.mock.calls[useEditor.mock.calls.length - 1];
      const config = lastCall[0];

      expect(config.immediatelyRender).toBe(false);
    });
  });

  describe('toolbar layout', () => {
    it('has flex layout with proper spacing', () => {
      render(<RichTextEditor {...defaultProps} />);

      const toolbar = document.querySelector('.p-2.border-b');
      expect(toolbar).toHaveClass('flex');
      expect(toolbar).toHaveClass('items-center');
      expect(toolbar).toHaveClass('gap-1');
    });

    it('has spacer element between formatting and undo/redo', () => {
      render(<RichTextEditor {...defaultProps} />);

      const spacer = document.querySelector('.flex-1');
      expect(spacer).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('all buttons are keyboard accessible', () => {
      render(<RichTextEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInstanceOf(HTMLButtonElement);
      });
    });
  });
});
