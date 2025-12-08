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
  Loader2,
  TrendingUp,
  Bell,
  Calendar,
  LayoutGrid,
  Shield,
  Target,
  PanelTop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ToolUseCardProps = {
  tool: any; // ToolInvocation type from AI SDK
};

// Tool icon mapping
const toolIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  get_quote: BarChart3,
  get_positions: Briefcase,
  analyze_stock: Search,
  place_order: FileText,
  place_paper_trade: TrendingUp,
  calculate_position_size: Calculator,
  get_chart_data: LineChart,
  search_news: Newspaper,
  show_chart: LineChart,
  show_portfolio: Briefcase,
  show_orders: FileText,
  show_screener: LayoutGrid,
  show_alerts: Bell,
  show_calendar: Calendar,
  show_news: Newspaper,
  show_deep_value: Target,
  show_hedged_positions: Shield,
  show_options_screener: LayoutGrid,
  show_options_builder: PanelTop,
};

// Tool-specific loading messages
const toolLoadingMessages: Record<string, string> = {
  get_quote: 'Fetching real-time quote...',
  get_positions: 'Loading portfolio positions...',
  analyze_stock: 'Analyzing stock fundamentals and technicals...',
  place_order: 'Checking risk parameters and creating order...',
  place_paper_trade: 'Executing paper trade...',
  calculate_position_size: 'Calculating optimal position size...',
  get_chart_data: 'Loading historical price data...',
  search_news: 'Searching market news...',
  show_chart: 'Opening chart panel...',
  show_portfolio: 'Opening portfolio view...',
  show_orders: 'Opening order entry...',
  show_screener: 'Opening stock screener...',
  show_alerts: 'Opening price alerts...',
  show_calendar: 'Opening market calendar...',
  show_news: 'Opening news panel...',
  show_deep_value: 'Opening Deep Value screener...',
  show_hedged_positions: 'Opening Hedged Positions builder...',
  show_options_screener: 'Opening options screener...',
  show_options_builder: 'Opening strategy builder...',
};

// Get symbol from tool args if available
function getSymbolFromArgs(args: any): string | null {
  if (args?.symbol) return args.symbol.toUpperCase();
  if (args?.query) return null;
  return null;
}

export function ToolUseCard({ tool }: ToolUseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const IconComponent = toolIconMap[tool.toolName] || Wrench;
  const loadingMessage = toolLoadingMessages[tool.toolName] || 'Processing...';
  const symbol = getSymbolFromArgs(tool.args);

  const getToolDisplayName = (toolName: string) => {
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Check if result indicates mock data
  const isMockData = tool.result?.mock === true || tool.result?.data?.mock === true;

  return (
    <Card className="p-2.5 bg-muted/50">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <IconComponent className="h-3.5 w-3.5" />
        <span className="font-medium text-sm">
          {getToolDisplayName(tool.toolName)}
          {symbol && <span className="text-primary ml-1">{symbol}</span>}
        </span>

        {tool.state === 'result' && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3 w-3" />
            {isMockData ? 'Complete (Demo)' : 'Complete'}
          </span>
        )}
        {tool.state === 'call' && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">{loadingMessage}</span>
            <span className="sm:hidden">Running...</span>
          </span>
        )}
        {tool.state === 'partial-call' && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Preparing...</span>
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
            <pre className="bg-background p-2 rounded overflow-x-auto scrollbar-hide">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          </div>

          {tool.state === 'result' && tool.result && (
            <div>
              <div className="font-medium text-muted-foreground mb-1 flex items-center gap-2">
                Output:
                {isMockData && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                    Demo Data
                  </span>
                )}
              </div>
              <pre className="bg-background p-2 rounded overflow-x-auto max-h-[200px] scrollbar-hide">
                {JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
