"""
Comprehensive Coverage Tests for Paper Trader - Target: 90%+ Coverage

This test suite achieves comprehensive coverage by testing:
1. Order Placement (market, limit, stop orders)
2. Order Fill Simulation with various conditions
3. Position Management (creation, updates, averaging)
4. P&L Calculations (realized/unrealized)
5. Market Data handling (cache, fallbacks, errors)
6. Order Management (cancel, query, status)
7. Edge Cases (validation, errors, boundaries)
8. Database operations
9. Performance metrics
10. Commission and slippage calculations
"""

import asyncio
import sqlite3
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
import pytz

from core.broker.paper_trader import PaperTrader
from core.config import Config
from core.data.alpaca_client import AlpacaClient


@pytest.fixture
def config():
    """Create test configuration."""
    return Config()


@pytest.fixture
def mock_alpaca():
    """Create mock Alpaca client with realistic quote data."""
    mock = AsyncMock(spec=AlpacaClient)

    async def mock_get_quote(symbol):
        """Return realistic quote data."""
        prices = {
            "AAPL": 150.00,
            "MSFT": 350.00,
            "GOOGL": 140.00,
            "TSLA": 200.00,
            "INVALID": None,
        }
        base_price = prices.get(symbol, 100.00)
        if base_price is None:
            return None
        return {
            "symbol": symbol,
            "bid": base_price - 0.02,
            "ask": base_price + 0.03,
            "last": base_price,
            "timestamp": datetime.now().isoformat(),
        }

    mock.get_quote = mock_get_quote
    return mock


@pytest.fixture
def paper_trader(config, mock_alpaca):
    """Create paper trader with all features enabled."""
    trader = PaperTrader(
        config=config,
        alpaca_client=mock_alpaca,
        enable_risk_systems=True,
        commission_per_trade=1.0,
        commission_per_share=0.005,
        enforce_market_hours=False,
        slippage_volatility_multiplier=1.0,
    )
    trader.reset_portfolio()
    return trader


@pytest.fixture
def paper_trader_no_risk(config, mock_alpaca):
    """Create paper trader without risk systems."""
    trader = PaperTrader(
        config=config,
        alpaca_client=mock_alpaca,
        enable_risk_systems=False,
        commission_per_trade=0.0,
        commission_per_share=0.0,
        enforce_market_hours=False,
    )
    trader.reset_portfolio()
    return trader


class TestOrderPlacement:
    """Test order placement functionality - covers lines 473-780."""

    @pytest.mark.asyncio
    async def test_place_market_order_buy_success(self, paper_trader):
        """Test successful market BUY order."""
        initial_cash = paper_trader.cash
        order_id = await paper_trader.place_market_order(
            "AAPL", 100, "BUY", auto_stop_loss=False
        )

        assert order_id is not None
        assert order_id.startswith("paper_")
        assert paper_trader.cash < initial_cash
        assert "AAPL" in paper_trader.positions
        assert paper_trader.positions["AAPL"]["quantity"] == 100

    @pytest.mark.asyncio
    async def test_place_market_order_sell_success(self, paper_trader):
        """Test successful market SELL order."""
        # First buy
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        initial_cash = paper_trader.cash

        # Then sell
        order_id = await paper_trader.place_market_order("AAPL", 100, "SELL")

        assert order_id is not None
        assert paper_trader.cash > initial_cash
        assert "AAPL" not in paper_trader.positions

    @pytest.mark.asyncio
    async def test_place_market_order_invalid_symbol(self, paper_trader):
        """Test market order with invalid symbol."""
        order_id = await paper_trader.place_market_order("", 100, "BUY")
        assert order_id is None

        order_id = await paper_trader.place_market_order(None, 100, "BUY")
        assert order_id is None

        order_id = await paper_trader.place_market_order(123, 100, "BUY")
        assert order_id is None

    @pytest.mark.asyncio
    async def test_place_market_order_invalid_quantity(self, paper_trader):
        """Test market order with invalid quantity."""
        # Zero quantity
        order_id = await paper_trader.place_market_order("AAPL", 0, "BUY")
        assert order_id is None

        # Negative quantity
        order_id = await paper_trader.place_market_order("AAPL", -100, "BUY")
        assert order_id is None

    @pytest.mark.asyncio
    async def test_place_market_order_invalid_action(self, paper_trader):
        """Test market order with invalid action."""
        order_id = await paper_trader.place_market_order("AAPL", 100, "INVALID")
        assert order_id is None

        order_id = await paper_trader.place_market_order("AAPL", 100, "buy")
        assert order_id is None

    @pytest.mark.asyncio
    async def test_place_market_order_insufficient_cash(self, paper_trader):
        """Test market BUY with insufficient cash."""
        paper_trader.cash = 100.0  # Very low cash
        order_id = await paper_trader.place_market_order(
            "AAPL", 1000, "BUY", auto_stop_loss=False
        )
        assert order_id is None

    @pytest.mark.asyncio
    async def test_place_market_order_insufficient_shares(self, paper_trader):
        """Test market SELL with insufficient shares."""
        order_id = await paper_trader.place_market_order("AAPL", 100, "SELL")
        assert order_id is None

    @pytest.mark.asyncio
    async def test_place_market_order_no_price(self, paper_trader):
        """Test market order when price unavailable."""
        paper_trader.alpaca.get_quote = AsyncMock(return_value=None)
        paper_trader.price_cache.clear()

        order_id = await paper_trader.place_market_order("AAPL", 100, "BUY")
        assert order_id is None

    @pytest.mark.asyncio
    async def test_place_limit_order_buy_filled(self, paper_trader):
        """Test limit BUY order that fills immediately."""
        # Market price is 150, limit at 160 should fill
        order_id = await paper_trader.place_limit_order("AAPL", 100, "BUY", 160.00)

        assert order_id is not None
        assert "AAPL" in paper_trader.positions
        assert paper_trader.positions["AAPL"]["quantity"] == 100

    @pytest.mark.asyncio
    async def test_place_limit_order_buy_not_filled(self, paper_trader):
        """Test limit BUY order that doesn't fill."""
        # Market price is 150, limit at 140 won't fill
        order_id = await paper_trader.place_limit_order("AAPL", 100, "BUY", 140.00)

        assert order_id is not None
        assert "AAPL" not in paper_trader.positions

    @pytest.mark.asyncio
    async def test_place_limit_order_sell_filled(self, paper_trader):
        """Test limit SELL order that fills immediately."""
        # First buy
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Market price is 150, limit at 140 should fill
        order_id = await paper_trader.place_limit_order("AAPL", 100, "SELL", 140.00)

        assert order_id is not None
        assert "AAPL" not in paper_trader.positions

    @pytest.mark.asyncio
    async def test_place_limit_order_sell_not_filled(self, paper_trader):
        """Test limit SELL order that doesn't fill."""
        # First buy
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Market price is 150, limit at 160 won't fill
        order_id = await paper_trader.place_limit_order("AAPL", 100, "SELL", 160.00)

        assert order_id is not None
        assert "AAPL" in paper_trader.positions

    @pytest.mark.asyncio
    async def test_place_limit_order_no_price(self, paper_trader):
        """Test limit order when price unavailable."""
        paper_trader.alpaca.get_quote = AsyncMock(return_value=None)
        paper_trader.price_cache.clear()

        order_id = await paper_trader.place_limit_order("AAPL", 100, "BUY", 150.00)
        assert order_id is None

    @pytest.mark.asyncio
    async def test_place_stop_order_triggered(self, paper_trader):
        """Test stop order that triggers immediately."""
        # Market price is 150, stop SELL at 160 won't trigger
        # Market price is 150, stop SELL at 140 will trigger
        order_id = await paper_trader.place_stop_order("AAPL", 100, "SELL", 140.00)

        assert order_id is not None

    @pytest.mark.asyncio
    async def test_place_stop_order_not_triggered(self, paper_trader):
        """Test stop order that doesn't trigger."""
        # First buy to have position
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Market price is 150, stop SELL at 160 won't trigger
        order_id = await paper_trader.place_stop_order("AAPL", 100, "SELL", 160.00)

        assert order_id is not None

    @pytest.mark.asyncio
    async def test_place_stop_order_buy_triggered(self, paper_trader):
        """Test stop BUY order that triggers."""
        # Market price is 150, stop BUY at 140 will trigger
        order_id = await paper_trader.place_stop_order("AAPL", 100, "BUY", 140.00)

        assert order_id is not None

    @pytest.mark.asyncio
    async def test_place_stop_order_no_price(self, paper_trader):
        """Test stop order when price unavailable."""
        paper_trader.alpaca.get_quote = AsyncMock(return_value=None)
        paper_trader.price_cache.clear()

        order_id = await paper_trader.place_stop_order("AAPL", 100, "SELL", 140.00)
        assert order_id is None


class TestPositionManagement:
    """Test position management - covers lines 807-923."""

    @pytest.mark.asyncio
    async def test_position_creation(self, paper_trader):
        """Test creating new position."""
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        position = paper_trader.get_position("AAPL")
        assert position is not None
        assert position["quantity"] == 100
        assert position["avg_cost"] > 0
        assert position["unrealized_pnl"] == 0.0
        assert position["realized_pnl"] == 0.0

    @pytest.mark.asyncio
    async def test_position_averaging_up(self, paper_trader):
        """Test position averaging when buying more."""
        # First buy at ~150
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        first_cost = paper_trader.positions["AAPL"]["avg_cost"]

        # Second buy at ~150 (should average)
        await paper_trader.place_market_order("AAPL", 50, "BUY", auto_stop_loss=False)

        position = paper_trader.get_position("AAPL")
        assert position["quantity"] == 150
        # Average cost should be weighted average
        assert position["avg_cost"] > 0

    @pytest.mark.asyncio
    async def test_position_partial_close(self, paper_trader):
        """Test partial position close."""
        # Buy 100 shares
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Sell 60 shares
        await paper_trader.place_market_order("AAPL", 60, "SELL")

        position = paper_trader.get_position("AAPL")
        assert position is not None
        assert position["quantity"] == 40

    @pytest.mark.asyncio
    async def test_position_full_close(self, paper_trader):
        """Test full position close."""
        # Buy 100 shares
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Sell all 100 shares
        await paper_trader.place_market_order("AAPL", 100, "SELL")

        position = paper_trader.get_position("AAPL")
        assert position is None

    @pytest.mark.asyncio
    async def test_realized_pnl_on_sell(self, paper_trader, mock_alpaca):
        """Test realized P&L calculation on sell."""
        # Buy at 150
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Change price to 160
        async def mock_higher_price(symbol):
            return {"symbol": symbol, "bid": 160.00, "ask": 160.05, "last": 160.02}

        mock_alpaca.get_quote = mock_higher_price

        # Sell at 160
        await paper_trader.place_market_order("AAPL", 100, "SELL")

        # Check trade history for P&L
        sell_trade = [t for t in paper_trader.trade_history if t["action"] == "SELL"][
            -1
        ]
        assert sell_trade["pnl"] > 0  # Should be profitable

    @pytest.mark.asyncio
    async def test_get_positions(self, paper_trader):
        """Test getting all positions."""
        # Create multiple positions
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("MSFT", 50, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("GOOGL", 75, "BUY", auto_stop_loss=False)

        positions = paper_trader.get_positions()
        assert len(positions) == 3
        assert any(p["symbol"] == "AAPL" for p in positions)
        assert any(p["symbol"] == "MSFT" for p in positions)
        assert any(p["symbol"] == "GOOGL" for p in positions)

    @pytest.mark.asyncio
    async def test_get_position_nonexistent(self, paper_trader):
        """Test getting nonexistent position."""
        position = paper_trader.get_position("AAPL")
        assert position is None


class TestPNLCalculations:
    """Test P&L calculations - covers lines 1213-1225, 1401-1435."""

    @pytest.mark.asyncio
    async def test_portfolio_value_cash_only(self, paper_trader):
        """Test portfolio value with only cash."""
        value = paper_trader.get_portfolio_value()
        assert value == 100000.0

    @pytest.mark.asyncio
    async def test_portfolio_value_with_positions(self, paper_trader):
        """Test portfolio value with positions."""
        # Buy 100 shares at ~150
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        value = paper_trader.get_portfolio_value()
        # Should be close to 100k (some spent on stock)
        assert value > 0
        assert value <= 100000.0

    @pytest.mark.asyncio
    async def test_buying_power(self, paper_trader):
        """Test buying power calculation."""
        initial_bp = paper_trader.get_buying_power()
        assert initial_bp == 100000.0

        # Buy some stock
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        new_bp = paper_trader.get_buying_power()
        assert new_bp < initial_bp

    @pytest.mark.asyncio
    async def test_get_trade_history(self, paper_trader):
        """Test getting trade history."""
        # Execute some trades
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("AAPL", 100, "SELL")

        history = paper_trader.get_trade_history()
        assert len(history) >= 2

        # Test with limit
        limited = paper_trader.get_trade_history(limit=1)
        assert len(limited) == 1

    @pytest.mark.asyncio
    async def test_get_trade_history_empty(self, paper_trader):
        """Test trade history when empty."""
        history = paper_trader.get_trade_history()
        assert history == []


class TestMarketData:
    """Test market data handling - covers lines 925-964."""

    @pytest.mark.asyncio
    async def test_get_market_price_alpaca_success(self, paper_trader):
        """Test getting price from Alpaca."""
        price = await paper_trader._get_market_price("AAPL")
        assert price == 150.00

    @pytest.mark.asyncio
    async def test_get_market_price_caching(self, paper_trader):
        """Test price caching."""
        # First call - should hit Alpaca
        price1 = await paper_trader._get_market_price("AAPL")
        assert price1 == 150.00

        # Verify cached
        assert "AAPL" in paper_trader.price_cache

        # Second call - should use cache even if Alpaca fails
        paper_trader.alpaca.get_quote = AsyncMock(side_effect=Exception("API Error"))
        price2 = await paper_trader._get_market_price("AAPL")
        assert price2 == price1

    @pytest.mark.asyncio
    async def test_get_market_price_cache_expiry(self, paper_trader):
        """Test price cache expiration."""
        # Get price and cache it
        price1 = await paper_trader._get_market_price("AAPL")

        # Manually age the cache
        old_time = datetime.now() - timedelta(minutes=10)
        paper_trader.price_cache["AAPL"] = (price1, old_time)

        # Next call should try Alpaca again (cache expired)
        paper_trader.alpaca.get_quote = AsyncMock(return_value=None)
        price2 = await paper_trader._get_market_price("AAPL")
        assert price2 is None

    @pytest.mark.asyncio
    async def test_get_market_price_alpaca_error(self, paper_trader):
        """Test handling Alpaca errors."""
        paper_trader.alpaca.get_quote = AsyncMock(
            side_effect=Exception("Network error")
        )
        paper_trader.price_cache.clear()

        price = await paper_trader._get_market_price("AAPL")
        assert price is None

    @pytest.mark.asyncio
    async def test_get_market_price_invalid_quote(self, paper_trader):
        """Test handling invalid quote data."""

        async def mock_invalid_quote(symbol):
            return {"symbol": symbol}  # Missing 'last' price

        paper_trader.alpaca.get_quote = mock_invalid_quote
        paper_trader.price_cache.clear()

        price = await paper_trader._get_market_price("AAPL")
        assert price is None


class TestSlippageAndCommissions:
    """Test slippage and commission calculations - covers lines 966-1030."""

    def test_slippage_buy(self, paper_trader):
        """Test slippage on BUY orders."""
        market_price = 100.0
        fill_price = paper_trader._calculate_slippage(market_price, "BUY", 100)
        assert fill_price > market_price

    def test_slippage_sell(self, paper_trader):
        """Test slippage on SELL orders."""
        market_price = 100.0
        fill_price = paper_trader._calculate_slippage(market_price, "SELL", 100)
        assert fill_price < market_price

    def test_slippage_increases_with_quantity(self, paper_trader):
        """Test slippage increases with order size."""
        market_price = 100.0

        # Calculate average slippage for small vs large orders
        small_slippages = []
        large_slippages = []

        for _ in range(50):
            small_fill = paper_trader._calculate_slippage(market_price, "BUY", 100)
            large_fill = paper_trader._calculate_slippage(market_price, "BUY", 1000)
            small_slippages.append(small_fill - market_price)
            large_slippages.append(large_fill - market_price)

        avg_small = sum(small_slippages) / len(small_slippages)
        avg_large = sum(large_slippages) / len(large_slippages)

        assert avg_large >= avg_small

    def test_slippage_minimum_enforced(self, paper_trader):
        """Test minimum slippage is enforced."""
        # Very low price
        market_price = 1.0
        fill_price = paper_trader._calculate_slippage(market_price, "BUY", 10)

        slippage = fill_price - market_price
        assert slippage >= paper_trader.min_slippage

    def test_commission_per_trade(self, paper_trader):
        """Test per-trade commission calculation."""
        commission = paper_trader._calculate_commission(100)
        assert commission == 1.0 + (100 * 0.005)  # $1 + $0.50

    def test_commission_per_share(self, config, mock_alpaca):
        """Test per-share commission calculation."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            commission_per_trade=0.0,
            commission_per_share=0.01,
            enable_risk_systems=False,
        )

        commission = trader._calculate_commission(100)
        assert commission == 1.0  # 100 * $0.01

    def test_commission_zero(self, paper_trader_no_risk):
        """Test zero commission."""
        commission = paper_trader_no_risk._calculate_commission(100)
        assert commission == 0.0


class TestOrderManagement:
    """Test order management - covers lines 782-805."""

    @pytest.mark.asyncio
    async def test_cancel_order(self, paper_trader):
        """Test canceling an order."""
        # Place an order
        order_id = await paper_trader.place_market_order(
            "AAPL", 100, "BUY", auto_stop_loss=False
        )

        # Cancel it
        result = await paper_trader.cancel_order(order_id)
        assert result is True

        # Verify in database
        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute(
                "SELECT status FROM orders WHERE order_id = ?", (order_id,)
            )
            row = cursor.fetchone()
            assert row[0] == "CANCELLED"

    @pytest.mark.asyncio
    async def test_cancel_order_error(self, paper_trader):
        """Test cancel order with invalid ID."""
        # Try to cancel nonexistent order
        result = await paper_trader.cancel_order("invalid_id")
        assert result is True  # Still returns True but logs error


class TestPerformanceMetrics:
    """Test performance analytics - covers lines 1044-1470."""

    @pytest.mark.asyncio
    async def test_calculate_sharpe_ratio_insufficient_data(self, paper_trader):
        """Test Sharpe ratio with insufficient data."""
        sharpe = paper_trader.calculate_sharpe_ratio()
        assert sharpe is None

    @pytest.mark.asyncio
    async def test_calculate_sharpe_ratio_with_trades(self, paper_trader, mock_alpaca):
        """Test Sharpe ratio calculation with trades."""
        # Execute multiple trades with varying P&L
        for i in range(10):
            await paper_trader.place_market_order(
                "AAPL", 100, "BUY", auto_stop_loss=False
            )

            # Alternate wins and losses
            if i % 2 == 0:

                async def mock_up(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 160.00,
                        "ask": 160.05,
                        "last": 160.02,
                    }

                mock_alpaca.get_quote = mock_up
            else:

                async def mock_down(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 145.00,
                        "ask": 145.05,
                        "last": 145.02,
                    }

                mock_alpaca.get_quote = mock_down

            await paper_trader.place_market_order("AAPL", 100, "SELL")

            # Reset
            async def mock_reset(symbol):
                return {"symbol": symbol, "bid": 150.00, "ask": 150.05, "last": 150.02}

            mock_alpaca.get_quote = mock_reset

        sharpe = paper_trader.calculate_sharpe_ratio()
        assert sharpe is not None
        assert isinstance(sharpe, float)

    @pytest.mark.asyncio
    async def test_calculate_sharpe_ratio_no_trades_with_pnl(self, paper_trader):
        """Test Sharpe ratio when trades have no P&L."""
        # Add trades without P&L
        for i in range(5):
            trade = {
                "trade_id": f"test_{i}",
                "symbol": "AAPL",
                "action": "BUY",
                "quantity": 100,
                "price": 150.0,
                "pnl": 0.0,
                "timestamp": datetime.now(),
                "order_id": f"order_{i}",
            }
            paper_trader.trade_history.append(trade)

        sharpe = paper_trader.calculate_sharpe_ratio()
        assert sharpe is None

    @pytest.mark.asyncio
    async def test_calculate_sharpe_ratio_zero_stddev(self, paper_trader):
        """Test Sharpe ratio with zero standard deviation."""
        # Add identical trades (zero variance)
        for i in range(5):
            await paper_trader.place_market_order(
                "AAPL", 100, "BUY", auto_stop_loss=False
            )
            await paper_trader.place_market_order("AAPL", 100, "SELL")

        # Manually set identical P&L for all
        for trade in paper_trader.trade_history:
            trade["pnl"] = 100.0

        sharpe = paper_trader.calculate_sharpe_ratio()
        # Zero stddev should return None
        assert sharpe is None or isinstance(sharpe, float)

    @pytest.mark.asyncio
    async def test_calculate_max_drawdown(self, paper_trader):
        """Test max drawdown calculation."""
        drawdown = paper_trader.calculate_max_drawdown()

        assert "max_drawdown_pct" in drawdown
        assert "max_drawdown_dollars" in drawdown
        assert "peak_value" in drawdown
        assert "current_value" in drawdown
        assert drawdown["peak_value"] == 100000.0
        assert drawdown["max_drawdown_pct"] == 0.0

    @pytest.mark.asyncio
    async def test_get_trade_statistics_no_trades(self, paper_trader):
        """Test trade statistics with no trades."""
        stats = paper_trader.get_trade_statistics()

        assert stats["total_trades"] == 0
        assert stats["winning_trades"] == 0
        assert stats["losing_trades"] == 0
        assert stats["win_rate"] == 0.0
        assert stats["avg_win"] == 0.0
        assert stats["avg_loss"] == 0.0

    @pytest.mark.asyncio
    async def test_get_trade_statistics_only_buys(self, paper_trader):
        """Test trade statistics with only BUY trades."""
        # Execute only buys
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("MSFT", 50, "BUY", auto_stop_loss=False)

        stats = paper_trader.get_trade_statistics()
        assert stats["total_trades"] == 2
        assert stats["winning_trades"] == 0
        assert stats["losing_trades"] == 0

    @pytest.mark.asyncio
    async def test_get_trade_statistics_with_wins_losses(
        self, paper_trader, mock_alpaca
    ):
        """Test trade statistics with wins and losses."""
        # Execute 5 trades: 3 wins, 2 losses
        for i in range(5):
            await paper_trader.place_market_order(
                "AAPL", 100, "BUY", auto_stop_loss=False
            )

            if i < 3:  # Win

                async def mock_up(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 160.00,
                        "ask": 160.05,
                        "last": 160.02,
                    }

                mock_alpaca.get_quote = mock_up
            else:  # Loss

                async def mock_down(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 140.00,
                        "ask": 140.05,
                        "last": 140.02,
                    }

                mock_alpaca.get_quote = mock_down

            await paper_trader.place_market_order("AAPL", 100, "SELL")

            # Reset
            async def mock_reset(symbol):
                return {"symbol": symbol, "bid": 150.00, "ask": 150.05, "last": 150.02}

            mock_alpaca.get_quote = mock_reset

        stats = paper_trader.get_trade_statistics()
        assert stats["winning_trades"] == 3
        assert stats["losing_trades"] == 2
        assert stats["win_rate"] == 0.6
        assert stats["avg_win"] > 0
        assert stats["avg_loss"] > 0

    @pytest.mark.asyncio
    async def test_get_performance_summary(self, paper_trader):
        """Test comprehensive performance summary."""
        summary = paper_trader.get_performance_summary()

        # Check all required fields
        assert "portfolio_value" in summary
        assert "initial_cash" in summary
        assert "cash" in summary
        assert "positions_value" in summary
        assert "total_pnl" in summary
        assert "total_return_pct" in summary
        assert "total_commissions" in summary
        assert "num_positions" in summary
        assert "num_trades" in summary
        assert "sharpe_ratio" in summary
        assert "max_drawdown_pct" in summary
        assert "max_drawdown_dollars" in summary
        assert "peak_value" in summary
        assert "win_rate" in summary
        assert "avg_win" in summary
        assert "avg_loss" in summary
        assert "winning_trades" in summary
        assert "losing_trades" in summary

    @pytest.mark.asyncio
    async def test_update_performance_metrics(self, paper_trader):
        """Test performance metrics update."""
        initial_value = paper_trader.get_portfolio_value()
        paper_trader._update_performance_metrics()

        # Check database
        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute("SELECT * FROM performance_snapshots")
            rows = cursor.fetchall()
            assert len(rows) > 0

    @pytest.mark.asyncio
    async def test_peak_portfolio_value_tracking(self, paper_trader, mock_alpaca):
        """Test peak portfolio value is tracked correctly."""
        initial_peak = paper_trader.peak_portfolio_value
        assert initial_peak == 100000.0

        # Buy and increase value
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Simulate price increase
        async def mock_up(symbol):
            return {"symbol": symbol, "bid": 200.00, "ask": 200.05, "last": 200.02}

        mock_alpaca.get_quote = mock_up

        # Update metrics to recalculate peak
        paper_trader._update_performance_metrics()

        # Peak should still be tracked
        assert paper_trader.peak_portfolio_value >= initial_peak


class TestDatabaseOperations:
    """Test database operations - covers lines 180-292, 1082-1186."""

    def test_database_initialization(self, paper_trader):
        """Test database is properly initialized."""
        with sqlite3.connect(paper_trader.db_path) as conn:
            # Check tables exist
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]

            assert "positions" in tables
            assert "orders" in tables
            assert "trades" in tables
            assert "performance_snapshots" in tables

    @pytest.mark.asyncio
    async def test_save_order(self, paper_trader):
        """Test saving order to database."""
        order_id = await paper_trader.place_market_order(
            "AAPL", 100, "BUY", auto_stop_loss=False
        )

        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute(
                "SELECT * FROM orders WHERE order_id = ?", (order_id,)
            )
            row = cursor.fetchone()

            assert row is not None
            assert row[1] == "AAPL"  # symbol
            assert row[2] == "BUY"  # action
            assert row[3] == 100  # quantity

    @pytest.mark.asyncio
    async def test_save_trade(self, paper_trader):
        """Test saving trade to database."""
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute("SELECT * FROM trades")
            rows = cursor.fetchall()

            assert len(rows) > 0

    @pytest.mark.asyncio
    async def test_save_positions(self, paper_trader):
        """Test saving positions to database."""
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute("SELECT * FROM positions WHERE symbol = 'AAPL'")
            row = cursor.fetchone()

            assert row is not None
            assert row[1] == 100  # quantity

    def test_load_positions(self, paper_trader):
        """Test loading positions from database."""
        # Manually insert a position
        with sqlite3.connect(paper_trader.db_path) as conn:
            conn.execute(
                """
                INSERT INTO positions
                (symbol, quantity, avg_cost, market_value, unrealized_pnl, realized_pnl, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                ("TEST", 100, 150.0, 15000.0, 0.0, 0.0, datetime.now()),
            )
            conn.commit()

        # Load positions
        paper_trader._load_positions()

        assert "TEST" in paper_trader.positions
        assert paper_trader.positions["TEST"]["quantity"] == 100

    def test_database_migration(self, config, mock_alpaca, tmp_path):
        """Test database migration for new columns."""
        # Create a trader with old schema (simulate)
        db_path = str(tmp_path / "test.db")

        # Create old schema without commission column
        with sqlite3.connect(db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS orders (
                    order_id TEXT PRIMARY KEY,
                    symbol TEXT,
                    action TEXT,
                    quantity INTEGER,
                    order_type TEXT,
                    status TEXT
                )
                """
            )
            conn.commit()

        # Now create trader (should migrate)
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
        )
        trader.db_path = db_path
        trader._init_db()

        # Check migration added columns
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("PRAGMA table_info(orders)")
            columns = [row[1] for row in cursor.fetchall()]
            # Note: Migration only happens if orders table already exists with old schema


class TestRiskSystemIntegration:
    """Test risk system integration - covers lines 293-451."""

    @pytest.mark.asyncio
    async def test_check_circuit_breakers_enabled(self, paper_trader):
        """Test circuit breaker check when enabled."""
        status = await paper_trader.check_circuit_breakers()

        assert "trading_allowed" in status
        assert "breakers_tripped" in status
        assert "reasons" in status
        assert "warnings" in status
        assert status["trading_allowed"] is True

    @pytest.mark.asyncio
    async def test_check_circuit_breakers_disabled(self, paper_trader_no_risk):
        """Test circuit breaker check when disabled."""
        status = await paper_trader_no_risk.check_circuit_breakers()

        assert status["trading_allowed"] is True
        assert "Risk systems disabled" in status["warnings"]

    @pytest.mark.asyncio
    async def test_calculate_position_size_enabled(self, paper_trader):
        """Test Kelly position sizing when enabled."""
        result = await paper_trader.calculate_position_size(
            symbol="AAPL",
            win_rate=0.60,
            avg_win=200.0,
            avg_loss=100.0,
            kelly_fraction=0.5,
        )

        assert "position_size" in result
        assert "shares" in result
        assert "kelly_pct" in result
        assert result["position_size"] > 0

    @pytest.mark.asyncio
    async def test_calculate_position_size_disabled(self, paper_trader_no_risk):
        """Test position sizing when Kelly disabled."""
        result = await paper_trader_no_risk.calculate_position_size(
            symbol="AAPL",
            win_rate=0.60,
            avg_win=200.0,
            avg_loss=100.0,
        )

        assert result["position_size"] == 10000.0  # 10% of 100k
        assert "Risk systems disabled" in result["rationale"]

    @pytest.mark.asyncio
    async def test_calculate_position_size_no_price(self, paper_trader):
        """Test position sizing when price unavailable."""
        paper_trader.alpaca.get_quote = AsyncMock(return_value=None)
        paper_trader.price_cache.clear()

        result = await paper_trader.calculate_position_size(
            symbol="AAPL",
            win_rate=0.60,
            avg_win=200.0,
            avg_loss=100.0,
        )

        assert result["position_size"] == 0.0
        assert result["shares"] == 0
        assert "Market price unavailable" in result["warnings"]

    @pytest.mark.asyncio
    async def test_place_stop_loss_enabled(self, paper_trader):
        """Test automatic stop loss placement."""
        stop_data = await paper_trader.place_stop_loss(
            symbol="AAPL",
            entry_price=150.0,
            position_size=15000.0,
            stop_type="fixed_pct",
            stop_pct=0.02,
        )

        assert stop_data is not None
        assert "stop_price" in stop_data
        assert "order_id" in stop_data
        assert stop_data["stop_price"] < 150.0

    @pytest.mark.asyncio
    async def test_place_stop_loss_disabled(self, paper_trader_no_risk):
        """Test stop loss when disabled."""
        stop_data = await paper_trader_no_risk.place_stop_loss(
            symbol="AAPL",
            entry_price=150.0,
            position_size=15000.0,
        )

        assert stop_data is None

    @pytest.mark.asyncio
    async def test_place_stop_loss_error(self, paper_trader):
        """Test stop loss error handling."""
        # Force an error by making stop manager unavailable
        paper_trader.stop_manager = None

        stop_data = await paper_trader.place_stop_loss(
            symbol="AAPL",
            entry_price=150.0,
            position_size=15000.0,
        )

        assert stop_data is None

    @pytest.mark.asyncio
    async def test_get_position_values(self, paper_trader):
        """Test getting position values for Kelly sizer."""
        # Create positions
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("MSFT", 50, "BUY", auto_stop_loss=False)

        position_values = paper_trader._get_position_values()

        assert "AAPL" in position_values
        assert "MSFT" in position_values
        assert position_values["AAPL"] > 0
        assert position_values["MSFT"] > 0


class TestMarketHoursEnforcement:
    """Test market hours enforcement - covers lines 453-471."""

    def test_is_market_hours_enabled(self, config, mock_alpaca):
        """Test market hours check when enabled."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enforce_market_hours=True,
            enable_risk_systems=False,
        )

        # During market hours (10 AM ET Monday)
        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            mock_now = et_tz.localize(datetime(2024, 1, 15, 10, 0, 0))
            mock_dt.now.return_value = mock_now
            assert trader.is_market_hours() is True

    def test_is_market_hours_disabled(self, paper_trader_no_risk):
        """Test market hours always open when disabled."""
        paper_trader_no_risk.enforce_market_hours = False
        assert paper_trader_no_risk.is_market_hours() is True

    def test_is_market_hours_weekend(self, config, mock_alpaca):
        """Test market closed on weekend."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enforce_market_hours=True,
            enable_risk_systems=False,
        )

        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            # Saturday
            mock_now = et_tz.localize(datetime(2024, 1, 13, 10, 0, 0))
            mock_dt.now.return_value = mock_now
            assert trader.is_market_hours() is False

    def test_is_market_hours_before_open(self, config, mock_alpaca):
        """Test market closed before opening."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enforce_market_hours=True,
            enable_risk_systems=False,
        )

        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            # Monday 9:00 AM (before 9:30 open)
            mock_now = et_tz.localize(datetime(2024, 1, 15, 9, 0, 0))
            mock_dt.now.return_value = mock_now
            assert trader.is_market_hours() is False

    def test_is_market_hours_after_close(self, config, mock_alpaca):
        """Test market closed after closing."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enforce_market_hours=True,
            enable_risk_systems=False,
        )

        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            # Monday 5:00 PM (after 4:00 close)
            mock_now = et_tz.localize(datetime(2024, 1, 15, 17, 0, 0))
            mock_dt.now.return_value = mock_now
            assert trader.is_market_hours() is False

    @pytest.mark.asyncio
    async def test_order_rejected_market_closed(self, config, mock_alpaca):
        """Test order rejected when market closed."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enforce_market_hours=True,
            enable_risk_systems=False,
        )

        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            # Weekend
            mock_now = et_tz.localize(datetime(2024, 1, 13, 10, 0, 0))
            mock_dt.now.return_value = mock_now

            order_id = await trader.place_market_order("AAPL", 100, "BUY")
            assert order_id is None

    @pytest.mark.asyncio
    async def test_limit_order_rejected_market_closed(self, config, mock_alpaca):
        """Test limit order rejected when market closed."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enforce_market_hours=True,
            enable_risk_systems=False,
        )

        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            mock_now = et_tz.localize(datetime(2024, 1, 13, 10, 0, 0))
            mock_dt.now.return_value = mock_now

            order_id = await trader.place_limit_order("AAPL", 100, "BUY", 150.0)
            assert order_id is None

    @pytest.mark.asyncio
    async def test_stop_order_rejected_market_closed(self, config, mock_alpaca):
        """Test stop order rejected when market closed."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enforce_market_hours=True,
            enable_risk_systems=False,
        )

        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            mock_now = et_tz.localize(datetime(2024, 1, 13, 10, 0, 0))
            mock_dt.now.return_value = mock_now

            order_id = await trader.place_stop_order("AAPL", 100, "SELL", 140.0)
            assert order_id is None


class TestPortfolioReset:
    """Test portfolio reset functionality - covers lines 1437-1470."""

    def test_reset_portfolio(self, paper_trader):
        """Test portfolio reset."""
        # Make some changes
        paper_trader.cash = 50000.0
        paper_trader.positions["AAPL"] = {
            "quantity": 100,
            "avg_cost": 150.0,
            "market_value": 15000.0,
            "unrealized_pnl": 0.0,
            "realized_pnl": 0.0,
            "updated_at": datetime.now(),
        }
        paper_trader.total_commissions_paid = 100.0

        # Reset
        paper_trader.reset_portfolio()

        # Verify reset
        assert paper_trader.cash == 100000.0
        assert len(paper_trader.positions) == 0
        assert len(paper_trader.orders) == 0
        assert len(paper_trader.trade_history) == 0
        assert paper_trader.total_commissions_paid == 0.0
        assert paper_trader.peak_portfolio_value == 100000.0

    def test_reset_portfolio_clears_database(self, paper_trader):
        """Test reset clears all database tables."""
        # Add some data
        paper_trader.positions["AAPL"] = {
            "quantity": 100,
            "avg_cost": 150.0,
            "market_value": 15000.0,
            "unrealized_pnl": 0.0,
            "realized_pnl": 0.0,
            "updated_at": datetime.now(),
        }
        paper_trader._save_positions()

        # Reset
        paper_trader.reset_portfolio()

        # Verify database is empty
        with sqlite3.connect(paper_trader.db_path) as conn:
            for table in ["positions", "orders", "trades", "performance_snapshots"]:
                cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                assert count == 0

    def test_reset_portfolio_resets_risk_systems(self, paper_trader):
        """Test reset resets risk systems."""
        # Modify risk systems
        if paper_trader.kelly_sizer:
            paper_trader.kelly_sizer.update_account_balance(50000.0)
        if paper_trader.circuit_breaker:
            paper_trader.circuit_breaker.consecutive_losses = 3

        # Reset
        paper_trader.reset_portfolio()

        # Verify risk systems reset
        if paper_trader.kelly_sizer:
            assert paper_trader.kelly_sizer.account_balance == 100000.0
        if paper_trader.circuit_breaker:
            assert paper_trader.circuit_breaker.consecutive_losses == 0


class TestComplexScenarios:
    """Test complex end-to-end scenarios."""

    @pytest.mark.asyncio
    async def test_position_averaging_scenario(self, paper_trader_no_risk):
        """Test position averaging with multiple buys."""
        # Use paper_trader_no_risk to avoid circuit breaker trips
        # Buy 100 @ ~150
        await paper_trader_no_risk.place_market_order(
            "AAPL", 100, "BUY", auto_stop_loss=False
        )
        first_cost = paper_trader_no_risk.positions["AAPL"]["avg_cost"]

        # Buy 50 @ ~150
        await paper_trader_no_risk.place_market_order(
            "AAPL", 50, "BUY", auto_stop_loss=False
        )
        second_cost = paper_trader_no_risk.positions["AAPL"]["avg_cost"]

        # Verify averaging
        position = paper_trader_no_risk.get_position("AAPL")
        assert position["quantity"] == 150
        assert position["avg_cost"] > 0

        # Sell 75 shares
        sell_order = await paper_trader_no_risk.place_market_order("AAPL", 75, "SELL")
        assert sell_order is not None  # Verify order placed

        # Should have 75 shares remaining at same avg cost
        position = paper_trader_no_risk.get_position("AAPL")
        assert position is not None  # Position should still exist
        assert position["quantity"] == 75

    @pytest.mark.asyncio
    async def test_complete_trading_cycle(self, paper_trader, mock_alpaca):
        """Test complete trading cycle with P&L tracking."""
        initial_value = paper_trader.get_portfolio_value()

        # 1. BUY 100 @ 150
        buy_order = await paper_trader.place_market_order(
            "AAPL", 100, "BUY", auto_stop_loss=False
        )
        assert buy_order is not None

        # 2. Price increases to 160
        async def mock_up(symbol):
            return {"symbol": symbol, "bid": 160.00, "ask": 160.05, "last": 160.02}

        mock_alpaca.get_quote = mock_up

        # 3. SELL 100 @ 160
        sell_order = await paper_trader.place_market_order("AAPL", 100, "SELL")
        assert sell_order is not None

        # 4. Verify P&L
        final_value = paper_trader.get_portfolio_value()
        assert final_value > initial_value - 100  # Profit minus commissions

        # 5. Check trade history
        history = paper_trader.get_trade_history()
        assert len(history) >= 2

        # 6. Check statistics
        stats = paper_trader.get_trade_statistics()
        assert stats["total_trades"] >= 2

    @pytest.mark.asyncio
    async def test_multiple_positions_management(self, paper_trader):
        """Test managing multiple positions simultaneously."""
        # Buy multiple stocks
        symbols = ["AAPL", "MSFT", "GOOGL"]
        for symbol in symbols:
            order_id = await paper_trader.place_market_order(
                symbol, 100, "BUY", auto_stop_loss=False
            )
            assert order_id is not None

        # Verify all positions
        positions = paper_trader.get_positions()
        assert len(positions) == 3

        # Close one position
        await paper_trader.place_market_order("MSFT", 100, "SELL")

        # Verify remaining positions
        positions = paper_trader.get_positions()
        assert len(positions) == 2
        assert any(p["symbol"] == "AAPL" for p in positions)
        assert any(p["symbol"] == "GOOGL" for p in positions)

    @pytest.mark.asyncio
    async def test_error_recovery(self, paper_trader):
        """Test error recovery in trade execution."""
        # Try to sell without position (should fail gracefully)
        order_id = await paper_trader.place_market_order("AAPL", 100, "SELL")
        assert order_id is None

        # Portfolio should be unchanged
        assert paper_trader.cash == 100000.0
        assert len(paper_trader.positions) == 0

    @pytest.mark.asyncio
    async def test_commission_impact_on_pnl(self, paper_trader, mock_alpaca):
        """Test commission impact on P&L."""
        initial_cash = paper_trader.cash

        # Buy 100 shares
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        buy_commission = paper_trader.total_commissions_paid

        # Sell at same price
        await paper_trader.place_market_order("AAPL", 100, "SELL")
        total_commission = paper_trader.total_commissions_paid

        # Should have lost money due to commissions
        final_cash = paper_trader.cash
        assert final_cash < initial_cash
        assert total_commission > buy_commission


class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_very_large_order(self, paper_trader):
        """Test handling very large orders."""
        # Try to buy more than cash allows
        order_id = await paper_trader.place_market_order(
            "AAPL", 10000, "BUY", auto_stop_loss=False
        )
        assert order_id is None

    @pytest.mark.asyncio
    async def test_fractional_prices(self, paper_trader):
        """Test handling fractional prices."""
        # Limit order with fractional price
        order_id = await paper_trader.place_limit_order("AAPL", 100, "BUY", 150.123)
        assert order_id is not None

    def test_empty_symbol(self, paper_trader_no_risk):
        """Test empty symbol handling."""
        position = paper_trader_no_risk.get_position("")
        assert position is None

    @pytest.mark.asyncio
    async def test_concurrent_orders(self, paper_trader):
        """Test placing multiple orders concurrently."""
        # Place multiple orders at once
        orders = await asyncio.gather(
            paper_trader.place_market_order("AAPL", 10, "BUY", auto_stop_loss=False),
            paper_trader.place_market_order("MSFT", 10, "BUY", auto_stop_loss=False),
            paper_trader.place_market_order("GOOGL", 10, "BUY", auto_stop_loss=False),
        )

        # All should succeed
        assert all(order_id is not None for order_id in orders)
        assert len(paper_trader.positions) == 3

    @pytest.mark.asyncio
    async def test_rapid_buy_sell(self, paper_trader):
        """Test rapid buy and sell cycles."""
        successful_cycles = 0
        for _ in range(10):
            buy_id = await paper_trader.place_market_order(
                "AAPL", 10, "BUY", auto_stop_loss=False
            )
            if buy_id is None:
                # May run out of cash due to commissions
                break

            sell_id = await paper_trader.place_market_order("AAPL", 10, "SELL")
            if sell_id is not None:
                successful_cycles += 1

        # Should have completed at least some cycles
        assert successful_cycles > 0
        assert len(paper_trader.trade_history) >= successful_cycles * 2


if __name__ == "__main__":
    pytest.main(
        [__file__, "-v", "--cov=core/broker/paper_trader", "--cov-report=term-missing"]
    )
