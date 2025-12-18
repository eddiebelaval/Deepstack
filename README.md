# DeepStack Trading Platform

**Live: [deepstack.trade](https://deepstack.trade)** | **Version: 2.5.0** | **Updated: December 2024**

> **DISCLAIMER: RESEARCH ONLY. NOT FINANCIAL ADVICE.** DeepStack is a financial research and analysis platform providing data and AI-driven insights for informational purposes only. This platform does NOT execute trades on your behalf. Trading in financial markets involves significant risk.

---

## What is DeepStack?

DeepStack is an **AI-powered trading research platform** that combines conversational AI with professional-grade market tools. Think of it as having a research analyst in your pocket - helping you develop, test, and track your trading ideas with discipline.

### Key Features

| Feature | Description |
|---------|-------------|
| **AI Research Chat** | Claude-powered analysis with 30+ tools for market research, thesis development, and strategy backtesting |
| **Professional Charts** | TradingView-style charts with 30+ indicators, drawing tools, and multi-timeframe analysis |
| **Thesis Engine** | Develop, track, and validate trading hypotheses with live monitoring and validation scores |
| **Trade Journal** | Log trades with emotion tracking, P&L calculation, screenshot capture, and rich text notes |
| **Prediction Markets** | Live odds from Kalshi & Polymarket with thesis linking and event-based betting |
| **Deep Research Hub** | Perplexity AI integration for earnings analysis, SEC filings, and market summaries |
| **Emotional Firewall** | Real-time cognitive state detection - blocks revenge trading and overtrading patterns |
| **Options Suite** | Full options chains, Greeks, multi-leg strategy builder with payoff diagrams |
| **Stock Screener** | Natural language + traditional screeners with fundamentals and technicals |
| **Paper Trading** | Full order simulation with position tracking, P&L, and trade history |
| **Real-time Data** | Live market data via Alpaca Markets with WebSocket streaming |
| **Politicians Tracker** | Track congressional trading activity from SEC filings |
| **Mobile & PWA** | Fully responsive with offline support and swipe navigation |

---

## New in v2.5 (December 2024)

- **Prediction Markets Integration** - Live Kalshi & Polymarket data with thesis linking
- **Deep Research Panel** - Perplexity-powered earnings, SEC, and market analysis
- **Emotional Firewall 2.0** - Real-time pattern detection (revenge trading, overtrading, exhaustion)
- **Interactive Onboarding Tour** - Guided walkthrough for new users
- **Options Strategy Builder** - Visual multi-leg construction with payoff diagrams
- **Watchlist Management** - Multi-watchlist support with import/export
- **Command Palette** - Cmd/Ctrl+K for quick actions
- **Streaming Ticker** - Real-time price bar with market status
- **40+ Dashboard Widgets** - Fully customizable widget-based dashboard
- **Mobile Optimization** - Bottom nav, swipe gestures, pull-to-refresh

---

## Quick Start

### Option 1: Use the Web App (Recommended)
Visit **[deepstack.trade](https://deepstack.trade)** - no installation required!

### Option 2: Run Locally

```bash
# Clone the repo
git clone https://github.com/eddiebe147/Deepstack.git
cd deepstack

# Install backend
pip install -r requirements.txt

# Install frontend
cd web && npm install

# Configure environment
cp env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

### Required API Keys
- **Alpaca Markets** - Market data (get free keys at [alpaca.markets](https://alpaca.markets))
- **Anthropic Claude** - AI analysis (get at [console.anthropic.com](https://console.anthropic.com))
- **Supabase** (optional) - User authentication

---

## Product Tiers

### Free Tier - *The Learning Hook*
- 10 AI queries per 12 hours
- 15-minute delayed market data
- Basic charts with indicators
- 5 watchlist symbols
- 1 active Thesis Engine
- Unlimited Journal entries (basic)
- Basic Emotional Firewall
- Prediction Markets (view only)

### Pro Tier - *The Serious Researcher*
- Unlimited AI queries (including extended thinking)
- Real-time market data
- Advanced charts with all indicators + drawing tools
- Unlimited watchlists with import/export
- Full Screener + NL Screener
- Complete Options Suite with strategy builder
- Unlimited Thesis Engines with validation scores
- Full Trade Journal with TipTap editor + screenshots
- AI Pattern Learning (personalized insights)
- Full Prediction Markets with thesis linking
- Deep Research Hub access
- Priority support

---

## Core Features

### AI Chat & Analysis
- **Multi-provider support**: Claude (Sonnet/Opus), Perplexity
- **30+ analysis tools**: Technical analysis, fundamental research, pattern recognition
- **Extended thinking mode**: Deep reasoning for complex analysis
- **Command palette**: Cmd/Ctrl+K for quick actions
- **Persona selection**: Trading Mentor, Analyst, Risk Manager personas
- **Streaming responses**: Real-time AI output

### Charts & Technical Analysis
- **Multi-series charting**: Candlesticks, bars, lines, area
- **30+ indicators**: RSI, MACD, Bollinger Bands, Volume Profile, and more
- **Drawing tools**: Trendlines, channels, Fibonacci, annotations
- **Timeframe selection**: 1m to Monthly with keyboard shortcuts (1-9)
- **Symbol search**: Autocomplete with asset info
- **Saved drawings**: Persist annotations per symbol

### Thesis Engine
- **Hypothesis tracking**: Entry/exit targets, timeframes, conviction levels
- **Live validation**: Real-time price vs. thesis targets
- **Validation scores**: 0-100 score based on price action
- **Market linking**: Connect theses to prediction markets
- **Journal integration**: Link journal entries to theses

### Trade Journal
- **Rich text editor**: TipTap/ProseMirror with full formatting
- **Emotion tracking**: Log emotional state per trade
- **P&L calculation**: Automatic profit/loss computation
- **Screenshot capture**: Attach chart screenshots
- **Thesis linking**: Connect entries to theses
- **Pattern analysis**: AI discovers behavioral patterns

### Prediction Markets
- **Multi-platform**: Kalshi and Polymarket integration
- **Live odds**: Real-time probability updates
- **Market types**: Binary, multi-outcome, scalar markets
- **Thesis linking**: Connect markets to investment theses
- **Event cards**: Calendar-based event betting
- **Search**: Find markets by topic or keyword

### Emotional Firewall
- **Pattern detection**: Revenge trading, overtrading, emotional exhaustion
- **Real-time checks**: Pre-trade cognitive state assessment
- **Decision fitness**: Score-based trading readiness
- **Cooldown periods**: Automatic trading pauses after losses
- **Journal prompts**: Encourages reflection during high-risk states

### Options Analysis
- **Options chains**: Full chain data with Greeks
- **Strategy builder**: Multi-leg visual construction
- **Payoff diagrams**: P&L visualization at expiration
- **Greeks analysis**: Delta, Gamma, Theta, Vega, Rho
- **Screener**: Filter options by criteria

### Deep Research Hub
- **Perplexity integration**: AI-powered research synthesis
- **Earnings analysis**: Transcript summaries and key takeaways
- **SEC filings**: 10-K, 10-Q, 8-K analysis
- **Company profiles**: Comprehensive business summaries
- **Market summaries**: Daily/weekly market recaps

---

## Architecture

```
+-----------------------------------------------------------------------------+
|                          DeepStack Architecture                              |
+-----------------------------------------------------------------------------+
|  Frontend (Next.js 15 + React 19)                                           |
|  +-- /app           - Main trading interface with panels                    |
|  +-- /chat          - AI conversation interface                             |
|  +-- /journal       - Trade Journal with TipTap editor                      |
|  +-- /thesis        - Thesis Engine with validation                         |
|  +-- /insights      - AI Pattern Learning dashboard                         |
|  +-- /dashboard     - Customizable widget dashboard                         |
+-----------------------------------------------------------------------------+
|  API Routes (Edge Runtime)                                                  |
|  +-- /api/chat              - AI streaming with tool execution              |
|  +-- /api/market/*          - Alpaca proxy (quotes, bars, assets)           |
|  +-- /api/prediction-markets - Kalshi/Polymarket integration                |
|  +-- /api/perplexity/*      - Deep research (earnings, SEC, profiles)       |
|  +-- /api/options/*         - Options chains and strategies                 |
|  +-- /api/emotional-firewall - Cognitive state assessment                   |
|  +-- /api/politicians/*     - Congressional trading data                    |
+-----------------------------------------------------------------------------+
|  Backend (Python FastAPI)                                                   |
|  +-- api_server.py  - Main API server with WebSocket                        |
|  +-- core/          - Trading core, risk management, strategies             |
|  +-- orchestrator/  - Multi-strategy orchestration                          |
+-----------------------------------------------------------------------------+
|  State Management (Zustand + Persist)                                       |
|  +-- 23 stores      - Chat, trading, positions, thesis, journal, etc.       |
|  +-- WebSocket      - Real-time market data streaming                       |
|  +-- LocalStorage   - Offline persistence                                   |
+-----------------------------------------------------------------------------+
|  External Services                                                          |
|  +-- Alpaca         - Market data, quotes, bars                             |
|  +-- Anthropic      - Claude AI (Sonnet, Opus)                              |
|  +-- Perplexity     - Research synthesis                                    |
|  +-- Kalshi         - Prediction markets                                    |
|  +-- Polymarket     - Prediction markets                                    |
|  +-- Supabase       - Authentication, database                              |
+-----------------------------------------------------------------------------+
```

---

## Project Structure

```
deepstack/
+-- web/                          # Next.js frontend
|   +-- src/
|   |   +-- app/                  # App router pages
|   |   |   +-- api/              # 40+ API routes
|   |   |   +-- (app)/            # Main app routes
|   |   |   +-- (marketing)/      # Landing, pricing
|   |   +-- components/           # 150+ React components
|   |   |   +-- chat/             # AI chat interface
|   |   |   +-- charts/           # TradingView-style charts
|   |   |   +-- trading/          # Trading panels & widgets
|   |   |   +-- prediction-markets/ # Kalshi/Polymarket
|   |   |   +-- options/          # Options analysis
|   |   |   +-- journal/          # Trade journal
|   |   |   +-- thesis/           # Thesis engine
|   |   |   +-- emotional-firewall/ # Trading psychology
|   |   |   +-- onboarding/       # Tour & welcome
|   |   |   +-- layout/           # App layout
|   |   |   +-- dashboard/        # Widget dashboard
|   |   |   +-- ui/               # Shadcn primitives
|   |   +-- lib/
|   |   |   +-- stores/           # 23 Zustand stores
|   |   |   +-- llm/              # AI provider configs
|   |   +-- hooks/                # 57 custom hooks
+-- core/                         # Python trading core
|   +-- api/                      # API routers
|   +-- broker/                   # Broker integrations
|   +-- risk/                     # Risk management
|   +-- strategies/               # Trading strategies
|   +-- data/                     # Data providers
+-- tests/                        # Test suites
+-- docs/                         # Documentation
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 3.4, Shadcn UI |
| **Charts** | Recharts, Lightweight Charts, custom components |
| **Rich Text** | TipTap (ProseMirror) |
| **State** | Zustand with persistence (23 stores) |
| **AI** | Anthropic Claude, Perplexity |
| **Backend** | Python 3.11, FastAPI, WebSockets |
| **Data** | Alpaca Markets, Kalshi, Polymarket |
| **Auth** | Supabase Auth |
| **Database** | Supabase (PostgreSQL) |
| **Hosting** | Vercel (frontend), Railway (backend) |

---

## Environment Variables

```bash
# Required
ALPACA_API_KEY=your_alpaca_key
ALPACA_SECRET_KEY=your_alpaca_secret
ANTHROPIC_API_KEY=your_claude_key

# Optional - Enhanced Features
PERPLEXITY_API_KEY=your_perplexity_key    # Deep Research Hub
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| AI Chat | Production | Multi-provider, 30+ tools, streaming |
| Charts | Production | Real-time, 30+ indicators, drawings |
| Trade Journal | Production | TipTap, emotions, screenshots, P&L |
| Thesis Engine | Production | Live validation, scoring, market linking |
| Prediction Markets | Production | Kalshi + Polymarket integration |
| Deep Research | Production | Perplexity-powered analysis |
| Emotional Firewall | Production | Real-time pattern detection |
| Options Suite | Production | Chains, Greeks, strategy builder |
| Screener | Production | NL + traditional, Alpaca data |
| Paper Trading | Production | Full simulation, positions, history |
| Politicians Tracker | Production | Congressional trades |
| News/Calendar | Production | Aggregated feeds |
| Onboarding Tour | Production | Interactive 6-step guide |
| Mobile/PWA | Production | Responsive, offline support |
| Auth | Beta | Supabase integration |
| Payments | Planned | Stripe integration |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `1-9` | Switch chart timeframes |
| `?` | Show all shortcuts |
| `Shift + Tab` | Open commands (in chat) |
| `Enter` | Send message |
| `Shift + Enter` | New line in chat |

---

## Safety & Compliance

- **Disclaimer Banner**: Persistent "Not Financial Advice" warning on every page
- **Emotional Firewall**: AI-powered pattern detection blocks impulsive trades
- **Privacy First**: Pattern data never shared or sold
- **No Trade Execution**: Research only - we never execute real trades
- **Circuit Breakers**: Automatic halts on extreme conditions
- **Data Encryption**: All sensitive data encrypted at rest and in transit

---

## Testing

```bash
# Backend tests
pytest tests/

# With coverage
pytest --cov=core tests/

# Frontend type checking
cd web && npm run build

# E2E tests (Playwright)
npm run test:e2e

# Lint
npm run lint
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use TypeScript strict mode
- Follow existing component patterns
- Add tests for new features
- Update documentation

---

## License

MIT License - See [LICENSE](LICENSE) file.

---

## Full Disclaimer

**DISCLAIMER: RESEARCH ONLY. NOT FINANCIAL ADVICE.**

DeepStack is a financial research and analysis platform providing data and AI-driven insights for **informational purposes only**.

- **No Trade Execution**: This platform does NOT execute trades on your behalf.
- **Risk Warning**: Trading in financial markets involves significant risk. You may lose some or all of your investment.
- **Not a Recommendation**: Nothing on this platform constitutes a recommendation to buy, sell, or hold any security.
- **Seek Professional Advice**: Consult a qualified financial advisor before making any investment decisions.
- **AI Limitations**: AI can hallucinate. Verify all data independently.

The developers of DeepStack are not responsible for any financial losses incurred through the use of this software.

---

## Acknowledgments

Built with:
- [Anthropic Claude](https://anthropic.com) - AI reasoning
- [Perplexity](https://perplexity.ai) - Research synthesis
- [Alpaca Markets](https://alpaca.markets) - Market data
- [Kalshi](https://kalshi.com) - Prediction markets
- [Polymarket](https://polymarket.com) - Prediction markets
- [Vercel](https://vercel.com) - Frontend hosting
- [Railway](https://railway.app) - Backend hosting
- [Supabase](https://supabase.com) - Auth & database
- [Shadcn UI](https://ui.shadcn.com) - UI components
- [TipTap](https://tiptap.dev) - Rich text editor

---

**Built for disciplined traders who want an edge**

*Last updated: December 17, 2024*
