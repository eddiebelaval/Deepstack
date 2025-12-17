# Changelog

All notable changes to DeepStack are documented here.

## [2.1.0] - 2025-12-16

### 🔐 Security Hardening
- Fix CORS misconfiguration vulnerability (#26)
- Fix critical XSS vulnerability in JournalList (#25)
- Add distributed rate limiting with Redis (#27)
- Add comprehensive database security migrations (#28)
- Resolve React hydration error #418 (#29)

### 💰 Credit System
- Unified token-based usage tracking with Usage Panel
- Model-based credit multipliers (Claude Opus > Sonnet > Haiku)
- Loss leader strategy: Market data endpoints now free
- Updated pricing, settings, and help documentation

### 📊 New Features
- **Prediction Markets**: Kalshi integration with real-time odds
- **Discover Feed**: Perplexity-style news discovery in NewsPanel
- **Alpha Vantage**: Real market data integration for fundamentals
- **Mobile Market Watcher**: Three-state collapsible panel

### 🎨 UI/UX Improvements
- TradingView-style chart polish with OHLCV legend
- Emotional Firewall: Replaced glow with subtle status dot
- Market Watcher: Auto-collapse on tool select
- Discover: Text-only card variant for articles without images
- Improved chevron visibility in collapsible panels

### 🧪 Testing & Quality
- 262+ unit tests for thesis and options components
- E2E testing infrastructure with advanced utilities
- Load testing infrastructure with k6
- Multi-layer caching for server data performance

### 🐛 Bug Fixes
- Corrected Kalshi market URL generation
- Improved news article image extraction
- Fixed Discover tabs client-side category filtering
- Backend .env file loading for API keys

---

## [2.0.0] - 2024-12-07

### 🚀 Major Features

#### Thesis Engine
- Create and track trading hypotheses with structured fields
- Live price monitoring with 30-second refresh
- Circular validation gauge (0-100%)
- Price level visualization (Entry/Target/StopLoss)
- Status workflow: Drafting → Active → Validated/Invalidated
- Risk/Reward calculation

#### Trade Journal
- Full CRUD for trade entries
- TipTap rich text editor for notes
- Emotion tracking at entry and exit
- Automatic P&L and percentage calculation
- Direction (Long/Short) tracking
- Lessons learned section
- Integration with Thesis Engine

#### AI Pattern Learning
- Emotion pattern analysis (win/loss correlation)
- Symbol performance tracking
- Behavior pattern detection (early exits, fear trading)
- Privacy-first design with explicit consent
- Pattern clearing capability
- Integration with AI chat context

#### Product Tiers
- Free tier: 10 AI queries/12hrs, 15m delayed data, 1 thesis
- Pro tier: Unlimited AI, real-time data, full features
- Quota tracking with paywall integration

#### UI/UX Improvements
- Persistent disclaimer banner ("Not Financial Advice")
- Back buttons on all feature pages
- Research Tools section in sidebar
- Improved navigation flow

### 🔧 Technical Changes
- Added Zustand stores: quota-store, thesis-store, journal-store, pattern-store
- Extended chat API with pattern context for personalization
- TipTap integration with SSR hydration fix
- New API routes: /api/journal, /api/thesis

### 🐛 Bug Fixes
- Fixed TipTap SSR hydration mismatch with `immediatelyRender: false`
- Removed duplicate DialogClose buttons
- Fixed Progress component import error

---

## [1.5.0] - 2024-12-06

### Features
- Professional charting with symbol search
- Multi-timeframe support
- Advanced chart indicators

---

## [1.4.0] - 2024-12-05

### Features
- Real-time market data integration
- Alpaca API proxy routes
- Live watchlist updates

---

## [1.3.0] - 2024-12-04

### Features
- Options chain display
- Options strategy builder
- Greeks calculations

---

## [1.2.0] - 2024-12-03

### Features
- Stock screener with real data
- News feed integration
- Economic calendar

---

## [1.1.0] - 2024-12-02

### Features
- Multi-provider AI support (Claude, GPT, Gemini)
- Extended thinking mode
- Streaming responses

---

## [1.0.0] - 2024-12-01

### Initial Release
- AI-powered trading chat interface
- Basic charting
- Watchlist management
- Paper trading integration
