"use client"

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolUseCard } from './ToolUseCard';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';

type Message = any; // import { Message } from '@ai-sdk/react';

type MessageBubbleProps = {
  message: Message;
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
      <div className="flex justify-end mb-6">
        <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-8 w-full">
      <div className="w-full max-w-4xl">
        <div className="prose prose-sm dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:mb-3 prose-headings:mt-6
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-p:leading-7 prose-p:mb-4
          prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
          prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
          prose-li:my-1.5
          prose-strong:font-semibold
          prose-blockquote:border-l-4 prose-blockquote:border-primary/20 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
          prose-table:w-full prose-table:my-6 prose-table:border-collapse prose-table:border prose-table:border-border/50 prose-table:rounded-lg prose-table:overflow-hidden
          prose-th:bg-muted/50 prose-th:p-3 prose-th:text-left prose-th:font-medium prose-th:border-b prose-th:border-border/50
          prose-td:p-3 prose-td:border-b prose-td:border-border/50 last:prose-td:border-0
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-code:px-1.5 prose-code:py-0.5 prose-code:bg-muted prose-code:rounded-md prose-code:font-mono prose-code:text-xs prose-code:before:content-[''] prose-code:after:content-['']
        ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <CodeBlock
                    language={match[1]}
                    value={String(children).replace(/\n$/, '')}
                    className="not-prose"
                    {...props}
                  />
                ) : (
                  <code className={cn("bg-muted px-1.5 py-0.5 rounded-md font-mono text-sm", className)} {...props}>
                    {children}
                  </code>
                );
              },
              table({ children }) {
                return (
                  <div className="my-6 w-full overflow-y-auto rounded-lg border border-border/50 shadow-sm">
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
          <div className="mt-6 space-y-3">
            {message.toolInvocations.map((tool: any, idx: number) => (
              <ToolUseCard key={idx} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
