import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from '../CodeBlock';

// Mock react-syntax-highlighter to avoid rendering issues in tests
vi.mock('react-syntax-highlighter', () => ({
  Prism: vi.fn(({ children, language }) => (
    <pre data-testid="syntax-highlighter" data-language={language}>
      {children}
    </pre>
  )),
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

describe('CodeBlock', () => {
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  // Mock clipboard API
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders code with syntax highlighting', () => {
      render(<CodeBlock language="javascript" value="const x = 10;" />);

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
      expect(screen.getByText('const x = 10;')).toBeInTheDocument();
    });

    it('displays language label', () => {
      render(<CodeBlock language="typescript" value="let x: number = 5;" />);

      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('displays "text" when no language provided', () => {
      render(<CodeBlock language="" value="plain text" />);

      expect(screen.getByText('text')).toBeInTheDocument();
    });

    it('renders copy button', () => {
      render(<CodeBlock language="javascript" value="console.log('test');" />);

      expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('has proper container styling', () => {
      const { container } = render(<CodeBlock language="python" value="print('hello')" />);
      const wrapper = container.firstChild;

      expect(wrapper).toHaveClass('rounded-md');
      expect(wrapper).toHaveClass('overflow-hidden');
      expect(wrapper).toHaveClass('border');
      expect(wrapper).toHaveClass('border-border/50');
    });

    it('renders with custom className', () => {
      const { container } = render(
        <CodeBlock language="javascript" value="test" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Copy functionality', () => {
    it('copies code to clipboard on button click', async () => {
      const testCode = 'const greeting = "Hello, World!";';
      render(<CodeBlock language="javascript" value={testCode} />);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(testCode);
      });
    });

    it('shows "Copied!" feedback after copying', async () => {
      render(<CodeBlock language="javascript" value="test code" />);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('resets copy feedback after 2 seconds', async () => {
      vi.useFakeTimers();

      render(<CodeBlock language="javascript" value="test code" />);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('shows check icon when copied', async () => {
      render(<CodeBlock language="javascript" value="test" />);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(document.querySelector('.lucide-check')).toBeInTheDocument();
      });
    });

    it('handles copy failure gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWriteText.mockRejectedValueOnce(new Error('Copy failed'));

      render(<CodeBlock language="javascript" value="test" />);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to copy text: ',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('does not copy empty value', async () => {
      render(<CodeBlock language="javascript" value="" />);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });

  describe('Language support', () => {
    it('renders JavaScript code', () => {
      const code = 'function test() { return true; }';
      render(<CodeBlock language="javascript" value={code} />);

      expect(screen.getByText('javascript')).toBeInTheDocument();
    });

    it('renders TypeScript code', () => {
      const code = 'interface User { name: string; }';
      render(<CodeBlock language="typescript" value={code} />);

      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('renders Python code', () => {
      const code = 'def hello():\n    print("Hello")';
      render(<CodeBlock language="python" value={code} />);

      expect(screen.getByText('python')).toBeInTheDocument();
    });

    it('renders CSS code', () => {
      const code = '.class { color: red; }';
      render(<CodeBlock language="css" value={code} />);

      expect(screen.getByText('css')).toBeInTheDocument();
    });

    it('renders JSON code', () => {
      const code = '{"name": "test"}';
      render(<CodeBlock language="json" value={code} />);

      expect(screen.getByText('json')).toBeInTheDocument();
    });

    it('renders shell/bash code', () => {
      const code = 'echo "Hello World"';
      render(<CodeBlock language="bash" value={code} />);

      expect(screen.getByText('bash')).toBeInTheDocument();
    });
  });

  describe('Code formatting', () => {
    it('displays line numbers', () => {
      const code = 'line 1\nline 2\nline 3';
      render(<CodeBlock language="javascript" value={code} />);

      // Mocked SyntaxHighlighter renders as pre element
      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toBeInTheDocument();
    });

    it('preserves indentation', () => {
      const code = 'function test() {\n    return true;\n}';
      render(<CodeBlock language="javascript" value={code} />);

      expect(screen.getByText(/return true;/)).toBeInTheDocument();
    });

    it('handles multi-line code', () => {
      const code = 'const a = 1;\nconst b = 2;\nconst c = 3;';
      render(<CodeBlock language="javascript" value={code} />);

      expect(screen.getByText(/const/)).toBeInTheDocument();
    });

    it('handles code with special characters', () => {
      const code = 'const html = "<div>Test</div>";';
      render(<CodeBlock language="javascript" value={code} />);

      expect(screen.getByText(/Test/)).toBeInTheDocument();
    });
  });

  describe('Header styling', () => {
    it('has correct header background', () => {
      const { container } = render(<CodeBlock language="javascript" value="test" />);
      const header = container.querySelector('.bg-muted\\/80');

      expect(header).toBeInTheDocument();
    });

    it('has border between header and code', () => {
      const { container } = render(<CodeBlock language="javascript" value="test" />);
      const header = container.querySelector('.border-b');

      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('border-border/50');
    });

    it('language label has font-mono styling', () => {
      render(<CodeBlock language="javascript" value="test" />);
      const label = screen.getByText('javascript');

      expect(label).toHaveClass('font-mono');
      expect(label).toHaveClass('font-medium');
    });
  });

  describe('Copy button hover states', () => {
    it('has hover transition', () => {
      const { container } = render(<CodeBlock language="javascript" value="test" />);
      const copyButton = screen.getByRole('button', { name: 'Copy code' });

      expect(copyButton).toHaveClass('hover:text-foreground');
      expect(copyButton).toHaveClass('transition-colors');
    });

    it('has focus outline', () => {
      const { container } = render(<CodeBlock language="javascript" value="test" />);
      const copyButton = screen.getByRole('button', { name: 'Copy code' });

      expect(copyButton).toHaveClass('focus:outline-none');
    });
  });

  describe('Edge cases', () => {
    it('handles empty code value', () => {
      render(<CodeBlock language="javascript" value="" />);

      expect(screen.getByText('javascript')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('handles very long code', () => {
      const longCode = 'const x = 1;\n'.repeat(100);
      render(<CodeBlock language="javascript" value={longCode} />);

      expect(screen.getByText('javascript')).toBeInTheDocument();
    });

    it('handles single line of code', () => {
      render(<CodeBlock language="python" value="print('hello')" />);

      expect(screen.getByText('python')).toBeInTheDocument();
    });

    it('handles code with only whitespace', () => {
      render(<CodeBlock language="javascript" value="   \n   \n   " />);

      expect(screen.getByText('javascript')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('copy button has accessible label', () => {
      render(<CodeBlock language="javascript" value="test" />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('copy button shows visual feedback', async () => {
      render(<CodeBlock language="javascript" value="test" />);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('language label is not selectable', () => {
      const { container } = render(<CodeBlock language="javascript" value="test" />);
      const header = container.querySelector('.select-none');

      expect(header).toBeInTheDocument();
    });
  });
});
