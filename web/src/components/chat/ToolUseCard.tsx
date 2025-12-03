"use client"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ToolUseCardProps = {
  tool: any; // ToolInvocation type from AI SDK
};

export function ToolUseCard({ tool }: ToolUseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolIcon = (toolName: string) => {
    const icons: Record<string, string> = {
      get_quote: '📊',
      get_positions: '💼',
      analyze_stock: '🔍',
      place_order: '📝',
      calculate_position_size: '📐',
      get_chart_data: '📈',
      search_news: '📰',
    };
    return icons[toolName] || '🔧';
  };

  const getToolDisplayName = (toolName: string) => {
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="p-3 bg-muted/50">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-lg">{getToolIcon(tool.toolName)}</span>
        <span className="font-medium text-sm">{getToolDisplayName(tool.toolName)}</span>

        {tool.state === 'result' && (
          <span className="ml-auto text-xs text-green-600 dark:text-green-400">
            ✓ Complete
          </span>
        )}
        {tool.state === 'call' && (
          <span className="ml-auto text-xs text-yellow-600 dark:text-yellow-400">
            ⏳ Running...
          </span>
        )}

        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2 text-xs">
          <div>
            <div className="font-medium text-muted-foreground mb-1">Input:</div>
            <pre className="bg-background p-2 rounded overflow-x-auto">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          </div>

          {tool.state === 'result' && tool.result && (
            <div>
              <div className="font-medium text-muted-foreground mb-1">Output:</div>
              <pre className="bg-background p-2 rounded overflow-x-auto max-h-[200px]">
                {JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
