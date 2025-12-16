import { vi } from 'vitest';

// Mock Prism SyntaxHighlighter
export const Prism = ({ children, language, ...props }: any) => {
  return (
    <pre data-language={language} className="react-syntax-highlighter" {...props}>
      <code>{children}</code>
    </pre>
  );
};

// Mock styles
export const oneDark = {};

// Default export
export default Prism;
