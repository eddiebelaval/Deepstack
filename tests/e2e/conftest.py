"""
E2E Test Fixtures - Complete Trading System Setup

Provides comprehensive fixtures for end-to-end testing of the DeepStack
algorithmic trading system with all components mocked for safe testing.
"""

from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest

from core.agents.strategy_agent import StrategyAgent
from core.broker.order_manager import OrderManager
from core.broker.paper_trader import PaperTrader
from core.config import Config
from core.orchestrator import TradingOrchestrator
from core.risk.circuit_breaker import CircuitBreaker
from core.risk.kelly_position_sizer import KellyPositionSizer
from core.risk.stop_loss_manager import StopLossManager


@pytest.fixture
def mock_alpaca_client():
    """Mock Alpaca API client for market data."""
    client = Mock()

    # Mock quote data
    async def mock_get_quote(symbol):
        return {
            "last": 100.0,
            "bid": 99.5,
            "ask": 100.5,
            "bid_volume": 100,
            "ask_volume": 100,
            "timestamp": datetime.now().isoformat(),
        }

    client.get_quote = AsyncMock(side_effect=mock_get_quote)

    # Mock bars data
    async def mock_get_bars(symbol, limit=20):
        return [{"volume": 1000000, "close": 100.0} for _ in range(limit)]

    client.get_bars = AsyncMock(side_effect=mock_get_bars)

    return client


@pytest.fixture
def mock_market_data():
    """Mock market data for testing various scenarios."""
    return {
        "AAPL": {
            "price": 150.0,
            "volume": 1000000,
            "pe_ratio": 25.0,
            "pb_ratio": 5.0,
            "roe": 0.20,
            "fcf_yield": 0.05,
        },
        "MSFT": {
            "price": 380.0,
            "volume": 800000,
            "pe_ratio": 30.0,
            "pb_ratio": 12.0,
            "roe": 0.35,
            "fcf_yield": 0.04,
        },
        "VALUE": {
            "price": 50.0,
            "volume": 500000,
            "pe_ratio": 8.0,
            "pb_ratio": 0.6,
            "roe": 0.22,
            "fcf_yield": 0.10,
            "debt_equity": 0.2,
            "current_ratio": 2.0,
        },
        "GOOGL": {
            "price": 140.0,
            "volume": 1200000,
            "pe_ratio": 20.0,
            "pb_ratio": 4.0,
            "roe": 0.25,
            "fcf_yield": 0.06,
        },
    }


@pytest.fixture
async def e2e_trading_system(mock_alpaca_client, mock_market_data):
    """
    Complete E2E trading system with all components properly mocked.

    Returns dict with all components for E2E testing.
    """
    # Configuration
    config = Config()

    # Override config for testing
    config.trading.mode = "paper"

    # Strategy Agent (with mocked API clients to avoid real API calls)
    strategy_agent = StrategyAgent()

    # Mock the API clients in strategy agent to avoid rate limits
    strategy_agent.alpaca_client = mock_alpaca_client
    strategy_agent.alphavantage_client = None  # Disable Alpha Vantage for E2E tests

    # Position Sizing
    kelly_sizer = KellyPositionSizer(
        account_balance=100000.0,
        max_position_pct=0.20,  # 20% max per position
        max_total_exposure=1.0,  # 100% max total exposure
    )

    # Stop Loss Manager
    stop_manager = StopLossManager(
        account_balance=100000.0,
        max_risk_per_trade=0.02,  # 2% max risk per trade
        default_stop_pct=0.05,  # 5% stop loss
    )

    # Circuit Breaker
    circuit_breaker = CircuitBreaker(
        initial_portfolio_value=100000.0,
        daily_loss_limit=0.02,  # 2% daily loss limit
        max_drawdown_limit=0.10,  # 10% max drawdown
        consecutive_loss_limit=5,  # 5 consecutive losses
    )

    # Paper Trader (with enforced market hours disabled for testing)
    paper_trader = PaperTrader(
        config=config,
        alpaca_client=None,  # No real API client needed
        kelly_sizer=kelly_sizer,
        stop_manager=stop_manager,
        circuit_breaker=circuit_breaker,
        enable_risk_systems=True,
        enforce_market_hours=False,  # Disable for E2E tests
    )

    # Mock price fetching to use our mock data
    async def mock_get_price(symbol: str):
        return mock_market_data.get(symbol, {}).get("price", 100.0)

    paper_trader._get_market_price = mock_get_price

    # Order Manager (with paper trader)
    order_manager = OrderManager(
        config=config,
        paper_trader=paper_trader,
        risk_manager=None,  # Risk handled by circuit breaker
    )

    # Orchestrator
    orchestrator = TradingOrchestrator(
        config=config,
        strategy_agent=strategy_agent,
        risk_manager=circuit_breaker,
        order_manager=order_manager,
        paper_trader=paper_trader,
    )

    # Return complete system
    system = {
        "config": config,
        "strategy": strategy_agent,
        "kelly": kelly_sizer,
        "stops": stop_manager,
        "breaker": circuit_breaker,
        "trader": paper_trader,
        "orders": order_manager,
        "orchestrator": orchestrator,
        "mock_data": mock_market_data,
        "mock_client": mock_alpaca_client,
    }

    yield system

    # Cleanup
    try:
        # Reset paper trader portfolio
        paper_trader.reset_portfolio()
    except Exception as e:
        print(f"Warning: Error during cleanup: {e}")


@pytest.fixture
def market_open():
    """Mock market as open for trading."""
    with patch(
        "core.broker.paper_trader.PaperTrader.is_market_hours", return_value=True
    ):
        yield True


@pytest.fixture
def mock_fundamentals_provider(mock_market_data):
    """
    Mock fundamentals data provider for strategy agent.

    Returns a function that provides fundamental data for any symbol.
    """

    async def get_fundamentals(symbol: str):
        data = mock_market_data.get(symbol, {})
        return {
            "symbol": symbol,
            "pe_ratio": data.get("pe_ratio", 15.0),
            "pb_ratio": data.get("pb_ratio", 1.5),
            "roe": data.get("roe", 0.10),
            "debt_equity": data.get("debt_equity", 0.5),
            "current_ratio": data.get("current_ratio", 1.0),
            "fcf_yield": data.get("fcf_yield", 0.03),
            "dividend_yield": data.get("dividend_yield", 0.02),
            "profit_margin": data.get("profit_margin", 0.10),
            "operating_margin": data.get("operating_margin", 0.15),
        }

    return get_fundamentals


@pytest.fixture
def mock_strategy_analysis():
    """
    Mock strategy analysis results for testing.

    Returns a function that creates mock analysis for any symbol.
    """

    def create_analysis(symbol: str, score: float = 70.0, recommendation: str = "BUY"):
        from core.agents.strategy_agent import StockAnalysis

        return StockAnalysis(
            symbol=symbol,
            deep_value_score=score * 0.7,
            squeeze_score=score * 0.3,
            overall_score=score,
            recommendation=recommendation,
            thesis=f"Strong {recommendation.lower()} opportunity for {symbol}",
            catalysts=["Fundamental improvement", "Technical breakout"],
            risks=["Market volatility", "Sector headwinds"],
            target_price=100.0 * (1 + score / 200),
            stop_price=100.0 * 0.92,
            position_size_pct=0.05,
            confidence=score / 100,
        )

    return create_analysis


@pytest.fixture
async def portfolio_with_positions(e2e_trading_system):
    """
    Create a portfolio with existing positions for testing.

    Useful for testing sell signals, portfolio rebalancing, etc.
    """
    trader = e2e_trading_system["trader"]

    # Add some initial positions
    positions = [
        ("AAPL", 10, 150.0),
        ("MSFT", 5, 380.0),
    ]

    for symbol, quantity, price in positions:
        # Mock the price for this symbol
        async def mock_price(s=symbol, p=price):
            return p

        original_get_price = trader._get_market_price
        trader._get_market_price = mock_price

        # Place buy order
        await trader.place_market_order(symbol, quantity, "BUY")

        # Restore original price getter
        trader._get_market_price = original_get_price

    yield e2e_trading_system

    # Cleanup
    trader.reset_portfolio()


@pytest.fixture
def event_loop():
    """
    Create event loop for async tests.

    Required for pytest-bdd tests that need to run async operations.
    """
    import asyncio

    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def current_event_loop():
    """
    Get current event loop for use in step definitions.
    """
    import asyncio

    return asyncio.get_event_loop()
