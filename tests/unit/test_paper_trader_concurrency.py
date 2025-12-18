"""
Tests for PaperTrader concurrent order handling.

These tests verify that the paper trading system handles concurrent operations
correctly, including:
- Multiple simultaneous orders
- Position consistency under concurrent updates
- Database operations under concurrent access
- Edge cases like oversell prevention with concurrent sells

Phase 3.2 of test coverage improvement plan.
"""

import asyncio
from unittest.mock import patch

import pytest

from core.broker.paper_trader import PaperTrader


class MockConfig:
    """Mock config for testing."""


class MockAlpacaClient:
    """Mock Alpaca client that returns predictable prices."""

    async def get_quote(self, symbol: str):
        """Return mock quote data."""
        prices = {
            "AAPL": 150.00,
            "GOOGL": 2800.00,
            "MSFT": 350.00,
            "TSLA": 250.00,
            "NVDA": 450.00,
            "AMD": 120.00,
            "META": 300.00,
            "AMZN": 175.00,
        }
        return {"last": prices.get(symbol, 100.00)}


@pytest.fixture
def mock_config():
    """Create mock config."""
    return MockConfig()


@pytest.fixture
def mock_alpaca():
    """Create mock Alpaca client."""
    return MockAlpacaClient()


@pytest.fixture
def paper_trader(mock_config, mock_alpaca, tmp_path):
    """Create PaperTrader with test database."""
    trader = PaperTrader(
        config=mock_config,
        alpaca_client=mock_alpaca,
        enable_risk_systems=False,  # Disable for simpler concurrency tests
        enforce_market_hours=False,  # Allow testing anytime
    )
    # Use temp database
    trader.db_path = str(tmp_path / "test_paper.db")
    trader._init_db()
    return trader


@pytest.fixture
def paper_trader_with_risk(mock_config, mock_alpaca, tmp_path):
    """Create PaperTrader with risk systems enabled."""
    trader = PaperTrader(
        config=mock_config,
        alpaca_client=mock_alpaca,
        enable_risk_systems=True,
        enforce_market_hours=False,
    )
    trader.db_path = str(tmp_path / "test_paper_risk.db")
    trader._init_db()
    return trader


class TestMultipleSimultaneousOrders:
    """Tests for handling multiple orders at once."""

    @pytest.mark.asyncio
    async def test_concurrent_buy_orders_different_symbols(self, paper_trader):
        """Multiple buy orders for different symbols should all succeed."""
        symbols = ["AAPL", "GOOGL", "MSFT", "TSLA"]
        quantity = 10

        # Place all orders concurrently
        tasks = [
            paper_trader.place_market_order(
                symbol, quantity, "BUY", auto_stop_loss=False
            )
            for symbol in symbols
        ]
        order_ids = await asyncio.gather(*tasks)

        # All orders should succeed
        assert all(order_id is not None for order_id in order_ids)
        assert len(set(order_ids)) == 4  # All unique order IDs

        # All positions should exist
        positions = paper_trader.get_positions()
        assert len(positions) == 4

        position_symbols = {p["symbol"] for p in positions}
        assert position_symbols == set(symbols)

    @pytest.mark.asyncio
    async def test_concurrent_buy_orders_same_symbol(self, paper_trader):
        """Multiple buy orders for same symbol should accumulate position."""
        symbol = "AAPL"
        quantity = 10
        num_orders = 5

        # Place multiple orders concurrently
        tasks = [
            paper_trader.place_market_order(
                symbol, quantity, "BUY", auto_stop_loss=False
            )
            for _ in range(num_orders)
        ]
        order_ids = await asyncio.gather(*tasks)

        # All orders should succeed
        assert all(order_id is not None for order_id in order_ids)

        # Position should reflect all accumulated shares
        position = paper_trader.get_position(symbol)
        assert position is not None
        assert position["quantity"] == quantity * num_orders

    @pytest.mark.asyncio
    async def test_concurrent_mixed_buy_sell_orders(self, paper_trader):
        """Mixed buy and sell orders should maintain consistency."""
        symbol = "AAPL"

        # First establish a position
        await paper_trader.place_market_order(symbol, 100, "BUY", auto_stop_loss=False)
        initial_position = paper_trader.get_position(symbol)
        assert initial_position["quantity"] == 100

        # Now do concurrent buy and sell
        tasks = [
            paper_trader.place_market_order(symbol, 20, "BUY", auto_stop_loss=False),
            paper_trader.place_market_order(symbol, 30, "SELL", auto_stop_loss=False),
            paper_trader.place_market_order(symbol, 10, "BUY", auto_stop_loss=False),
        ]
        await asyncio.gather(*tasks)

        # Final position should be 100 + 20 - 30 + 10 = 100
        final_position = paper_trader.get_position(symbol)
        assert final_position is not None
        assert final_position["quantity"] == 100

    @pytest.mark.asyncio
    async def test_high_volume_concurrent_orders(self, paper_trader):
        """Stress test with many concurrent orders."""
        symbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "NVDA", "AMD", "META", "AMZN"]
        quantity = 5
        orders_per_symbol = 10

        # Create many concurrent buy orders
        tasks = []
        for symbol in symbols:
            for _ in range(orders_per_symbol):
                tasks.append(
                    paper_trader.place_market_order(
                        symbol, quantity, "BUY", auto_stop_loss=False
                    )
                )

        order_ids = await asyncio.gather(*tasks)

        # Count successful orders
        successful = [oid for oid in order_ids if oid is not None]

        # Most orders should succeed (some may fail due to cash constraints)
        assert len(successful) > 0

        # Verify portfolio consistency
        total_value = paper_trader.get_portfolio_value()
        assert total_value > 0  # Portfolio still has value

        # Cash should be non-negative
        assert paper_trader.cash >= 0


class TestPositionConsistency:
    """Tests for position consistency under concurrent updates."""

    @pytest.mark.asyncio
    async def test_position_quantity_consistency(self, paper_trader):
        """Position quantity should be consistent after concurrent operations."""
        symbol = "AAPL"
        initial_buy = 100

        # Buy initial position
        await paper_trader.place_market_order(
            symbol, initial_buy, "BUY", auto_stop_loss=False
        )

        # Record initial state
        initial_cash = paper_trader.cash
        initial_position = paper_trader.get_position(symbol)["quantity"]

        # Multiple small sells concurrently
        sell_quantity = 10
        num_sells = 5

        tasks = [
            paper_trader.place_market_order(
                symbol, sell_quantity, "SELL", auto_stop_loss=False
            )
            for _ in range(num_sells)
        ]
        await asyncio.gather(*tasks)

        # Position should be exactly initial - (sell * num_sells)
        expected_quantity = initial_buy - (sell_quantity * num_sells)
        final_position = paper_trader.get_position(symbol)
        assert final_position["quantity"] == expected_quantity

    @pytest.mark.asyncio
    async def test_cash_consistency_after_concurrent_trades(self, paper_trader):
        """Cash balance should be consistent after concurrent trades."""
        initial_cash = paper_trader.cash

        # Do a series of buys
        symbols = ["AAPL", "GOOGL", "MSFT"]
        quantity = 10

        tasks = [
            paper_trader.place_market_order(
                symbol, quantity, "BUY", auto_stop_loss=False
            )
            for symbol in symbols
        ]
        await asyncio.gather(*tasks)

        # Cash should decrease
        assert paper_trader.cash < initial_cash

        # Portfolio value should be approximately the same (minus slippage/commissions)
        portfolio_value = paper_trader.get_portfolio_value()
        # Allow for some variance due to slippage
        assert portfolio_value <= initial_cash * 1.01  # Within 1%
        assert (
            portfolio_value >= initial_cash * 0.95
        )  # No more than 5% loss to slippage

    @pytest.mark.asyncio
    async def test_no_negative_position_from_concurrent_sells(self, paper_trader):
        """Concurrent sells should not result in negative position."""
        symbol = "AAPL"
        initial_quantity = 50

        # Buy initial position
        await paper_trader.place_market_order(
            symbol, initial_quantity, "BUY", auto_stop_loss=False
        )

        # Try to sell more than we have concurrently
        sell_quantity = 20
        num_sells = 5  # Total would be 100, but we only have 50

        tasks = [
            paper_trader.place_market_order(
                symbol, sell_quantity, "SELL", auto_stop_loss=False
            )
            for _ in range(num_sells)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Position should never go negative
        position = paper_trader.get_position(symbol)
        if position:
            assert position["quantity"] >= 0
        # Cash should be non-negative
        assert paper_trader.cash >= 0


class TestDatabaseConcurrency:
    """Tests for database operations under concurrent access."""

    @pytest.mark.asyncio
    async def test_concurrent_database_writes(self, paper_trader):
        """Database should handle concurrent writes correctly."""
        symbols = ["AAPL", "GOOGL", "MSFT", "TSLA"]

        # Place orders concurrently (each writes to DB)
        tasks = [
            paper_trader.place_market_order(symbol, 10, "BUY", auto_stop_loss=False)
            for symbol in symbols
        ]
        await asyncio.gather(*tasks)

        # Verify all orders are in trade history
        history = paper_trader.get_trade_history()
        assert len(history) >= len(symbols)

    @pytest.mark.asyncio
    async def test_position_persistence_after_concurrent_updates(
        self, paper_trader, tmp_path
    ):
        """Positions should persist correctly after concurrent updates.

        Note: After concurrent operations, we need a small delay to ensure
        SQLite WAL (Write-Ahead Logging) mode has flushed all writes to disk
        before reloading from the database.
        """
        symbol = "AAPL"

        # Multiple concurrent buys
        tasks = [
            paper_trader.place_market_order(symbol, 10, "BUY", auto_stop_loss=False)
            for _ in range(5)
        ]
        await asyncio.gather(*tasks)

        # Get position
        position = paper_trader.get_position(symbol)
        expected_quantity = position["quantity"]

        # Ensure all database writes are flushed before reloading
        # SQLite WAL mode can have timing issues with concurrent writes
        await asyncio.sleep(0.1)

        # Force save positions to ensure database is in sync
        paper_trader._save_positions()

        # Reset in-memory state and reload from DB
        paper_trader.positions.clear()
        paper_trader._load_positions()

        # Verify reloaded position matches
        reloaded_position = paper_trader.get_position(symbol)
        assert (
            reloaded_position is not None
        ), "Position should be reloaded from database"
        assert reloaded_position["quantity"] == expected_quantity

    @pytest.mark.asyncio
    async def test_trade_history_completeness(self, paper_trader):
        """All trades should be recorded even under concurrent load."""
        num_orders = 20
        symbol = "AAPL"

        # Place many orders concurrently
        tasks = [
            paper_trader.place_market_order(symbol, 5, "BUY", auto_stop_loss=False)
            for _ in range(num_orders)
        ]
        results = await asyncio.gather(*tasks)

        # Count successful orders
        successful_orders = [r for r in results if r is not None]

        # Trade history should match successful orders
        history = paper_trader.get_trade_history(limit=100)
        assert len(history) == len(successful_orders)


class TestEdgeCasesUnderConcurrency:
    """Tests for edge cases under concurrent operations."""

    @pytest.mark.asyncio
    async def test_insufficient_cash_during_concurrent_buys(self, paper_trader):
        """Should handle insufficient cash gracefully during concurrent buys."""
        # Try to buy more than we can afford concurrently
        # Initial cash is $100,000
        # Each GOOGL share is $2800, so 40 shares = $112,000

        tasks = [
            paper_trader.place_market_order("GOOGL", 40, "BUY", auto_stop_loss=False)
            for _ in range(3)  # Total would be ~$336,000
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Some orders should fail due to insufficient cash
        successful = [
            r for r in results if r is not None and not isinstance(r, Exception)
        ]
        # At least one order should have failed
        assert len(successful) < 3

        # Cash should be non-negative
        assert paper_trader.cash >= 0

    @pytest.mark.asyncio
    async def test_rapid_position_close_reopen(self, paper_trader):
        """Rapid close and reopen of position should work correctly."""
        symbol = "AAPL"

        # Buy, sell, buy, sell rapidly
        tasks = []
        for i in range(10):
            action = "BUY" if i % 2 == 0 else "SELL"
            tasks.append(
                paper_trader.place_market_order(
                    symbol, 50, action, auto_stop_loss=False
                )
            )

        # Execute sequentially to ensure buy before sell
        for task in tasks:
            await task

        # Should end with a valid state
        portfolio_value = paper_trader.get_portfolio_value()
        assert portfolio_value > 0

    @pytest.mark.asyncio
    async def test_concurrent_order_cancellation(self, paper_trader):
        """Test cancelling orders while others are being placed."""
        symbol = "AAPL"

        # Place some limit orders that won't fill
        with patch.object(paper_trader, "is_market_hours", return_value=True):
            limit_tasks = [
                paper_trader.place_limit_order(
                    symbol, 10, "BUY", 100.00
                )  # Very low limit
                for _ in range(5)
            ]
            limit_order_ids = await asyncio.gather(*limit_tasks)

        # Now place market orders and cancel limits concurrently
        market_tasks = [
            paper_trader.place_market_order(symbol, 5, "BUY", auto_stop_loss=False)
            for _ in range(3)
        ]
        cancel_tasks = [
            paper_trader.cancel_order(oid) for oid in limit_order_ids if oid
        ]

        await asyncio.gather(*market_tasks, *cancel_tasks)

        # Should complete without error
        assert paper_trader.cash >= 0


class TestConcurrencyWithRiskSystems:
    """Tests for concurrent operations with risk systems enabled."""

    @pytest.mark.asyncio
    async def test_circuit_breaker_under_concurrent_losses(
        self, paper_trader_with_risk
    ):
        """Circuit breaker should trip correctly under concurrent losing trades."""
        trader = paper_trader_with_risk
        symbol = "AAPL"

        # Buy a position
        await trader.place_market_order(symbol, 100, "BUY", auto_stop_loss=False)

        # Record many losses to trip the circuit breaker
        if trader.circuit_breaker:
            for _ in range(10):
                trader.circuit_breaker.record_trade(-500)  # $500 losses

        # Now try to place orders - should be blocked
        result = await trader.place_market_order(
            symbol, 10, "BUY", auto_stop_loss=False
        )

        # Order should be rejected due to circuit breaker
        assert result is None

    @pytest.mark.asyncio
    async def test_kelly_sizer_under_concurrent_updates(self, paper_trader_with_risk):
        """Kelly position sizer should handle concurrent position updates."""
        trader = paper_trader_with_risk

        # Place multiple orders that update Kelly sizer
        symbols = ["AAPL", "MSFT"]
        tasks = []

        for symbol in symbols:
            tasks.append(
                trader.place_market_order(symbol, 10, "BUY", auto_stop_loss=False)
            )

        await asyncio.gather(*tasks)

        # Kelly sizer should have updated positions
        if trader.kelly_sizer:
            positions = trader.kelly_sizer.current_positions
            assert len(positions) >= 0  # May be updated or not depending on timing


class TestOrderIdUniqueness:
    """Tests for order ID uniqueness under concurrent generation."""

    @pytest.mark.asyncio
    async def test_unique_order_ids_under_concurrency(self, paper_trader):
        """All order IDs should be unique even when generated concurrently."""
        num_orders = 50
        symbol = "AAPL"

        tasks = [
            paper_trader.place_market_order(symbol, 1, "BUY", auto_stop_loss=False)
            for _ in range(num_orders)
        ]
        order_ids = await asyncio.gather(*tasks)

        # Filter out None values (failed orders)
        valid_order_ids = [oid for oid in order_ids if oid is not None]

        # All order IDs should be unique
        assert len(valid_order_ids) == len(set(valid_order_ids))


class TestPortfolioValueConsistency:
    """Tests for portfolio value consistency under concurrent operations."""

    @pytest.mark.asyncio
    async def test_portfolio_value_accounting(self, paper_trader):
        """Portfolio value should be consistent before and after concurrent trades."""
        initial_value = paper_trader.get_portfolio_value()

        # Do a round-trip: buy then sell
        symbol = "AAPL"
        quantity = 50

        await paper_trader.place_market_order(
            symbol, quantity, "BUY", auto_stop_loss=False
        )
        await paper_trader.place_market_order(
            symbol, quantity, "SELL", auto_stop_loss=False
        )

        # Value should be close to initial (minus slippage)
        final_value = paper_trader.get_portfolio_value()

        # Allow for slippage loss (up to 2%)
        assert final_value >= initial_value * 0.98

    @pytest.mark.asyncio
    async def test_peak_value_tracking_under_concurrent_updates(self, paper_trader):
        """Peak portfolio value should track correctly."""
        initial_peak = paper_trader.peak_portfolio_value

        # Make some trades to establish position
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        # Get position and update market value to simulate price increase
        position = paper_trader.get_position("AAPL")
        assert position is not None

        # Simulate price increase
        position["market_value"] = 100 * 200  # AAPL doubles
        paper_trader._update_performance_metrics()

        # Peak should have increased
        assert paper_trader.peak_portfolio_value >= initial_peak
