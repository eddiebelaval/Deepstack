# 🔥 DeepStack Trading Platform

**🌐 Live: [deepstack.trade](https://deepstack.trade)** | **📦 Version: 2.0.0** | **📅 Updated: December 2024**

> **DISCLAIMER: RESEARCH ONLY. NOT FINANCIAL ADVICE.** DeepStack is a financial research and analysis platform providing data and AI-driven insights for informational purposes only. This platform does NOT execute trades on your behalf. Trading in financial markets involves significant risk.

---

## 🎯 What is DeepStack?

DeepStack is an **AI-powered trading research platform** that combines conversational AI with professional-grade market tools. Think of it as having a research analyst in your pocket – helping you develop, test, and track your trading ideas with discipline.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Research Chat** | Claude-powered analysis for market research, thesis development, and strategy backtesting |
| 📊 **Professional Charts** | TradingView-style charts with advanced indicators and symbol search |
| 💡 **Thesis Engine** | Develop, track, and validate trading hypotheses with live monitoring |
| 📔 **Trade Journal** | Log trades with emotion tracking, P&L calculation, and rich notes |
| 🧠 **AI Pattern Learning** | Discover patterns in your trading behavior (with privacy controls) |
| 📈 **Real-time Data** | Live market data via Alpaca Markets (15m delayed on Free tier) |
| 🔍 **Stock Screener** | Filter stocks by fundamentals, technicals, and custom criteria |
| ⚡ **Options Analysis** | Options chains, Greeks, and strategy builders |
| 🛡️ **Emotional Firewall** | AI-powered check before impulsive trades |

---

## 🚀 Quick Start

### Option 1: Use the Web App (Recommended)
Visit **[deepstack.trade](https://deepstack.trade)** – no installation required!

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
- **Alpaca Markets** – Market data (get free keys at [alpaca.markets](https://alpaca.markets))
- **Anthropic Claude** – AI analysis (get at [console.anthropic.com](https://console.anthropic.com))
- **Supabase** (optional) – User authentication

---

## 💎 Product Tiers

### 🆓 Free Tier – *The Learning Hook*
- ✅ 10 AI queries per 12 hours
- ✅ 15-minute delayed market data
- ✅ Basic charts
- ✅ 5 watchlist symbols
- ✅ 1 active Thesis Engine
- ✅ Unlimited Journal entries (basic)
- ✅ Basic Emotional Firewall

### 💰 Pro Tier – *The Serious Researcher*
- ✅ Unlimited AI queries (including advanced reasoning)
- ✅ Real-time market data
- ✅ Advanced charts with all indicators
- ✅ Unlimited watchlists
- ✅ Full Screener + custom filters
- ✅ Complete Options Suite
- ✅ Unlimited Thesis Engines
- ✅ Full Trade Journal with TipTap editor
- ✅ AI Pattern Learning (personalized insights)
- ✅ Priority support

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DeepStack Architecture                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 16 + React)                                              │
│  ├── /chat          – AI conversation interface                             │
│  ├── /journal       – Trade Journal with TipTap editor                      │
│  ├── /thesis        – Thesis Engine with live monitoring                    │
│  ├── /insights      – AI Pattern Learning dashboard                         │
│  └── /dashboard     – Charts, Screener, News, Calendar                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  API Routes (Edge Runtime)                                                  │
│  ├── /api/chat      – AI streaming with multi-provider support              │
│  ├── /api/market/*  – Alpaca proxy (quotes, bars, assets)                   │
│  ├── /api/journal   – CRUD for journal entries                              │
│  ├── /api/thesis    – CRUD for thesis tracking                              │
│  └── /api/options/* – Options chains and strategies                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Backend (Python FastAPI)                                                   │
│  ├── market_api.py  – Alpaca integration                                    │
│  ├── core/          – Trading strategies & risk management                  │
│  └── cli/           – Terminal interface                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  State Management (Zustand + Persist)                                       │
│  ├── chat-store     – Conversations & messages                              │
│  ├── journal-store  – Trade journal entries                                 │
│  ├── thesis-store   – Trading theses                                        │
│  ├── pattern-store  – AI-discovered patterns                                │
│  └── quota-store    – Tier limits & usage tracking                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
deepstack/
├── web/                      # Next.js frontend
│   ├── src/
│   │   ├── app/              # App router pages
│   │   │   ├── api/          # API routes
│   │   │   ├── chat/         # Main chat interface
│   │   │   ├── journal/      # Trade Journal
│   │   │   ├── thesis/       # Thesis Engine
│   │   │   └── insights/     # AI Insights
│   │   ├── components/       # React components
│   │   │   ├── chat/         # Chat UI components
│   │   │   ├── charts/       # TradingView-style charts
│   │   │   ├── journal/      # Journal components
│   │   │   ├── thesis/       # Thesis components
│   │   │   └── ui/           # Shadcn UI primitives
│   │   └── lib/              # Utilities & stores
│   │       ├── stores/       # Zustand state management
│   │       └── llm/          # AI provider configs
├── core/                     # Python trading core
│   ├── broker/               # Broker integrations
│   ├── risk/                 # Risk management
│   └── strategies/           # Trading strategies
├── cli/                      # Terminal interface
├── docs/                     # Documentation
└── tests/                    # Test suites
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS, Shadcn UI |
| **Charts** | Recharts, custom MultiSeriesChart |
| **Rich Text** | TipTap (ProseMirror) |
| **State** | Zustand with persistence |
| **AI** | Anthropic Claude, OpenAI, Google Gemini |
| **Backend** | Python FastAPI |
| **Data** | Alpaca Markets API |
| **Auth** | Supabase |
| **Hosting** | Vercel (frontend), Railway (backend) |

---

## 🔐 Environment Variables

```bash
# Required
ALPACA_API_KEY=your_alpaca_key
ALPACA_SECRET_KEY=your_alpaca_secret
ANTHROPIC_API_KEY=your_claude_key

# Optional
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_gemini_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

---

## 🧪 Testing

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=core tests/

# Frontend type checking
cd web && npm run build

# E2E tests (requires running dev server)
npm run test:e2e
```

---

## 📊 Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| AI Chat | ✅ Production | Multi-provider, streaming |
| Charts | ✅ Production | Real-time, symbol search |
| Trade Journal | ✅ Production | TipTap, emotions, P&L |
| Thesis Engine | ✅ Production | Live monitoring, validation |
| AI Insights | ✅ Production | Pattern analysis, privacy |
| Options | ✅ Production | Chains, strategies |
| Screener | ✅ Production | Real data via Alpaca |
| News/Calendar | ✅ Production | Real data |
| Auth | 🟡 Beta | Supabase integration |
| Payments | 🔴 Planned | Stripe integration |

---

## 🛡️ Safety & Compliance

- **Disclaimer Banner**: Persistent "Not Financial Advice" warning on every page
- **Emotional Firewall**: AI-powered pause before impulsive trades
- **Privacy First**: Pattern data never shared or sold
- **No Trade Execution**: Research only – we never execute trades
- **Circuit Breakers**: Automatic halts on extreme conditions

---

## 🤝 Contributing

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

## 📜 License

MIT License – See [LICENSE](LICENSE) file.

---

## ⚠️ Full Disclaimer

**DISCLAIMER: RESEARCH ONLY. NOT FINANCIAL ADVICE.**

DeepStack is a financial research and analysis platform providing data and AI-driven insights for **informational purposes only**.

- **No Trade Execution**: This platform does NOT execute trades on your behalf.
- **Risk Warning**: Trading in financial markets involves significant risk. You may lose some or all of your investment.
- **Not a Recommendation**: Nothing on this platform constitutes a recommendation to buy, sell, or hold any security.
- **Seek Professional Advice**: Consult a qualified financial advisor before making any investment decisions.
- **AI Limitations**: AI can hallucinate. Verify all data independently.

The developers of DeepStack are not responsible for any financial losses incurred through the use of this software.

---

## 🙏 Acknowledgments

Built with:
- [Anthropic Claude](https://anthropic.com) – AI reasoning
- [Alpaca Markets](https://alpaca.markets) – Market data
- [Vercel](https://vercel.com) – Hosting
- [Shadcn UI](https://ui.shadcn.com) – Components
- [TipTap](https://tiptap.dev) – Rich text editor

---

**Built with ❤️ for disciplined traders who want an edge**

*Last updated: December 7, 2024*
