# 🚀 DeepStack Phase 1: Foundation & First Steps

**Complete setup guide for getting DeepStack operational**

---

## 🎯 Phase 1 Objectives

By the end of Phase 1, you will have:

- ✅ **Complete System Architecture**: All core components implemented
- ✅ **Working CLI Interface**: Beautiful PipBoy-style terminal interface
- ✅ **Paper Trading Ready**: Risk-free testing environment
- ✅ **AI Integration**: Claude-powered market analysis
- ✅ **Risk Management**: Multi-layer safety systems
- ✅ **Basic Documentation**: Setup and usage guides

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DeepStack Phase 1                        │
├─────────────────────────────────────────────────────────────┤
│  🎛️  CLI Interface      │  🤖 AI Agents       │  ⚙️  Backend  │
│  ├── Dashboard          │  ├── Base Agent     │  ├── FastAPI  │
│  ├── Position Monitor   │  ├── Strategy Agent │  ├── IBKR     │
│  ├── Risk Display       │  └── Risk Agent     │  └── Paper    │
│  └── Market Scanner     │                     │      Trading  │
├─────────────────────────────────────────────────────────────┤
│  📊 Core Systems        │  🛡️  Safety         │  💾 Storage   │
│  ├── Configuration      │  ├── Risk Limits    │  ├── SQLite   │
│  ├── Strategy Engine    │  ├── Circuit        │  ├── Market   │
│  ├── Order Management   │      Breakers       │      Data     │
│  └── Analytics          │  └── Emergency      │  └── History  │
│                         │      Stops          │               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Phase 1 Checklist

### ✅ Core Infrastructure (Completed)
- [x] Project structure and directory layout
- [x] Virtual environment setup
- [x] Python dependency management
- [x] TypeScript/Node.js CLI setup

### ✅ Backend Systems (Completed)
- [x] Configuration management (`core/config.py`)
- [x] Base AI agent with Claude integration (`core/agents/base_agent.py`)
- [x] Strategy agent for deep value + squeeze detection (`core/agents/strategy_agent.py`)
- [x] Interactive Brokers client (`core/broker/ibkr_client.py`)
- [x] Paper trader simulation (`core/broker/paper_trader.py`)
- [x] Order manager with risk validation (`core/broker/order_manager.py`)
- [x] FastAPI server (`core/api_server.py`)
- [x] Risk management system (`core/risk/portfolio_risk.py`)

### ✅ Frontend Interface (Completed)
- [x] CLI application framework (`cli/src/app.tsx`)
- [x] Dashboard component (`cli/src/components/Dashboard.tsx`)
- [x] Position monitor (`cli/src/components/PositionMonitor.tsx`)
- [x] Risk display (`cli/src/components/RiskDisplay.tsx`)
- [x] Market scanner (`cli/src/components/MarketScanner.tsx`)
- [x] API client (`cli/src/api/client.ts`)

### ✅ Data Layer (Completed)
- [x] Market data manager (`core/data/market_data.py`)
- [x] Price feed system (`core/data/price_feed.py`)
- [x] Data storage (`core/data/data_storage.py`)
- [x] Database initialization

### ✅ Configuration (Completed)
- [x] Main configuration (`config/config.yaml`)
- [x] Risk limits (`config/risk_limits.yaml`)
- [x] Environment setup (`env.example`)

### ✅ Documentation (Completed)
- [x] README.md with project overview
- [x] This Phase 1 guide
- [x] Component documentation

---

## 🚀 Getting Started

### Step 1: Environment Setup

1. **Activate virtual environment:**
```bash
source venv/bin/activate
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Build CLI:**
```bash
cd cli
npm install
npm run build
npm link
```

4. **Verify installation:**
```bash
deepstack --version
```

### Step 2: Configuration

1. **Set up environment variables:**
```bash
# Copy template
cp env.example .env

# Edit .env with your API keys (leave empty for paper trading)
```

2. **Review configuration:**
```bash
# Main config
cat config/config.yaml

# Risk limits
cat config/risk_limits.yaml
```

3. **Test configuration loading:**
```bash
python -c "from core.config import get_config; print('✅ Config loaded successfully')"
```

### Step 3: Start the System

1. **Start the backend API server:**
```bash
# In terminal 1:
python -m uvicorn core.api_server:create_app --host 127.0.0.1 --port 8000 --reload
```

2. **Start the CLI dashboard:**
```bash
# In terminal 2:
deepstack dashboard
```

3. **Verify system health:**
```bash
# Test API connection
curl http://127.0.0.1:8000/health
```

### Step 4: Test Core Functionality

1. **Test market data:**
```bash
deepstack quote AAPL
```

2. **Test strategy analysis:**
```bash
deepstack analyze AAPL
```

3. **Test position management:**
```bash
deepstack positions
```

4. **Test risk management:**
```bash
deepstack risk
```

### Step 5: Paper Trading Setup

1. **Verify paper trading mode:**
```bash
# Check config
grep -n "mode:" config/config.yaml
# Should show: mode: "paper"
```

2. **Test paper trading:**
```bash
# Place a test order
deepstack buy AAPL 10

# Check positions
deepstack positions

# Check performance
deepstack performance today
```

---

## 🎛️ CLI Interface Guide

### Dashboard Views

- **Dashboard (d)**: Main overview with portfolio, positions, and activity
- **Positions (p)**: Detailed position tracking and P&L
- **Risk (r)**: Risk metrics, heat maps, and limit monitoring
- **Scanner (s)**: Market screening and opportunity identification

### Navigation

- **Arrow keys**: Navigate between views
- **Enter**: Select items in lists
- **r**: Refresh current view
- **q**: Quit application

### Command Line Usage

```bash
# Quick quotes
deepstack quote AAPL
deepstack quote MSFT TSLA GOOGL

# Trading commands
deepstack buy AAPL 100 --limit 150.00
deepstack sell AAPL 50 --stop 140.00

# Analysis
deepstack screen --strategy=deep_value
deepstack analyze AAPL --detailed

# System management
deepstack start --mode=paper
deepstack status
deepstack stop
```

---

## 🤖 AI Agent Integration

### Strategy Agent

The Strategy Agent analyzes stocks using:

- **Deep Value Criteria**:
  - P/E ratio ≤ 15x
  - P/B ratio ≤ 1.5x
  - ROE ≥ 15%
  - FCF yield ≥ 7%

- **Squeeze Detection**:
  - Short interest ≥ 20%
  - Days to cover ≥ 5
  - Borrow cost ≥ 5%
  - Available float ≤ 20%

### Risk Assessment

Every trade recommendation includes:

- **Risk/Reward Ratio**: Minimum 2:1
- **Position Size**: Kelly Criterion based
- **Stop Loss**: 8% maximum loss
- **Portfolio Heat**: ≤15% total risk

---

## 🛡️ Risk Management System

### Multi-Layer Protection

1. **Position Limits**:
   - Maximum 5% per position
   - Maximum 25% concentration in single idea

2. **Portfolio Heat**:
   - Total risk ≤15% of portfolio
   - Daily monitoring and alerts

3. **Loss Limits**:
   - Daily loss ≤2%
   - Weekly loss ≤5%
   - Maximum drawdown ≤15%

4. **Kelly Sizing**:
   - Conservative 25% of Kelly fraction
   - Automatic position size calculation

### Emergency Controls

```bash
# Emergency stop (closes all positions)
deepstack risk lockdown

# View risk status
deepstack risk report

# Adjust risk limits
deepstack risk adjust --daily=0.01
```

---

## 📊 Performance Tracking

### Metrics Monitored

- **Win Rate**: Percentage of profitable trades
- **Risk/Reward**: Average ratio achieved
- **Sharpe Ratio**: Risk-adjusted returns
- **Maximum Drawdown**: Peak-to-trough decline
- **Kelly Efficiency**: Sizing effectiveness

### Reporting Commands

```bash
# Today's performance
deepstack performance today

# Weekly summary
deepstack performance week

# Monthly analysis
deepstack performance month

# Strategy comparison
deepstack performance strategies
```

---

## 🔧 Troubleshooting

### Common Issues

**"Cannot connect to DeepStack backend"**
```bash
# Check if API server is running
curl http://127.0.0.1:8000/health

# Start the server if needed
python -m uvicorn core.api_server:create_app --host 127.0.0.1 --port 8000
```

**"Configuration validation errors"**
```bash
# Check config syntax
python -c "from core.config import get_config; config = get_config(); print('✅ Valid config')"

# Review and fix config files
nano config/config.yaml
```

**"IBKR connection failed"**
```bash
# For paper trading, IBKR connection is optional
# Check if running in paper mode:
grep -n "mode:" config/config.yaml

# Test IBKR separately if needed
python -c "from core.broker.ibkr_client import IBKRClient; print('IBKR client created')"
```

### Getting Help

1. **Check logs**: `tail -f logs/deepstack.log`
2. **Review configuration**: All settings in `config/`
3. **Test components individually**: Import and test each module
4. **Community support**: GitHub issues for bugs and features

---

## 🎯 Next Steps

### Phase 1 Verification

Before proceeding to Phase 2:

- [ ] **Complete 10+ paper trades** manually
- [ ] **Document every trade** in your journal
- [ ] **Achieve consistent profitability** on paper
- [ ] **Master risk management** controls
- [ ] **Understand all CLI commands**
- [ ] **Comfortable with AI analysis**

### Phase 2 Preview

Phase 2 will add:

- **🔄 Automated Trading**: Agent-driven execution
- **📈 Advanced Strategies**: Mean reversion, momentum
- **🎯 Portfolio Optimization**: Dynamic rebalancing
- **📱 Mobile Interface**: iOS/Android monitoring
- **🔗 Multi-Broker Support**: Alpaca, Tradier integration
- **📊 Advanced Analytics**: Machine learning insights

---

## 📚 Essential Reading

**Before Live Trading:**
1. **Kelly Criterion**: Understand position sizing mathematics
2. **Risk Management**: Master the safety systems
3. **Trading Psychology**: Control emotions and maintain discipline
4. **Strategy Details**: Deep dive into deep value and squeeze hunting

**Books to Study:**
- "Reminiscences of a Stock Operator" - Jesse Livermore
- "The Intelligent Investor" - Benjamin Graham
- "Fooled by Randomness" - Nassim Taleb
- "Fortune's Formula" - William Poundstone

---

## ✅ Phase 1 Completion

Congratulations! You now have a fully functional algorithmic trading system.

**Key Achievements:**
- ✅ Complete system architecture implemented
- ✅ Beautiful CLI interface operational
- ✅ Paper trading ready for testing
- ✅ AI-powered analysis working
- ✅ Comprehensive risk management active
- ✅ Documentation and guides completed

**Next:** Start paper trading, document your results, and prepare for Phase 2 automation!

---

**Remember:** Trading is a marathon, not a sprint. Focus on process over outcomes, and let the system work for you.
