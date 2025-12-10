import { Briefcase, LineChart, TrendingUp, Target } from 'lucide-react';

export const PRESETS = [
    {
        prompt: "Analyze my portfolio",
        icon: Briefcase,
        desc: "Performance and risk",
        label: "Portfolio"
    },
    {
        prompt: "Show me SPY chart",
        icon: LineChart,
        desc: "Real-time with indicators",
        label: "Charts"
    },
    {
        prompt: "What's moving today?",
        icon: TrendingUp,
        desc: "Volume leaders",
        label: "Market Movers"
    },
    {
        prompt: "Find asymmetric setups",
        icon: Target,
        desc: "Risk/reward plays",
        label: "Trade Setups"
    },
];
