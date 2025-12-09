"""
Unit tests for ExecutionRouter - Smart order routing and execution strategy selection

Comprehensive test suite covering:
- Router initialization and configuration
- Strategy selection logic
- Execution methods (market, TWAP, VWAP, limit, iceberg)
- Edge cases and error handling
- Statistics and reporting
- Slippage tracking
- Order routing decisions
"""

from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest

from core.exceptions import OrderExecutionError
from core.execution.router import ExecutionRouter, OrderUrgency
from core.execution.slippage import SlippageEstimate


class TestExecutionRouterInit:
    """Tests for ExecutionRouter initialization."""

    def test_init_with_valid_config(self):
        """Test router initialization with valid configuration."""
        order_manager = Mock()
        router = ExecutionRouter(
            order_manager=order_manager,
            small_order_threshold=5_000,
            large_order_threshold=50_000,
        )

        assert router.order_manager is order_manager
        assert router.small_order_threshold == 5_000
        assert router.large_order_threshold == 50_000
        assert router.twap is not None
        assert router.vwap is not None
        assert router.slippage is not None

    def test_init_with_order_manager(self):
        """Test router initialization with order manager."""
        order_manager = Mock()
        router = ExecutionRouter(order_manager=order_manager)

        assert router.order_manager is order_manager
        assert router.order_manager is not None

    def test_init_sets_default_values(self):
        """Test router sets default threshold values."""
        order_manager = Mock()
        router = ExecutionRouter(order_manager=order_manager)

        assert router.small_order_threshold == 10_000
        assert router.large_order_threshold == 100_000

    def test_init_creates_empty_history(self):
        """Test router initializes with empty execution history."""
        order_manager = Mock()
        router = ExecutionRouter(order_manager=order_manager)

        assert router.execution_history == []
        assert isinstance(router.execution_history, list)
        assert len(router.execution_history) == 0

    def test_init_with_custom_thresholds(self):
        """Test router initialization with custom thresholds."""
        order_manager = Mock()
        router = ExecutionRouter(
            order_manager=order_manager,
            small_order_threshold=25_000,
            large_order_threshold=250_000,
        )

        assert router.small_order_threshold == 25_000
        assert router.large_order_threshold == 250_000


class TestExecutionRouterEdgeCases:
    """Tests for ExecutionRouter edge cases and error handling."""

    @pytest.fixture
    def mock_order_manager(self):
        """Create mock order manager."""
        manager = Mock()
        manager.place_market_order = AsyncMock(return_value="order_123")
        manager.place_limit_order = AsyncMock(return_value="order_456")
        manager.get_order_status = AsyncMock(
            return_value={"filled_avg_price": 150.25, "status": "FILLED"}
        )
        return manager

    @pytest.fixture
    def router(self, mock_order_manager):
        """Create router instance."""
        return ExecutionRouter(order_manager=mock_order_manager)

    @pytest.mark.asyncio
    async def test_route_order_with_none_price_fallback(
        self, router, mock_order_manager
    ):
        """Test routing with None price uses fallback value."""
        result = await router.route_order(
            symbol="AAPL",
            quantity=50,
            action="BUY",
            current_price=None,  # Price not provided
            urgency="IMMEDIATE",
        )

        # Should use placeholder price and still execute
        assert result["execution_type"] == "MARKET"
        assert result["symbol"] == "AAPL"
        assert "routing_info" in result
        assert result["routing_info"]["order_value"] == 5000.0  # 50 * 100 (placeholder)

    @pytest.mark.asyncio
    async def test_route_order_with_zero_quantity_raises_error(self, router):
        """Test routing with zero quantity raises appropriate error."""
        # This should fail in order_manager.place_market_order
        router.order_manager.place_market_order = AsyncMock(
            side_effect=ValueError("Quantity must be positive")
        )

        with pytest.raises(ValueError, match="Quantity must be positive"):
            await router.route_order(
                symbol="AAPL",
                quantity=0,
                action="BUY",
                current_price=150.0,
                urgency="IMMEDIATE",
            )

    @pytest.mark.asyncio
    async def test_route_order_with_negative_quantity_raises_error(self, router):
        """Test routing with negative quantity raises appropriate error."""
        router.order_manager.place_market_order = AsyncMock(
            side_effect=ValueError("Quantity cannot be negative")
        )

        with pytest.raises(ValueError, match="Quantity cannot be negative"):
            await router.route_order(
                symbol="AAPL",
                quantity=-100,
                action="BUY",
                current_price=150.0,
                urgency="IMMEDIATE",
            )

    @pytest.mark.asyncio
    async def test_route_order_with_empty_symbol_raises_error(self, router):
        """Test routing with empty symbol raises appropriate error."""
        router.order_manager.place_market_order = AsyncMock(
            side_effect=ValueError("Symbol cannot be empty")
        )

        with pytest.raises(ValueError, match="Symbol cannot be empty"):
            await router.route_order(
                symbol="",
                quantity=100,
                action="BUY",
                current_price=150.0,
                urgency="IMMEDIATE",
            )

    @pytest.mark.asyncio
    async def test_route_order_with_invalid_action_raises_error(self, router):
        """Test routing with invalid action raises appropriate error."""
        router.order_manager.place_market_order = AsyncMock(
            side_effect=ValueError("Action must be BUY or SELL")
        )

        with pytest.raises(ValueError, match="Action must be BUY or SELL"):
            await router.route_order(
                symbol="AAPL",
                quantity=100,
                action="INVALID",
                current_price=150.0,
                urgency="IMMEDIATE",
            )

    @pytest.mark.asyncio
    async def test_route_order_concurrent_requests(self, router, mock_order_manager):
        """Test router handles concurrent order requests."""
        # Execute multiple orders concurrently
        import asyncio

        orders = [
            router.route_order(
                symbol=f"STOCK{i}",
                quantity=100,
                action="BUY",
                current_price=100.0 + i,
                urgency="IMMEDIATE",
            )
            for i in range(5)
        ]

        results = await asyncio.gather(*orders)

        assert len(results) == 5
        assert all(r["execution_type"] == "MARKET" for r in results)
        assert len(router.execution_history) == 5

    @pytest.mark.asyncio
    async def test_route_order_with_broker_timeout(self, router):
        """Test routing handles broker timeout gracefully."""
        router.order_manager.place_market_order = AsyncMock(
            side_effect=TimeoutError("Broker connection timeout")
        )

        with pytest.raises(TimeoutError, match="Broker connection timeout"):
            await router.route_order(
                symbol="AAPL",
                quantity=100,
                action="BUY",
                current_price=150.0,
                urgency="IMMEDIATE",
            )

    @pytest.mark.asyncio
    async def test_route_order_when_order_id_none_raises_error(self, router):
        """Test routing raises error when order manager returns None order ID."""
        router.order_manager.place_market_order = AsyncMock(return_value=None)

        with pytest.raises(OrderExecutionError) as exc_info:
            await router.route_order(
                symbol="AAPL",
                quantity=100,
                action="BUY",
                current_price=150.0,
                urgency="IMMEDIATE",
            )

        assert exc_info.value.symbol == "AAPL"
        assert exc_info.value.quantity == 100
        assert exc_info.value.side == "BUY"


class TestStrategySelection:
    """Tests for execution strategy selection logic."""

    @pytest.fixture
    def router(self):
        """Create router instance."""
        order_manager = Mock()
        return ExecutionRouter(
            order_manager=order_manager,
            small_order_threshold=10_000,
            large_order_threshold=100_000,
        )

    def test_select_strategy_small_order_uses_market(self, router):
        """Test small orders use MARKET strategy."""
        strategy = router._select_strategy(
            order_value=5_000,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=None,
        )

        assert strategy == "MARKET"

    def test_select_strategy_medium_order_uses_twap(self, router):
        """Test medium orders use TWAP strategy."""
        strategy = router._select_strategy(
            order_value=50_000,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=None,
        )

        assert strategy == "TWAP"

    def test_select_strategy_large_order_uses_vwap(self, router):
        """Test large orders with high participation use VWAP strategy."""
        # Order value / (avg_daily_volume * assumed_price) > 0.01 → VWAP
        # 150M / (100M * 100) = 0.015 > 0.01
        strategy = router._select_strategy(
            order_value=150_000_000,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=100_000_000,
        )

        assert strategy == "VWAP"

    def test_select_strategy_high_urgency_uses_market(self, router):
        """Test IMMEDIATE urgency always uses MARKET strategy."""
        # Even for large orders
        strategy = router._select_strategy(
            order_value=500_000,
            urgency="IMMEDIATE",
            symbol="AAPL",
            avg_daily_volume=None,
        )

        assert strategy == "MARKET"

    def test_select_strategy_low_urgency_uses_limit(self, router):
        """Test LOW urgency uses LIMIT strategy."""
        strategy = router._select_strategy(
            order_value=50_000,
            urgency="LOW",
            symbol="AAPL",
            avg_daily_volume=None,
        )

        assert strategy == "LIMIT"

    def test_select_strategy_participation_rate_calculation(self, router):
        """Test participation rate calculation for large orders."""
        # Test border case: exactly 1% participation
        # order_value / (avg_daily_volume * 100) = 0.01
        # 1M / (100M * 100) = 0.0001 < 0.01 → ICEBERG
        strategy = router._select_strategy(
            order_value=1_000_000,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=100_000_000,
        )

        assert strategy == "ICEBERG"

    def test_select_strategy_with_missing_volume_data(self, router):
        """Test large orders without volume data use ICEBERG."""
        strategy = router._select_strategy(
            order_value=150_000,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=None,
        )

        assert strategy == "ICEBERG"

    def test_select_strategy_boundary_conditions(self, router):
        """Test strategy selection at exact threshold boundaries."""
        # Exactly at small threshold
        strategy_at_small = router._select_strategy(
            order_value=10_000,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=None,
        )
        assert strategy_at_small == "TWAP"  # >= threshold

        # Just below small threshold
        strategy_below_small = router._select_strategy(
            order_value=9_999,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=None,
        )
        assert strategy_below_small == "MARKET"  # < threshold

        # Exactly at large threshold
        strategy_at_large = router._select_strategy(
            order_value=100_000,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=None,
        )
        assert strategy_at_large == "ICEBERG"  # >= threshold

    def test_select_strategy_with_custom_thresholds(self):
        """Test strategy selection with custom threshold values."""
        router = ExecutionRouter(
            order_manager=Mock(),
            small_order_threshold=5_000,
            large_order_threshold=50_000,
        )

        # Test with custom thresholds
        strategy = router._select_strategy(
            order_value=7_500,
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=None,
        )

        assert strategy == "TWAP"

    def test_select_strategy_override_with_explicit_strategy(self, router):
        """Test that urgency overrides normal strategy selection."""
        # Large order that would normally use VWAP, but IMMEDIATE urgency forces MARKET
        strategy = router._select_strategy(
            order_value=150_000_000,
            urgency="IMMEDIATE",
            symbol="AAPL",
            avg_daily_volume=100_000_000,
        )

        assert strategy == "MARKET"


class TestExecutionMethods:
    """Tests for individual execution methods."""

    @pytest.fixture
    def mock_order_manager(self):
        """Create mock order manager."""
        manager = Mock()
        manager.place_market_order = AsyncMock(return_value="order_123")
        manager.place_limit_order = AsyncMock(return_value="order_456")
        manager.get_order_status = AsyncMock(
            return_value={"filled_avg_price": 150.25, "status": "FILLED"}
        )
        return manager

    @pytest.fixture
    def mock_twap(self):
        """Create mock TWAP executor."""
        twap = Mock()
        twap.execute = AsyncMock(
            return_value={
                "execution_id": "twap_123",
                "symbol": "AAPL",
                "executed_quantity": 1000,
                "avg_price": 150.25,
                "status": "COMPLETED",
                "duration_minutes": 30,
            }
        )
        return twap

    @pytest.fixture
    def mock_vwap(self):
        """Create mock VWAP executor."""
        vwap = Mock()
        vwap.execute = AsyncMock(
            return_value={
                "execution_id": "vwap_123",
                "symbol": "AAPL",
                "executed_quantity": 5000,
                "avg_price": 150.30,
                "vwap_price": 150.28,
                "vwap_deviation_pct": 0.0013,
                "status": "COMPLETED",
                "duration_minutes": 60,
            }
        )
        return vwap

    @pytest.fixture
    def router(self, mock_order_manager, mock_twap, mock_vwap):
        """Create router instance."""
        return ExecutionRouter(
            order_manager=mock_order_manager,
            twap_executor=mock_twap,
            vwap_executor=mock_vwap,
        )

    @pytest.mark.asyncio
    async def test_execute_market_success(self, router, mock_order_manager):
        """Test successful market order execution."""
        result = await router._execute_market(
            symbol="AAPL",
            quantity=100,
            action="BUY",
        )

        assert result["execution_type"] == "MARKET"
        assert result["symbol"] == "AAPL"
        assert result["quantity"] == 100
        assert result["action"] == "BUY"
        assert result["order_id"] == "order_123"
        assert result["avg_price"] == 150.25
        assert result["status"] == "FILLED"
        assert "timestamp" in result

        mock_order_manager.place_market_order.assert_called_once_with(
            symbol="AAPL", quantity=100, action="BUY"
        )

    @pytest.mark.asyncio
    async def test_execute_twap_success(self, router, mock_twap):
        """Test successful TWAP execution."""
        result = await router._execute_twap(
            symbol="AAPL",
            quantity=1000,
            action="BUY",
            time_window_minutes=60,
            urgency="NORMAL",
        )

        assert result["execution_type"] == "TWAP"
        assert result["symbol"] == "AAPL"
        assert result["executed_quantity"] == 1000

        mock_twap.execute.assert_called_once_with(
            symbol="AAPL",
            total_quantity=1000,
            action="BUY",
            time_window_minutes=60,
            num_slices=10,  # NORMAL urgency
        )

    @pytest.mark.asyncio
    async def test_execute_vwap_success(self, router, mock_vwap):
        """Test successful VWAP execution."""
        result = await router._execute_vwap(
            symbol="AAPL",
            quantity=5000,
            action="SELL",
            time_window_minutes=120,
        )

        assert result["execution_type"] == "VWAP"
        assert result["symbol"] == "AAPL"
        assert result["executed_quantity"] == 5000

        mock_vwap.execute.assert_called_once_with(
            symbol="AAPL",
            total_quantity=5000,
            action="SELL",
            time_window_minutes=120,
        )

    @pytest.mark.asyncio
    async def test_execute_limit_success(self, router, mock_order_manager):
        """Test successful limit order execution."""
        result = await router._execute_limit(
            symbol="AAPL",
            quantity=500,
            action="BUY",
            current_price=150.0,
        )

        assert result["execution_type"] == "LIMIT"
        assert result["symbol"] == "AAPL"
        assert result["quantity"] == 500
        assert result["action"] == "BUY"
        assert result["order_id"] == "order_456"
        assert result["limit_price"] == 150.0 * 0.999  # BUY 0.1% below
        assert "avg_price" in result
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_execute_iceberg_chunking(self, router, mock_order_manager):
        """Test iceberg order splits into chunks correctly."""
        result = await router._execute_iceberg(
            symbol="AAPL",
            quantity=1000,
            action="BUY",
            current_price=100.0,
        )

        assert result["execution_type"] == "ICEBERG"
        assert result["symbol"] == "AAPL"
        assert result["quantity"] == 1000
        assert result["chunks"] == 10
        assert len(result["order_ids"]) == 10
        assert result["status"] == "FILLED"

        # Should have called place_limit_order 10 times (one per chunk)
        assert mock_order_manager.place_limit_order.call_count == 10

    @pytest.mark.asyncio
    async def test_execution_records_slippage(self, router):
        """Test that execution records slippage correctly."""
        # Mock slippage model
        router.slippage.estimate_slippage = Mock(
            return_value=SlippageEstimate(
                symbol="AAPL",
                quantity=100,
                action="BUY",
                current_price=150.0,
                slippage_bps=5.0,
                slippage_dollars=7.50,
                estimated_fill_price=150.075,
                components={
                    "spread_cost_bps": 3.0,
                    "market_impact_bps": 1.5,
                    "urgency_premium_bps": 0.5,
                },
                timestamp=datetime.now(),
            )
        )
        router.slippage.record_actual_slippage = Mock()

        result = await router.route_order(
            symbol="AAPL",
            quantity=100,
            action="BUY",
            current_price=150.0,
            urgency="IMMEDIATE",
            avg_daily_volume=100_000_000,
        )

        # Check slippage was estimated
        router.slippage.estimate_slippage.assert_called_once()

        # Check slippage was recorded
        router.slippage.record_actual_slippage.assert_called_once()
        call_args = router.slippage.record_actual_slippage.call_args[1]
        assert call_args["symbol"] == "AAPL"
        assert call_args["quantity"] == 100
        assert call_args["action"] == "BUY"

    @pytest.mark.asyncio
    async def test_execution_updates_history(self, router):
        """Test that executions are added to history."""
        initial_history_length = len(router.execution_history)

        await router.route_order(
            symbol="AAPL",
            quantity=50,
            action="BUY",
            current_price=150.0,
            urgency="IMMEDIATE",
        )

        assert len(router.execution_history) == initial_history_length + 1
        assert router.execution_history[-1]["symbol"] == "AAPL"
        assert "routing_info" in router.execution_history[-1]


class TestStatisticsAndReporting:
    """Tests for execution statistics and reporting."""

    @pytest.fixture
    def router(self):
        """Create router instance."""
        order_manager = Mock()
        return ExecutionRouter(order_manager=order_manager)

    def test_get_execution_statistics_empty_history(self, router):
        """Test statistics with empty execution history."""
        stats = router.get_execution_statistics()

        assert stats["total_executions"] == 0
        assert stats["by_strategy"] == {}
        # Router returns avg_execution_time on empty, avg_execution_time_minutes with history
        assert "avg_execution_time" in stats or "avg_execution_time_minutes" in stats
        avg_time = stats.get(
            "avg_execution_time", stats.get("avg_execution_time_minutes", 0.0)
        )
        assert avg_time == 0.0

    def test_get_execution_statistics_with_history(self, router):
        """Test statistics calculation with execution history."""
        router.execution_history = [
            {
                "execution_type": "MARKET",
                "duration_minutes": 0,
                "symbol": "AAPL",
            },
            {
                "execution_type": "TWAP",
                "duration_minutes": 30,
                "symbol": "GOOGL",
            },
            {
                "execution_type": "VWAP",
                "duration_minutes": 60,
                "symbol": "MSFT",
            },
            {
                "execution_type": "TWAP",
                "duration_minutes": 45,
                "symbol": "TSLA",
            },
        ]

        stats = router.get_execution_statistics()

        assert stats["total_executions"] == 4
        assert stats["by_strategy"]["MARKET"] == 1
        assert stats["by_strategy"]["TWAP"] == 2
        assert stats["by_strategy"]["VWAP"] == 1
        # Average of non-zero durations: (30 + 60 + 45) / 3 = 45
        assert stats["avg_execution_time_minutes"] == 45.0

    def test_get_routing_report_format(self, router):
        """Test routing report structure and format."""
        router.execution_history = [
            {"execution_type": "MARKET", "symbol": "AAPL"},
        ]

        report = router.get_routing_report()

        assert "execution_statistics" in report
        assert "slippage_analysis" in report
        assert "recent_executions" in report
        assert isinstance(report["execution_statistics"], dict)
        assert isinstance(report["recent_executions"], list)

    def test_statistics_by_strategy(self, router):
        """Test strategy breakdown in statistics."""
        # Add executions of different types
        strategies = ["MARKET", "MARKET", "TWAP", "VWAP", "LIMIT", "ICEBERG"]
        for strategy in strategies:
            router.execution_history.append(
                {
                    "execution_type": strategy,
                    "symbol": "AAPL",
                }
            )

        stats = router.get_execution_statistics()

        assert stats["by_strategy"]["MARKET"] == 2
        assert stats["by_strategy"]["TWAP"] == 1
        assert stats["by_strategy"]["VWAP"] == 1
        assert stats["by_strategy"]["LIMIT"] == 1
        assert stats["by_strategy"]["ICEBERG"] == 1

    def test_statistics_time_calculation(self, router):
        """Test average execution time calculation."""
        # Only durations > 0 should be included
        router.execution_history = [
            {"execution_type": "MARKET", "duration_minutes": 0},
            {"execution_type": "MARKET", "duration_minutes": 0},
            {"execution_type": "TWAP", "duration_minutes": 20},
            {"execution_type": "TWAP", "duration_minutes": 40},
            {"execution_type": "VWAP", "duration_minutes": 80},
        ]

        stats = router.get_execution_statistics()

        # Average of (20 + 40 + 80) / 3 = 46.67
        assert abs(stats["avg_execution_time_minutes"] - 46.67) < 0.01


class TestOrderUrgencyEnum:
    """Tests for OrderUrgency enum."""

    def test_urgency_enum_values(self):
        """Test OrderUrgency enum has correct values."""
        assert OrderUrgency.IMMEDIATE.value == "IMMEDIATE"
        assert OrderUrgency.HIGH.value == "HIGH"
        assert OrderUrgency.NORMAL.value == "NORMAL"
        assert OrderUrgency.LOW.value == "LOW"

    def test_urgency_enum_members(self):
        """Test OrderUrgency enum has all expected members."""
        urgency_values = [u.value for u in OrderUrgency]
        assert "IMMEDIATE" in urgency_values
        assert "HIGH" in urgency_values
        assert "NORMAL" in urgency_values
        assert "LOW" in urgency_values


class TestExecutionRouterIntegration:
    """Integration tests for ExecutionRouter."""

    @pytest.fixture
    def mock_order_manager(self):
        """Create mock order manager."""
        manager = Mock()
        manager.place_market_order = AsyncMock(return_value="order_123")
        manager.place_limit_order = AsyncMock(return_value="order_456")
        manager.get_order_status = AsyncMock(
            return_value={"filled_avg_price": 150.25, "status": "FILLED"}
        )
        return manager

    @pytest.fixture
    def router(self, mock_order_manager):
        """Create router instance."""
        return ExecutionRouter(order_manager=mock_order_manager)

    @pytest.mark.asyncio
    async def test_full_routing_flow_market(self, router):
        """Test complete routing flow for market order."""
        result = await router.route_order(
            symbol="AAPL",
            quantity=50,
            action="BUY",
            current_price=150.0,
            urgency="IMMEDIATE",
        )

        # Verify execution
        assert result["execution_type"] == "MARKET"
        assert result["symbol"] == "AAPL"
        assert result["quantity"] == 50

        # Verify routing info
        assert "routing_info" in result
        assert result["routing_info"]["strategy_selected"] == "MARKET"
        assert result["routing_info"]["order_value"] == 7500.0
        assert result["routing_info"]["urgency"] == "IMMEDIATE"

        # Verify history
        assert len(router.execution_history) == 1

    @pytest.mark.asyncio
    async def test_full_routing_flow_with_slippage(self, router):
        """Test routing flow with slippage estimation."""
        result = await router.route_order(
            symbol="AAPL",
            quantity=100,
            action="BUY",
            current_price=150.0,
            urgency="IMMEDIATE",
            avg_daily_volume=100_000_000,
        )

        # Verify slippage info is included
        assert "routing_info" in result
        assert "slippage_estimate" in result["routing_info"]

    @pytest.mark.asyncio
    async def test_routing_decision_tree_small_to_market(self, router):
        """Test small order routes to MARKET."""
        result = await router.route_order(
            symbol="AAPL",
            quantity=50,  # $7,500 order
            action="BUY",
            current_price=150.0,
            urgency="NORMAL",
        )

        assert result["routing_info"]["strategy_selected"] == "MARKET"

    @pytest.mark.asyncio
    async def test_routing_decision_tree_medium_to_twap(self, router):
        """Test medium order routes to TWAP."""
        # Patch asyncio.sleep to avoid real waits during TWAP execution
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await router.route_order(
                symbol="AAPL",
                quantity=500,  # $75,000 order
                action="BUY",
                current_price=150.0,
                urgency="NORMAL",
            )

        assert result["routing_info"]["strategy_selected"] == "TWAP"

    @pytest.mark.asyncio
    async def test_routing_with_unknown_strategy_raises_error(self, router):
        """Test that unknown strategy raises ValueError."""
        # Force an unknown strategy by mocking _select_strategy
        router._select_strategy = Mock(return_value="UNKNOWN_STRATEGY")

        with pytest.raises(ValueError, match="Unknown execution strategy"):
            await router.route_order(
                symbol="AAPL",
                quantity=100,
                action="BUY",
                current_price=150.0,
            )

    @pytest.mark.asyncio
    async def test_twap_urgency_adjustments(self, router):
        """Test TWAP parameters adjust based on urgency."""
        # Mock TWAP executor to capture parameters
        router.twap.execute = AsyncMock(
            return_value={
                "execution_id": "twap_123",
                "symbol": "AAPL",
                "executed_quantity": 500,
                "avg_price": 150.25,
                "status": "COMPLETED",
            }
        )

        # HIGH urgency
        await router.route_order(
            symbol="AAPL",
            quantity=500,
            action="BUY",
            current_price=150.0,
            urgency="HIGH",
        )

        # Verify HIGH urgency uses shorter window and fewer slices
        call_args = router.twap.execute.call_args[1]
        assert call_args["time_window_minutes"] == 30
        assert call_args["num_slices"] == 6

        # NORMAL urgency
        await router.route_order(
            symbol="AAPL",
            quantity=500,
            action="BUY",
            current_price=150.0,
            urgency="NORMAL",
        )

        # Verify NORMAL urgency uses standard parameters
        call_args = router.twap.execute.call_args[1]
        assert call_args["time_window_minutes"] == 60
        assert call_args["num_slices"] == 10

    @pytest.mark.asyncio
    async def test_limit_order_price_calculation(self, router):
        """Test limit order prices are calculated correctly."""
        # BUY order should be 0.1% below market
        buy_result = await router._execute_limit(
            symbol="AAPL",
            quantity=100,
            action="BUY",
            current_price=150.0,
        )
        assert buy_result["limit_price"] == 150.0 * 0.999

        # SELL order should be 0.1% above market
        sell_result = await router._execute_limit(
            symbol="AAPL",
            quantity=100,
            action="SELL",
            current_price=150.0,
        )
        assert sell_result["limit_price"] == 150.0 * 1.001

    @pytest.mark.asyncio
    async def test_iceberg_price_variance(self, router):
        """Test iceberg orders use price variance to avoid stacking."""
        result = await router._execute_iceberg(
            symbol="AAPL",
            quantity=1000,
            action="BUY",
            current_price=100.0,
        )

        # All chunks should be executed
        assert result["quantity"] == 1000
        assert result["chunks"] == 10

        # Average price should be close to current price but may vary slightly
        assert 99.5 <= result["avg_price"] <= 100.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
