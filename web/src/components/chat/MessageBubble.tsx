"use client"

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolUseCard } from './ToolUseCard';
import { CodeBlock } from './CodeBlock';
import { ThinkingBlock } from './ThinkingBlock';
import { CalloutBlock, extractAlertType, type CalloutType } from './CalloutBlock';
import { cn } from '@/lib/utils';

type Message = any; // import { Message } from '@ai-sdk/react';

type MessageBubbleProps = {
  message: Message & { thinking?: string };
};

// Strip XML tool tags from message content (e.g., <get_quote>, <search_news>, etc.)
function stripToolTags(content: string): string {
  if (!content) return '';

  // Remove self-closing and paired XML-style tool tags
  // Matches patterns like: <get_quote> ... </get_quote> or <tool_name attr="value"> ... </tool_name>
  const toolTagPattern = /<(get_quote|search_news|get_bars|place_order|get_portfolio|analyze_chart|get_positions|execute_trade|cancel_order|get_account)[^>]*>[\s\S]*?<\/\1>/gi;

  // Also remove any standalone opening tags that might be incomplete (during streaming)
  const incompleteTagPattern = /<(get_quote|search_news|get_bars|place_order|get_portfolio|analyze_chart|get_positions|execute_trade|cancel_order|get_account)[^>]*>(?![^<]*<\/\1>)/gi;

  let cleaned = content.replace(toolTagPattern, '');
  cleaned = cleaned.replace(incompleteTagPattern, '');

  // Clean up extra whitespace/newlines left behind
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-8">
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl max-w-[85%] shadow-md">
          <div className="text-[15px] whitespace-pre-wrap leading-relaxed">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-10 w-full">
      <div className="w-full max-w-4xl">
        {/* Thinking Block - if present */}
        {message.thinking && (
          <ThinkingBlock content={message.thinking} defaultExpanded={false} />
        )}

        <div className="text-foreground text-[15px] leading-7 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1({ children }) {
                return <h1 className="text-2xl font-bold my-6 first:mt-0 text-foreground">{children}</h1>;
              },
              h2({ children }) {
                return <h2 className="text-xl font-bold my-5 text-foreground border-b border-border/30 pb-3">{children}</h2>;
              },
              h3({ children }) {
                return <h3 className="text-lg font-bold my-4 text-foreground">{children}</h3>;
              },
              h4({ children }) {
                return <h4 className="text-base font-semibold my-3 text-foreground/90">{children}</h4>;
              },
              p({ children }) {
                return <p className="my-4 leading-7 text-foreground/90">{children}</p>;
              },
              ul({ children }) {
                return <ul className="list-disc list-outside ml-6 my-4 space-y-2 text-foreground/90">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal list-outside ml-6 my-4 space-y-2 text-foreground/90">{children}</ol>;
              },
              li({ children }) {
                return <li className="leading-7 pl-1 text-foreground/90">{children}</li>;
              },
              strong({ children }) {
                return <strong className="font-bold text-foreground">{children}</strong>;
              },
              em({ children }) {
                return <em className="italic text-foreground/70">{children}</em>;
              },
              blockquote({ children }) {
                // Check for GitHub-style alerts: > [!NOTE], > [!TIP], etc.
                const alertInfo = extractAlertType(children);
                if (alertInfo) {
                  return <CalloutBlock type={alertInfo.type}>{alertInfo.content}</CalloutBlock>;
                }
                // Regular blockquote - Claude/id8composer style
                return (
                  <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-foreground/70 bg-primary/5 py-2 rounded-r">
                    {children}
                  </blockquote>
                );
              },
              hr() {
                return <hr className="my-6 border-t-2 border-border/30" />;
              },
              code({ inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <CodeBlock
                    language={match[1]}
                    value={String(children).replace(/\n$/, '')}
                    className="not-prose"
                    {...props}
                  />
                ) : (
                  <code
                    className={cn(
                      "bg-muted/70 px-1.5 py-0.5 rounded font-mono text-[13px] text-primary/90",
                      className
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              table({ children }) {
                return (
                  <div className="my-6 w-full overflow-x-auto rounded-lg border border-border/50 shadow-sm bg-card/30">
                    <table className="w-full text-sm border-collapse">
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children }) {
                return (
                  <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                    {children}
                  </thead>
                );
              },
              tbody({ children }) {
                return (
                  <tbody className="[&>tr:nth-child(even)]:bg-muted/20 [&>tr:hover]:bg-muted/40 transition-colors">
                    {children}
                  </tbody>
                );
              },
              tr({ children }) {
                return (
                  <tr className="border-b border-border/30 last:border-0">
                    {children}
                  </tr>
                );
              },
              th({ children }) {
                return (
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider border-b border-border/50">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                // Check if content looks like a number or percentage for special styling
                const content = String(children);
                const isPositive = /^\+/.test(content) || /^[0-9.]+%$/.test(content) && parseFloat(content) > 0;
                const isNegative = /^-/.test(content);
                const isNumeric = /^[+-]?[\d,$]+\.?\d*%?$/.test(content.replace(/,/g, ''));

                return (
                  <td className={cn(
                    "px-4 py-3 border-b border-border/30 last:border-0",
                    isNumeric && "font-mono tabular-nums text-right",
                    isPositive && "text-green-500",
                    isNegative && "text-red-500"
                  )}>
                    {children}
                  </td>
                );
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline decoration-primary/30 underline-offset-2 transition-all"
                  >
                    {children}
                  </a>
                );
              },
              // Task list support (- [ ] or - [x])
              input({ checked, ...props }) {
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled
                    className={cn(
                      "mr-2 h-4 w-4 rounded border-border accent-primary pointer-events-none",
                      checked && "bg-primary"
                    )}
                    {...props}
                  />
                );
              },
            }}
          >
            {stripToolTags(message.content)}
          </ReactMarkdown>
        </div>

        {/* Tool calls */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="mt-8 space-y-4">
            {message.toolInvocations.map((tool: any, idx: number) => (
              <ToolUseCard key={idx} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
