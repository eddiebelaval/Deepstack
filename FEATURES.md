# DeepStack Feature Documentation

## Core Features

### 1. AI Research Chat

The heart of DeepStack – a Claude-powered conversational interface for market research.

**Capabilities:**
- Multi-provider support (Claude, GPT-4, Gemini)
- Extended thinking mode for complex analysis
- Tool use for real-time data fetching
- Context-aware responses based on your patterns
- Streaming responses for fast feedback

**Access:** Main interface at `/chat`

---

### 2. Thesis Engine

Develop, track, and validate your trading ideas before risking capital.

**Features:**
- **Structured Thesis Creation**: Symbol, hypothesis, timeframe, targets
- **Price Levels**: Entry, Exit Target, Stop Loss with R/R calculation
- **Key Conditions**: Define what must be true for thesis success
- **Live Monitoring**: 30-second price refresh against targets
- **Validation Gauge**: Visual 0-100% progression
- **Status Workflow**: Draft → Active → Validated/Invalidated

**Components:**
- `ThesisCard` – Summary view with status badge
- `ThesisDialog` – Create/edit form
- `ThesisDashboard` – Detailed monitoring view
- `ThesisList` – Tabbed view by status

**Access:** `/thesis` or Lightbulb icon in sidebar

---

### 3. Trade Journal

Document your trades to discover patterns and improve.

**Features:**
- **Trade Details**: Symbol, date, direction, quantity, prices
- **Automatic P&L**: Calculated from entry/exit prices
- **Emotion Tracking**: How you felt at entry and exit
- **Rich Notes**: TipTap editor with formatting
- **Lessons Learned**: Separate field for takeaways
- **Thesis Link**: Connect trades to hypotheses

**Emotions Tracked:**
- Confident 💪, Anxious 😰, Greedy 🤑
- Fearful 😨, FOMO 😱, Regret 😔
- Relief 😌, Neutral 😐, Excited 🤩, Frustrated 😤

**Access:** `/journal` or Book icon in sidebar

---

### 4. AI Pattern Learning

Discover hidden patterns in your trading behavior.

**Pattern Types:**
- **Emotion Patterns**: Win/loss rates by emotional state
- **Symbol Patterns**: Performance by ticker
- **Behavior Patterns**: Early exits, fear-driven decisions

**Privacy:**
- Explicit opt-in required
- Data never shared or sold
- Clear all patterns anytime
- Local storage only (no server sync)

**Access:** `/insights` or Brain icon in sidebar

---

### 5. Professional Charts

TradingView-style charting with real market data.

**Features:**
- Symbol search with typeahead
- Multiple timeframes (1m, 5m, 15m, 1h, 1D, 1W, 1M)
- Volume overlay
- Price tooltips
- Responsive design

**Data Source:** Alpaca Markets API

---

### 6. Stock Screener

Filter stocks by multiple criteria.

**Filters:**
- Market cap range
- P/E ratio
- Volume thresholds
- Price range
- Sector/Industry

**Data:** Real-time via Alpaca

---

### 7. Options Suite

Complete options analysis tools.

**Features:**
- Options chains with Greeks
- Expiration date picker
- Strike price filtering
- Strategy builders
- P&L visualization

---

### 8. News & Calendar

Stay informed on market events.

**News:**
- Real-time headlines
- Ticker-specific news
- Sentiment indicators

**Calendar:**
- Earnings dates
- Economic events
- Dividend dates

---

### 9. Emotional Firewall

AI-powered pause before impulsive trades.

**How it works:**
1. Before trading, answer reflection questions
2. AI analyzes your emotional state
3. Get feedback on potential biases
4. Make more disciplined decisions

---

## Navigation

| Icon | Feature | Route |
|------|---------|-------|
| 💬 | AI Chat | `/chat` |
| 💡 | Thesis Engine | `/thesis` |
| 📖 | Trade Journal | `/journal` |
| 🧠 | AI Insights | `/insights` |
| 📊 | Dashboard | `/dashboard` |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | AI conversation |
| `/api/journal` | GET/POST/PUT/DELETE | Journal CRUD |
| `/api/thesis` | GET/POST/PUT/DELETE | Thesis CRUD |
| `/api/market/quotes` | GET | Live quotes |
| `/api/market/bars` | GET | Historical data |
| `/api/market/assets` | GET | Symbol search |
| `/api/screener` | GET | Stock screening |
| `/api/news` | GET | Market news |
| `/api/calendar` | GET | Economic events |
| `/api/options/chain` | GET | Options data |

---

## State Management

All client state is managed with Zustand stores:

- **chat-store**: Conversations, messages, provider selection
- **journal-store**: Trade entries with CRUD operations
- **thesis-store**: Thesis entries with status management
- **pattern-store**: AI-discovered patterns with privacy
- **quota-store**: Usage limits and tier tracking
- **ui-store**: Sidebar state, modals, preferences

Data persists to localStorage via Zustand's persist middleware.
