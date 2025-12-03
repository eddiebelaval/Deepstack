# 🔥 DeepStack Trading System

**🌐 [deepstack.trade](https://deepstack.trade)**

**Autonomous AI-Powered Trading with Claude Integration**

DeepStack is a sophisticated algorithmic trading system that combines deep value investing principles with modern AI analysis. Built for disciplined, systematic trading with comprehensive risk management.

> **Web App**: A modern conversational trading interface is available at [deepstack.trade](https://deepstack.trade)

## 🎯 Key Features

- **🤖 AI-Powered Analysis**: Claude AI integration for market analysis and strategy execution
- **🌐 Web Trading Interface**: Modern conversational UI at [deepstack.trade](https://deepstack.trade)
- **📊 Multi-Strategy Framework**: Deep value investing + Short squeeze detection
- **⚖️ Advanced Risk Management**: Kelly Criterion, portfolio heat tracking, stop losses
- **🎛️ Beautiful CLI Interface**: Retro-futuristic PipBoy-inspired terminal interface
- **📈 Live Market Data**: Real-time quotes and charts via Alpaca Markets
- **🔗 Broker Integration**: Interactive Brokers + Alpaca + Paper trading
- **📈 Performance Analytics**: Comprehensive reporting and trade journaling
- **🛡️ Safety First**: Multiple risk layers, circuit breakers, emergency stops

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- Interactive Brokers account (for live trading)
- Anthropic API key (for AI analysis)

### Installation

1. **Clone and setup:**
```bash
git clone <repository-url>
cd deepstack
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Install CLI dependencies:**
```bash
cd cli
npm install
npm run build
npm link
```

4. **Configure API keys:**
```bash
# Copy example environment file
cp env.example .env

# Edit .env with your API keys:
# IBKR_HOST=127.0.0.1
# IBKR_PORT=7497
# IBKR_CLIENT_ID=1
# ANTHROPIC_API_KEY=your_key_here
```

5. **Configure trading settings:**
```bash
# Edit config/config.yaml for your preferences
# Set mode to "paper" for testing
```

### First Run

```bash
# Start in paper trading mode (recommended)
deepstack start --mode=paper

# In another terminal, open the dashboard
deepstack dashboard

# Screen for opportunities
deepstack screen

# Analyze a specific stock
deepstack analyze AAPL

# Place a paper trade
deepstack buy AAPL 100
```

## 📚 Documentation

- **[Phase 1 Guide](docs/01-PHASE-1-GUIDE.md)** - Complete setup and first trades
- **[Master Hub](docs/01-MASTER-HUB.md)** - System overview and philosophy
- **[Professional Execution](docs/03-PROFESSIONAL-EXECUTION.md)** - Advanced position sizing
- **[Trading Systems](docs/04-ADVANCED-TRADING-SYSTEMS.md)** - Strategy details
- **[Automation Layer](docs/05-AUTOMATION-LAYER.md)** - System automation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           DeepStack System                      │
├─────────────────────────────────────────────────────────────────┤
│  🤖 AI Agents          │  📊 CLI Interface    │  ⚙️  Backend    │
│  ├── Base Agent        │  ├── Dashboard       │  ├── FastAPI    │
│  ├── Strategy Agent    │  ├── Position Monitor│  ├── IBKR Client│
│  └── Risk Agent        │  ├── Risk Display    │  └── Paper Trader│
│                         │  └── Market Scanner  │                  │
├─────────────────────────────────────────────────────────────────┤
│  📈 Strategies         │  🛡️  Risk Management  │  💾 Data Layer   │
│  ├── Deep Value        │  ├── Portfolio Risk  │  ├── SQLite     │
│  ├── Squeeze Hunter    │  ├── Kelly Criterion │  ├── Market Data│
│  └── Pairs Trading     │  └── Stop Losses     │  └── Analytics  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

- **AI Agents**: Claude-powered analysis and decision making
- **Risk Management**: Multi-layer risk controls and position sizing
- **CLI Interface**: Beautiful terminal interface for monitoring and control
- **Broker Integration**: Live and paper trading through Interactive Brokers
- **Data Layer**: Market data, trade history, and analytics storage

## 🎯 Trading Philosophy

DeepStack is built on proven trading principles:

- **Deep Value Investing**: Find undervalued companies with strong fundamentals
- **Short Squeeze Detection**: Identify stocks with high short interest and catalysts
- **Risk Management**: Never risk more than you can afford to lose
- **Systematic Approach**: Remove emotion from trading decisions
- **Continuous Learning**: Every trade is a learning opportunity

## 🛡️ Safety Features

- **Multiple Risk Layers**: Position limits, portfolio heat, daily/weekly stops
- **Circuit Breakers**: Automatic halts on extreme market conditions
- **Emergency Stops**: One-command system shutdown
- **Paper Trading First**: Test strategies before going live
- **Audit Trail**: Complete logging of all decisions and actions

## 🚦 Trading Modes

### Paper Trading (Recommended for beginners)
```bash
deepstack start --mode=paper
```
- Risk-free testing environment
- Realistic order simulation
- Full strategy validation
- No financial risk

### Live Trading (Experienced traders only)
```bash
deepstack start --mode=live
```
- Real money trading
- IBKR integration required
- All safety features active
- Comprehensive logging

## 📊 Key Commands

```bash
# System Control
deepstack start              # Start trading system
deepstack stop               # Stop gracefully
deepstack status             # Check system status
deepstack dashboard          # Interactive dashboard

# Analysis
deepstack screen             # Screen for opportunities
deepstack analyze AAPL       # Deep stock analysis
deepstack risk               # Risk management report

# Trading
deepstack buy AAPL 100       # Place buy order
deepstack sell AAPL 50       # Place sell order
deepstack positions          # Show current positions

# Performance
deepstack performance today  # Today's P&L
deepstack performance month  # Monthly summary
```

## 🔧 Configuration

DeepStack uses YAML configuration files for easy customization:

- **`config/config.yaml`**: Main trading configuration
- **`config/risk_limits.yaml`**: Risk management settings
- **`knowledge-base/trader_philosophies.yaml`**: Trading wisdom and principles

## 🤝 Contributing

DeepStack is designed to be extensible. Key areas for contribution:

- **New Strategies**: Implement additional trading strategies
- **Data Sources**: Add new market data providers
- **Risk Models**: Enhance risk management algorithms
- **UI Components**: Improve the CLI interface
- **Analytics**: Add performance measurement tools

## 📜 License

MIT License - See LICENSE file for details.

## ⚠️ Disclaimer

**Trading involves substantial risk of loss and is not suitable for every investor.** Past performance does not guarantee future results. Only trade with money you can afford to lose. The developers of DeepStack are not responsible for any financial losses incurred through the use of this software.

## 🙏 Acknowledgments

DeepStack is inspired by:
- **Master Traders**: Buffett, Munger, Livermore, O'Neil
- **Risk Management**: Kelly Criterion, VaR models
- **AI Integration**: Anthropic's Claude
- **Terminal UI**: Fallout's PipBoy interface

---

**Built with ❤️ for systematic, disciplined trading**
