"use client"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  ChevronDown,
  ChevronRight,
  BarChart3,
  Briefcase,
  Search,
  FileText,
  Calculator,
  LineChart,
  Newspaper,
  Wrench,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ToolUseCardProps = {
  tool: any; // ToolInvocation type from AI SDK
};

const toolIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  get_quote: BarChart3,
  get_positions: Briefcase,
  analyze_stock: Search,
  place_order: FileText,
  calculate_position_size: Calculator,
  get_chart_data: LineChart,
  search_news: Newspaper,
};

export function ToolUseCard({ tool }: ToolUseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const IconComponent = toolIconMap[tool.toolName] || Wrench;

  const getToolDisplayName = (toolName: string) => {
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="p-2.5 bg-muted/50">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <IconComponent className="h-3.5 w-3.5" />
        <span className="font-medium text-sm">{getToolDisplayName(tool.toolName)}</span>

        {tool.state === 'result' && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3 w-3" /> Complete
          </span>
        )}
        {tool.state === 'call' && (
          <span className="ml-auto flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Running...
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
