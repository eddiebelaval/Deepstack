"""
Comprehensive Tests for Enhanced Paper Trader

Tests all enhancements:
- Circuit breaker integration
- Kelly position sizing integration
- Automatic stop loss placement
- Commission tracking
- Performance analytics (Sharpe ratio, max drawdown, win rate)
- Real market data integration
- Market hours enforcement
- Enhanced slippage model
- End-to-end trade scenarios
"""

import sqlite3
from datetime import datetime, time
from unittest.mock import AsyncMock, patch

import pytest
import pytz

from core.broker.paper_trader import PaperTrader
from core.config import Config
from core.data.alpaca_client import AlpacaClient
from core.risk.circuit_breaker import CircuitBreaker
from core.risk.kelly_position_sizer import KellyPositionSizer
from core.risk.stop_loss_manager import StopLossManager


@pytest.fixture
def config():
    """Create test configuration."""
    return Config()


@pytest.fixture
def mock_alpaca():
    """Create mock Alpaca client."""
    mock = AsyncMock(spec=AlpacaClient)

    # Default quote response as AsyncMock with side_effect for proper mock tracking
    async def _get_quote_impl(symbol):
        return {
            "symbol": symbol,
            "bid": 150.00,
            "ask": 150.05,
            "last": 150.02,
            "timestamp": datetime.now().isoformat(),
        }

    mock.get_quote = AsyncMock(side_effect=_get_quote_impl)
    return mock


@pytest.fixture
def paper_trader(config, mock_alpaca):
    """Create paper trader with mocked dependencies."""
    trader = PaperTrader(
        config=config,
        alpaca_client=mock_alpaca,
        enable_risk_systems=True,
        commission_per_trade=1.0,  # $1 per trade
        commission_per_share=0.005,  # $0.005 per share
        enforce_market_hours=False,  # Disable for testing
    )
    # Clear any existing DB state
    trader.reset_portfolio()
    return trader


@pytest.fixture
def paper_trader_no_risk(config, mock_alpaca):
    """Create paper trader without risk systems for baseline testing."""
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


class TestInitialization:
    """Test paper trader initialization."""

    def test_init_with_risk_systems(self, config, mock_alpaca):
        """Test initialization with risk systems enabled."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=True,
        )

        assert trader.enable_risk_systems is True
        assert trader.kelly_sizer is not None
        assert trader.stop_manager is not None
        assert trader.circuit_breaker is not None
        assert trader.cash == 100000.0
        assert trader.initial_cash == 100000.0

    def test_init_without_risk_systems(self, config, mock_alpaca):
        """Test initialization with risk systems disabled."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
        )

        assert trader.enable_risk_systems is False
        assert trader.kelly_sizer is None
        assert trader.stop_manager is None
        assert trader.circuit_breaker is None

    def test_init_with_custom_risk_components(self, config, mock_alpaca):
        """Test initialization with custom risk components."""
        kelly = KellyPositionSizer(account_balance=100000)
        stop_mgr = StopLossManager(account_balance=100000)
        breaker = CircuitBreaker(initial_portfolio_value=100000)

        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            kelly_sizer=kelly,
            stop_manager=stop_mgr,
            circuit_breaker=breaker,
            enable_risk_systems=True,
        )

        assert trader.kelly_sizer is kelly
        assert trader.stop_manager is stop_mgr
        assert trader.circuit_breaker is breaker

    def test_init_commission_settings(self, config, mock_alpaca):
        """Test initialization with commission settings."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            commission_per_trade=5.0,
            commission_per_share=0.01,
        )

        assert trader.commission_per_trade == 5.0
        assert trader.commission_per_share == 0.01

    def test_init_market_hours_setting(self, config, mock_alpaca):
        """Test initialization with market hours enforcement."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            enforce_market_hours=True,
        )

        assert trader.enforce_market_hours is True
        assert trader.market_open_time == time(9, 30)
        assert trader.market_close_time == time(16, 0)
        assert trader.market_timezone == pytz.timezone("America/New_York")


class TestCircuitBreakerIntegration:
    """Test circuit breaker integration."""

    @pytest.mark.asyncio
    async def test_check_circuit_breakers_allowed(self, paper_trader):
        """Test circuit breakers allow trading when not tripped."""
        status = await paper_trader.check_circuit_breakers()

        assert status["trading_allowed"] is True
        assert len(status["breakers_tripped"]) == 0

    @pytest.mark.asyncio
    async def test_check_circuit_breakers_disabled(self, paper_trader_no_risk):
        """Test circuit breakers when disabled."""
        status = await paper_trader_no_risk.check_circuit_breakers()

        assert status["trading_allowed"] is True
        assert "Risk systems disabled" in status["warnings"]

    @pytest.mark.asyncio
    async def test_order_rejected_when_breaker_tripped(self, paper_trader):
        """Test order is rejected when circuit breaker is tripped."""
        # Trip the manual breaker (use 'manual' instead of 'daily_loss' because
        # daily_loss auto-resets when a new trading day is detected, and since
        # current_day starts as None, check_breakers thinks it's a new day)
        paper_trader.circuit_breaker.trip_breaker("manual", "Test trip")

        # Try to place order
        order_id = await paper_trader.place_market_order("AAPL", 100, "BUY")

        assert order_id is None

    @pytest.mark.asyncio
    async def test_consecutive_losses_trigger_breaker(self, paper_trader):
        """Test consecutive losses trigger circuit breaker."""
        # Simulate 5 consecutive losing trades
        for i in range(5):
            paper_trader.circuit_breaker.record_trade(-100.0)

        status = await paper_trader.check_circuit_breakers()

        assert status["trading_allowed"] is False
        assert "consecutive_losses" in status["breakers_tripped"]

    @pytest.mark.asyncio
    async def test_breaker_tracks_pnl(self, paper_trader, mock_alpaca):
        """Test circuit breaker tracks P&L from trades."""
        # Buy
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Sell at a loss (simulate price drop)
        async def mock_lower_price(symbol):
            return {
                "symbol": symbol,
                "bid": 140.00,
                "ask": 140.05,
                "last": 140.02,
            }

        mock_alpaca.get_quote = mock_lower_price

        await paper_trader.place_market_order("AAPL", 100, "SELL")

        # Check that circuit breaker recorded the loss
        assert paper_trader.circuit_breaker.consecutive_losses == 1


class TestKellyPositionSizing:
    """Test Kelly Criterion position sizing integration."""

    @pytest.mark.asyncio
    async def test_calculate_position_size_with_kelly(self, paper_trader):
        """Test position size calculation with Kelly sizer."""
        result = await paper_trader.calculate_position_size(
            symbol="AAPL",
            win_rate=0.60,
            avg_win=200.0,
            avg_loss=100.0,
            kelly_fraction=0.5,
        )

        assert result["position_size"] > 0
        assert result["shares"] is not None
        assert result["kelly_pct"] > 0
        assert result["win_loss_ratio"] == 2.0

    @pytest.mark.asyncio
    async def test_position_size_respects_portfolio_heat(
        self, paper_trader, mock_alpaca
    ):
        """Test position sizing respects portfolio heat limits."""
        # Buy first position (should be ~25% of portfolio)
        result1 = await paper_trader.calculate_position_size(
            symbol="AAPL",
            win_rate=0.60,
            avg_win=200.0,
            avg_loss=100.0,
        )

        await paper_trader.place_market_order(
            "AAPL", result1["shares"], "BUY", auto_stop_loss=False
        )

        # Try to buy second position - should be smaller due to heat
        result2 = await paper_trader.calculate_position_size(
            symbol="MSFT",
            win_rate=0.60,
            avg_win=200.0,
            avg_loss=100.0,
        )

        # Portfolio heat should be > 0 now
        assert result2["portfolio_heat"] > 0

    @pytest.mark.asyncio
    async def test_position_size_zero_on_no_price(self, paper_trader):
        """Test position size is zero when price unavailable."""
        # Mock Alpaca to return None
        paper_trader.alpaca.get_quote = AsyncMock(return_value=None)

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
    async def test_position_size_without_kelly(self, paper_trader_no_risk):
        """Test position sizing fallback when Kelly disabled."""
        result = await paper_trader_no_risk.calculate_position_size(
            symbol="AAPL",
            win_rate=0.60,
            avg_win=200.0,
            avg_loss=100.0,
        )

        # Should fallback to 10% of portfolio
        expected_size = 100000 * 0.10
        assert abs(result["position_size"] - expected_size) < 1.0
        assert "Risk systems disabled" in result["rationale"]


class TestStopLossIntegration:
    """Test stop loss manager integration."""

    @pytest.mark.asyncio
    async def test_automatic_stop_loss_placement(self, paper_trader):
        """Test automatic stop loss placement on buy orders."""
        # Place buy order with auto stop loss
        order_id = await paper_trader.place_market_order(
            "AAPL", 100, "BUY", auto_stop_loss=True, stop_pct=0.02
        )

        assert order_id is not None

        # Check that stop was placed
        assert "AAPL" in paper_trader.stop_manager.active_stops
        stop = paper_trader.stop_manager.active_stops["AAPL"]
        assert stop["stop_price"] > 0

    @pytest.mark.asyncio
    async def test_manual_stop_loss_placement(self, paper_trader):
        """Test manual stop loss placement."""
        entry_price = 150.0
        position_size = 15000.0

        stop_data = await paper_trader.place_stop_loss(
            symbol="AAPL",
            entry_price=entry_price,
            position_size=position_size,
            stop_type="fixed_pct",
            stop_pct=0.02,
        )

        assert stop_data is not None
        assert stop_data["stop_price"] < entry_price
        assert stop_data["risk_amount"] > 0
        assert stop_data["order_id"] is not None

    @pytest.mark.asyncio
    async def test_stop_loss_calculation_accuracy(self, paper_trader):
        """Test stop loss calculation is accurate."""
        entry_price = 100.0
        position_size = 10000.0
        stop_pct = 0.02  # 2%

        stop_data = await paper_trader.place_stop_loss(
            symbol="AAPL",
            entry_price=entry_price,
            position_size=position_size,
            stop_pct=stop_pct,
        )

        # Stop should be 2% below entry
        expected_stop = entry_price * (1 - stop_pct)
        assert abs(stop_data["stop_price"] - expected_stop) < 0.01

        # Risk should be 2% of position
        expected_risk = position_size * stop_pct
        assert abs(stop_data["risk_amount"] - expected_risk) < 1.0

    @pytest.mark.asyncio
    async def test_no_stop_when_disabled(self, paper_trader_no_risk):
        """Test no stop loss when risk systems disabled."""
        stop_data = await paper_trader_no_risk.place_stop_loss(
            symbol="AAPL",
            entry_price=150.0,
            position_size=15000.0,
        )

        assert stop_data is None


class TestCommissionTracking:
    """Test commission tracking."""

    @pytest.mark.asyncio
    async def test_commission_per_trade(self, config, mock_alpaca):
        """Test per-trade commission."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            commission_per_trade=5.0,
            commission_per_share=0.0,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )

        await trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        assert trader.total_commissions_paid == 5.0

    @pytest.mark.asyncio
    async def test_commission_per_share(self, config, mock_alpaca):
        """Test per-share commission."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            commission_per_trade=0.0,
            commission_per_share=0.01,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )

        await trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # 100 shares * $0.01 = $1.00
        assert trader.total_commissions_paid == 1.0

    @pytest.mark.asyncio
    async def test_blended_commission(self, config, mock_alpaca):
        """Test blended commission (per-trade + per-share)."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            commission_per_trade=1.0,
            commission_per_share=0.005,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )

        await trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # $1.00 + (100 * $0.005) = $1.50
        assert trader.total_commissions_paid == 1.5

    @pytest.mark.asyncio
    async def test_commission_affects_cost_basis(self, config, mock_alpaca):
        """Test commission is included in cost basis."""
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            commission_per_trade=10.0,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )

        await trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        position = trader.get_position("AAPL")
        # Cost basis should include commission
        # (100 shares * ~$150/share + $10 commission) / 100 shares
        assert position["avg_cost"] > 150.0


class TestPerformanceAnalytics:
    """Test performance analytics."""

    @pytest.mark.asyncio
    async def test_sharpe_ratio_calculation(self, paper_trader, mock_alpaca):
        """Test Sharpe ratio calculation."""
        # Execute some trades with P&L
        for i in range(10):
            await paper_trader.place_market_order(
                "AAPL", 100, "BUY", auto_stop_loss=False
            )

            # Simulate price change
            if i % 2 == 0:
                # Win
                async def mock_higher_price(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 155.00,
                        "ask": 155.05,
                        "last": 155.02,
                    }

                mock_alpaca.get_quote = mock_higher_price
            else:
                # Loss
                async def mock_lower_price(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 145.00,
                        "ask": 145.05,
                        "last": 145.02,
                    }

                mock_alpaca.get_quote = mock_lower_price

            await paper_trader.place_market_order("AAPL", 100, "SELL")

            # Reset price
            async def mock_normal_price(symbol):
                return {"symbol": symbol, "bid": 150.00, "ask": 150.05, "last": 150.02}

            mock_alpaca.get_quote = mock_normal_price

        sharpe = paper_trader.calculate_sharpe_ratio()

        # Should have a Sharpe ratio (could be positive or negative)
        assert sharpe is not None

    @pytest.mark.asyncio
    async def test_max_drawdown_calculation(self, paper_trader, mock_alpaca):
        """Test max drawdown calculation."""
        # Initial portfolio value
        initial_value = paper_trader.get_portfolio_value()

        # Buy at 150
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Simulate price drop to 120
        async def mock_lower_price(symbol):
            return {"symbol": symbol, "bid": 120.00, "ask": 120.05, "last": 120.02}

        mock_alpaca.get_quote = mock_lower_price

        # Update position value (manually for test)
        paper_trader.positions["AAPL"]["market_value"] = 100 * 120.0

        drawdown = paper_trader.calculate_max_drawdown()

        assert drawdown["max_drawdown_pct"] > 0
        assert drawdown["max_drawdown_dollars"] > 0
        assert drawdown["peak_value"] == initial_value
        assert drawdown["current_value"] < initial_value

    @pytest.mark.asyncio
    async def test_trade_statistics(self, paper_trader, mock_alpaca):
        """Test trade statistics calculation."""
        # Execute mix of winning and losing trades
        for i in range(5):
            await paper_trader.place_market_order(
                "AAPL", 100, "BUY", auto_stop_loss=False
            )

            if i < 3:
                # Win
                async def mock_higher_price(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 160.00,
                        "ask": 160.05,
                        "last": 160.02,
                    }

                mock_alpaca.get_quote = mock_higher_price
            else:
                # Loss
                async def mock_lower_price(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 140.00,
                        "ask": 140.05,
                        "last": 140.02,
                    }

                mock_alpaca.get_quote = mock_lower_price

            await paper_trader.place_market_order("AAPL", 100, "SELL")

            # Reset price
            async def mock_normal_price(symbol):
                return {"symbol": symbol, "bid": 150.00, "ask": 150.05, "last": 150.02}

            mock_alpaca.get_quote = mock_normal_price

        stats = paper_trader.get_trade_statistics()

        assert stats["total_trades"] == 10  # 5 buys + 5 sells
        assert stats["winning_trades"] == 3
        assert stats["losing_trades"] == 2
        assert stats["win_rate"] == 0.6  # 3/5
        assert stats["avg_win"] > 0
        assert stats["avg_loss"] > 0

    @pytest.mark.asyncio
    async def test_performance_summary(self, paper_trader):
        """Test comprehensive performance summary."""
        summary = paper_trader.get_performance_summary()

        assert "portfolio_value" in summary
        assert "total_pnl" in summary
        assert "total_return_pct" in summary
        assert "sharpe_ratio" in summary
        assert "max_drawdown_pct" in summary
        assert "win_rate" in summary
        assert "total_commissions" in summary


class TestMarketDataIntegration:
    """Test real market data integration with Alpaca."""

    @pytest.mark.asyncio
    async def test_get_market_price_from_alpaca(self, paper_trader, mock_alpaca):
        """Test getting market price from Alpaca."""
        price = await paper_trader._get_market_price("AAPL")

        assert price is not None
        assert price > 0
        mock_alpaca.get_quote.assert_called()

    @pytest.mark.asyncio
    async def test_price_cache_on_alpaca_failure(self, paper_trader, mock_alpaca):
        """Test price caching when Alpaca fails."""
        # First call succeeds
        price1 = await paper_trader._get_market_price("AAPL")
        assert price1 is not None

        # Second call fails but uses cache
        mock_alpaca.get_quote = AsyncMock(side_effect=Exception("API Error"))
        price2 = await paper_trader._get_market_price("AAPL")

        assert price2 == price1  # Should use cached price

    @pytest.mark.asyncio
    async def test_no_price_available(self, paper_trader):
        """Test handling when no price available."""
        # Mock Alpaca to fail and clear cache
        paper_trader.alpaca.get_quote = AsyncMock(return_value=None)
        paper_trader.price_cache.clear()

        price = await paper_trader._get_market_price("AAPL")

        assert price is None

    @pytest.mark.asyncio
    async def test_order_fails_without_price(self, paper_trader):
        """Test order fails when price unavailable."""
        paper_trader.alpaca.get_quote = AsyncMock(return_value=None)
        paper_trader.price_cache.clear()

        order_id = await paper_trader.place_market_order("AAPL", 100, "BUY")

        assert order_id is None


class TestMarketHours:
    """Test market hours enforcement."""

    def test_market_hours_check_during_trading(self, paper_trader):
        """Test market hours check during trading hours."""
        # Create a datetime during market hours (10 AM ET)
        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            mock_now = et_tz.localize(datetime(2024, 1, 15, 10, 0, 0))  # Monday 10 AM
            mock_dt.now.return_value = mock_now

            paper_trader.enforce_market_hours = True
            is_open = paper_trader.is_market_hours()

            # Should be open (9:30 AM - 4:00 PM ET)
            assert is_open is True

    def test_market_hours_check_before_open(self, paper_trader):
        """Test market hours check before market opens."""
        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            mock_now = et_tz.localize(datetime(2024, 1, 15, 9, 0, 0))  # Monday 9 AM
            mock_dt.now.return_value = mock_now

            paper_trader.enforce_market_hours = True
            is_open = paper_trader.is_market_hours()

            assert is_open is False

    def test_market_hours_check_after_close(self, paper_trader):
        """Test market hours check after market closes."""
        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            mock_now = et_tz.localize(datetime(2024, 1, 15, 17, 0, 0))  # Monday 5 PM
            mock_dt.now.return_value = mock_now

            paper_trader.enforce_market_hours = True
            is_open = paper_trader.is_market_hours()

            assert is_open is False

    def test_market_hours_check_weekend(self, paper_trader):
        """Test market hours check on weekend."""
        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            mock_now = et_tz.localize(datetime(2024, 1, 13, 10, 0, 0))  # Saturday 10 AM
            mock_dt.now.return_value = mock_now

            paper_trader.enforce_market_hours = True
            is_open = paper_trader.is_market_hours()

            assert is_open is False

    @pytest.mark.asyncio
    async def test_order_rejected_outside_hours(self, paper_trader, mock_alpaca):
        """Test order rejected outside market hours."""
        et_tz = pytz.timezone("America/New_York")
        with patch("core.broker.paper_trader.datetime") as mock_dt:
            mock_now = et_tz.localize(
                datetime(2024, 1, 15, 8, 0, 0)
            )  # Monday 8 AM (before open)
            mock_dt.now.return_value = mock_now

            paper_trader.enforce_market_hours = True
            order_id = await paper_trader.place_market_order("AAPL", 100, "BUY")

            assert order_id is None

    def test_market_hours_disabled(self, paper_trader):
        """Test market hours check when disabled."""
        paper_trader.enforce_market_hours = False
        is_open = paper_trader.is_market_hours()

        # Should always be open when disabled
        assert is_open is True


class TestSlippageModel:
    """Test enhanced slippage modeling."""

    def test_slippage_calculation_buy(self, paper_trader):
        """Test slippage calculation for buy orders."""
        market_price = 100.0
        fill_price = paper_trader._calculate_slippage(market_price, "BUY", 100)

        # Buy should have positive slippage (pay more)
        assert fill_price > market_price

    def test_slippage_calculation_sell(self, paper_trader):
        """Test slippage calculation for sell orders."""
        market_price = 100.0
        fill_price = paper_trader._calculate_slippage(market_price, "SELL", 100)

        # Sell should have negative slippage (receive less)
        assert fill_price < market_price

    def test_slippage_increases_with_size(self, paper_trader):
        """Test slippage increases with order size on average.

        Note: Slippage has a random component, so we run multiple iterations
        and compare averages to avoid flaky test failures.
        """
        market_price = 100.0
        iterations = 50  # Run enough iterations to get stable averages

        # Small orders
        small_slippages = []
        for _ in range(iterations):
            fill_price = paper_trader._calculate_slippage(market_price, "BUY", 100)
            small_slippages.append(fill_price - market_price)
        avg_slippage_small = sum(small_slippages) / len(small_slippages)

        # Large orders
        large_slippages = []
        for _ in range(iterations):
            fill_price = paper_trader._calculate_slippage(market_price, "BUY", 1000)
            large_slippages.append(fill_price - market_price)
        avg_slippage_large = sum(large_slippages) / len(large_slippages)

        # Larger order should have more slippage on average
        assert avg_slippage_large >= avg_slippage_small

    def test_slippage_minimum(self, paper_trader):
        """Test minimum slippage is enforced."""
        market_price = 1.0  # Very low price
        fill_price = paper_trader._calculate_slippage(market_price, "BUY", 10)

        slippage = fill_price - market_price
        # Should respect minimum slippage
        assert slippage >= paper_trader.min_slippage

    def test_slippage_volatility_multiplier(self, config, mock_alpaca):
        """Test volatility multiplier affects slippage."""
        # Normal volatility
        trader1 = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            slippage_volatility_multiplier=1.0,
            enable_risk_systems=False,
        )

        # High volatility
        trader2 = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            slippage_volatility_multiplier=2.0,
            enable_risk_systems=False,
        )

        market_price = 100.0

        # Calculate average slippage over multiple orders
        slippage1 = []
        slippage2 = []
        for _ in range(100):
            fill1 = trader1._calculate_slippage(market_price, "BUY", 100)
            fill2 = trader2._calculate_slippage(market_price, "BUY", 100)
            slippage1.append(fill1 - market_price)
            slippage2.append(fill2 - market_price)

        avg_slippage1 = sum(slippage1) / len(slippage1)
        avg_slippage2 = sum(slippage2) / len(slippage2)

        # High volatility should have approximately 2x slippage
        assert avg_slippage2 > avg_slippage1


class TestEndToEndTradeScenarios:
    """Test complete end-to-end trade scenarios."""

    @pytest.mark.asyncio
    async def test_simple_buy_and_sell(self, paper_trader, mock_alpaca):
        """Test simple buy and sell cycle."""
        initial_cash = paper_trader.cash

        # Buy 100 shares
        buy_order = await paper_trader.place_market_order(
            "AAPL", 100, "BUY", auto_stop_loss=False
        )
        assert buy_order is not None

        # Check position
        position = paper_trader.get_position("AAPL")
        assert position is not None
        assert position["quantity"] == 100

        # Sell 100 shares
        sell_order = await paper_trader.place_market_order("AAPL", 100, "SELL")
        assert sell_order is not None

        # Position should be closed
        position_after = paper_trader.get_position("AAPL")
        assert position_after is None

        # Cash should be close to initial (minus commissions and slippage)
        assert paper_trader.cash < initial_cash  # Lost to commissions

    @pytest.mark.asyncio
    async def test_multiple_positions(self, paper_trader, mock_alpaca):
        """Test managing multiple positions."""
        # Buy multiple stocks
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("MSFT", 50, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("GOOGL", 25, "BUY", auto_stop_loss=False)

        positions = paper_trader.get_positions()
        assert len(positions) == 3

    @pytest.mark.asyncio
    async def test_partial_position_sell(self, paper_trader):
        """Test selling partial position."""
        # Buy 100 shares
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Sell 50 shares
        await paper_trader.place_market_order("AAPL", 50, "SELL")

        # Should still have 50 shares
        position = paper_trader.get_position("AAPL")
        assert position["quantity"] == 50

    @pytest.mark.asyncio
    async def test_profitable_trade_cycle(self, paper_trader, mock_alpaca):
        """Test profitable trade cycle."""
        initial_value = paper_trader.get_portfolio_value()

        # Buy at 150
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Price increases to 160
        async def mock_higher_price(symbol):
            return {"symbol": symbol, "bid": 160.00, "ask": 160.05, "last": 160.02}

        mock_alpaca.get_quote = mock_higher_price

        # Sell at 160
        await paper_trader.place_market_order("AAPL", 100, "SELL")

        final_value = paper_trader.get_portfolio_value()

        # Should have profit (minus commissions)
        assert final_value > initial_value

    @pytest.mark.asyncio
    async def test_losing_trade_cycle(self, paper_trader, mock_alpaca):
        """Test losing trade cycle."""
        initial_value = paper_trader.get_portfolio_value()

        # Buy at 150
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Price decreases to 140
        async def mock_lower_price(symbol):
            return {"symbol": symbol, "bid": 140.00, "ask": 140.05, "last": 140.02}

        mock_alpaca.get_quote = mock_lower_price

        # Sell at 140
        await paper_trader.place_market_order("AAPL", 100, "SELL")

        final_value = paper_trader.get_portfolio_value()

        # Should have loss
        assert final_value < initial_value

    @pytest.mark.asyncio
    async def test_ten_consecutive_trades(self, paper_trader, mock_alpaca):
        """Test executing 10+ paper trades end-to-end."""
        initial_value = paper_trader.get_portfolio_value()

        # Execute 12 trades (6 buy/sell cycles)
        for i in range(6):
            # Buy
            buy_order = await paper_trader.place_market_order(
                "AAPL", 100, "BUY", auto_stop_loss=False
            )
            assert buy_order is not None

            # Simulate random price movement
            if i % 2 == 0:
                # Price up
                async def mock_up(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 155.00,
                        "ask": 155.05,
                        "last": 155.02,
                    }

                mock_alpaca.get_quote = mock_up
            else:
                # Price down
                async def mock_down(symbol):
                    return {
                        "symbol": symbol,
                        "bid": 145.00,
                        "ask": 145.05,
                        "last": 145.02,
                    }

                mock_alpaca.get_quote = mock_down

            # Sell
            sell_order = await paper_trader.place_market_order("AAPL", 100, "SELL")
            assert sell_order is not None

            # Reset price
            async def mock_reset(symbol):
                return {"symbol": symbol, "bid": 150.00, "ask": 150.05, "last": 150.02}

            mock_alpaca.get_quote = mock_reset

        # Should have executed 12 trades total
        assert len(paper_trader.trade_history) >= 12

        # Should have trade statistics
        stats = paper_trader.get_trade_statistics()
        assert stats["total_trades"] >= 12

    @pytest.mark.asyncio
    async def test_full_risk_integration_workflow(self, paper_trader, mock_alpaca):
        """Test complete workflow with all risk systems."""
        # 1. Check circuit breakers (should be armed)
        breaker_status = await paper_trader.check_circuit_breakers()
        assert breaker_status["trading_allowed"] is True

        # 2. Calculate position size with Kelly
        kelly_result = await paper_trader.calculate_position_size(
            symbol="AAPL",
            win_rate=0.60,
            avg_win=200.0,
            avg_loss=100.0,
        )
        shares = kelly_result["shares"]
        assert shares > 0

        # 3. Place market order (auto stop loss)
        order_id = await paper_trader.place_market_order(
            "AAPL", shares, "BUY", auto_stop_loss=True, stop_pct=0.02
        )
        assert order_id is not None

        # 4. Verify stop was placed
        assert "AAPL" in paper_trader.stop_manager.active_stops

        # 5. Check performance metrics
        summary = paper_trader.get_performance_summary()
        assert summary["num_trades"] > 0
        assert summary["total_commissions"] > 0


class TestDatabasePersistence:
    """Test database persistence."""

    def test_positions_saved_to_db(self, paper_trader):
        """Test positions are saved to database."""
        # Manually create a position
        paper_trader.positions["AAPL"] = {
            "quantity": 100,
            "avg_cost": 150.0,
            "market_value": 15000.0,
            "unrealized_pnl": 0.0,
            "realized_pnl": 0.0,
            "updated_at": datetime.now(),
        }

        paper_trader._save_positions()

        # Query database
        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute("SELECT * FROM positions WHERE symbol = 'AAPL'")
            row = cursor.fetchone()

        assert row is not None
        assert row[1] == 100  # quantity

    @pytest.mark.asyncio
    async def test_trades_saved_to_db(self, paper_trader):
        """Test trades are saved to database."""
        # Execute a trade
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Query database
        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute("SELECT * FROM trades")
            rows = cursor.fetchall()

        assert len(rows) > 0

    @pytest.mark.asyncio
    async def test_performance_snapshots_saved(self, paper_trader):
        """Test performance snapshots are saved."""
        # Execute a trade (triggers snapshot)
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Query database
        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute("SELECT * FROM performance_snapshots")
            rows = cursor.fetchall()

        assert len(rows) > 0

    def test_reset_portfolio_clears_db(self, paper_trader):
        """Test reset clears database."""
        # Create some data
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

        # Check database is empty
        with sqlite3.connect(paper_trader.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM positions")
            count = cursor.fetchone()[0]

        assert count == 0


class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_insufficient_cash(self, paper_trader, mock_alpaca):
        """Test handling insufficient cash."""
        # Set cash to very low amount
        paper_trader.cash = 100.0

        # Try to buy expensive position
        order_id = await paper_trader.place_market_order(
            "AAPL", 1000, "BUY", auto_stop_loss=False
        )

        # Should fail
        assert order_id is None

    @pytest.mark.asyncio
    async def test_insufficient_position(self, paper_trader):
        """Test handling insufficient position."""
        # Try to sell without owning
        order_id = await paper_trader.place_market_order("AAPL", 100, "SELL")

        # Should fail
        assert order_id is None

    @pytest.mark.asyncio
    async def test_zero_quantity_order(self, paper_trader):
        """Test handling zero quantity order."""
        # This should be caught by validation - returns None instead of raising
        order_id = await paper_trader.place_market_order("AAPL", 0, "BUY")
        assert order_id is None  # Validation rejects zero quantity orders

    def test_negative_commission(self, config, mock_alpaca):
        """Test handling negative commission."""
        # Negative commission should work (rebate scenario)
        trader = PaperTrader(
            config=config,
            alpaca_client=mock_alpaca,
            commission_per_trade=-1.0,  # Rebate
            enable_risk_systems=False,
        )

        assert trader.commission_per_trade == -1.0

    @pytest.mark.asyncio
    async def test_empty_trade_history_analytics(self, paper_trader):
        """Test analytics with empty trade history."""
        sharpe = paper_trader.calculate_sharpe_ratio()
        assert sharpe is None

        stats = paper_trader.get_trade_statistics()
        assert stats["total_trades"] == 0
        assert stats["win_rate"] == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
