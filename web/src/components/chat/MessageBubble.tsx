"use client"

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolUseCard } from './ToolUseCard';
import { CodeBlock } from './CodeBlock';
import { ThinkingBlock } from './ThinkingBlock';
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
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
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

        <div className="text-foreground/90 text-[15px] leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1({ children }) {
                return <h1 className="text-xl font-semibold mb-4 mt-0 text-foreground tracking-tight">{children}</h1>;
              },
              h2({ children }) {
                return <h2 className="text-lg font-semibold mt-8 mb-4 pb-2 border-b border-border/30 text-foreground tracking-tight">{children}</h2>;
              },
              h3({ children }) {
                return <h3 className="text-base font-medium mt-6 mb-3 text-foreground">{children}</h3>;
              },
              p({ children }) {
                return <p className="mb-4 leading-[1.75]">{children}</p>;
              },
              ul({ children }) {
                return <ul className="my-4 ml-5 space-y-2 list-disc">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="my-4 ml-5 space-y-2 list-decimal">{children}</ol>;
              },
              li({ children }) {
                return <li className="leading-[1.7] pl-1">{children}</li>;
              },
              strong({ children }) {
                return <strong className="font-semibold text-foreground">{children}</strong>;
              },
              blockquote({ children }) {
                return <blockquote className="border-l-2 border-muted-foreground/30 pl-4 my-6 text-muted-foreground">{children}</blockquote>;
              },
              hr() {
                return <hr className="my-8 border-border/20" />;
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
                  <code className={cn("bg-muted px-1.5 py-0.5 rounded font-mono text-[13px]", className)} {...props}>
                    {children}
                  </code>
                );
              },
              table({ children }) {
                return (
                  <div className="my-6 w-full overflow-y-auto scrollbar-hide rounded-lg border border-border/50 shadow-sm">
                    <table className="w-full text-sm">
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children }) {
                return <thead className="bg-muted/50 text-muted-foreground font-medium">{children}</thead>;
              },
              th({ children }) {
                return <th className="px-4 py-3 text-left font-medium border-b border-border/50">{children}</th>;
              },
              td({ children }) {
                return <td className="px-4 py-3 border-b border-border/50 last:border-0">{children}</td>;
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
              }
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
