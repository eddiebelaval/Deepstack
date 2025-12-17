'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * ResearchMarkdown - Styled markdown renderer for Perplexity research content
 *
 * Renders markdown with proper styling for:
 * - Tables (financial data, metrics)
 * - Lists (key points, highlights)
 * - Headers (sections)
 * - Numbers (positive/negative coloring)
 */

interface ResearchMarkdownProps {
  content: string;
  className?: string;
}

export function ResearchMarkdown({ content, className }: ResearchMarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1({ children }) {
            return (
              <h1 className="text-xl font-bold mt-6 mb-3 first:mt-0 text-foreground border-b border-border/30 pb-2">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-lg font-bold mt-5 mb-2 text-foreground">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base font-semibold mt-4 mb-2 text-foreground/90">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-sm font-semibold mt-3 mb-1.5 text-foreground/80">
                {children}
              </h4>
            );
          },

          // Paragraphs
          p({ children }) {
            return (
              <p className="my-2.5 text-sm leading-relaxed text-foreground/85">
                {children}
              </p>
            );
          },

          // Lists
          ul({ children }) {
            return (
              <ul className="list-none ml-0 my-3 space-y-1.5">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-outside ml-5 my-3 space-y-1.5">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return (
              <li className="text-sm leading-relaxed text-foreground/85 flex items-start gap-2">
                <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                <span>{children}</span>
              </li>
            );
          },

          // Emphasis
          strong({ children }) {
            return (
              <strong className="font-semibold text-foreground">
                {children}
              </strong>
            );
          },
          em({ children }) {
            return (
              <em className="italic text-foreground/70">
                {children}
              </em>
            );
          },

          // Tables - Key for financial data
          table({ children }) {
            return (
              <div className="my-4 w-full overflow-x-auto rounded-lg border border-border/40 bg-card/50">
                <table className="w-full text-xs border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-muted/50 text-muted-foreground">
                {children}
              </thead>
            );
          },
          tbody({ children }) {
            return (
              <tbody className="[&>tr:nth-child(even)]:bg-muted/20 [&>tr:hover]:bg-muted/30 transition-colors">
                {children}
              </tbody>
            );
          },
          tr({ children }) {
            return (
              <tr className="border-b border-border/20 last:border-0">
                {children}
              </tr>
            );
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wide border-b border-border/40 text-muted-foreground">
                {children}
              </th>
            );
          },
          td({ children }) {
            // Smart detection for financial values
            const content = String(children);
            const isPositive = /^\+/.test(content) || (content.endsWith('%') && parseFloat(content) > 0);
            const isNegative = /^-/.test(content) || (content.endsWith('%') && parseFloat(content) < 0);
            const isNumeric = /^[+-]?[$]?[\d,]+\.?\d*[%BMK]?$/i.test(content.trim());

            return (
              <td className={cn(
                'px-3 py-2 text-xs',
                isNumeric && 'font-mono tabular-nums',
                isPositive && 'text-green-500',
                isNegative && 'text-red-500',
                !isPositive && !isNegative && 'text-foreground/80'
              )}>
                {children}
              </td>
            );
          },

          // Blockquotes - for highlights
          blockquote({ children }) {
            return (
              <blockquote className="border-l-3 border-primary/50 pl-3 my-3 text-sm italic text-foreground/70 bg-primary/5 py-2 rounded-r">
                {children}
              </blockquote>
            );
          },

          // Horizontal rules
          hr() {
            return <hr className="my-4 border-t border-border/30" />;
          },

          // Code (inline)
          code({ className, children, ...props }) {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono text-primary/90"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            // Code blocks
            return (
              <code
                className={cn('block bg-muted/40 p-3 rounded-lg text-xs font-mono overflow-x-auto', className)}
                {...props}
              >
                {children}
              </code>
            );
          },

          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2 text-xs"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default ResearchMarkdown;
