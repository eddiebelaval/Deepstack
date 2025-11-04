"""
Unit tests for Production Execution Module

Tests for TWAP, VWAP, Slippage Model, Execution Router, and Monitor.
"""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock

import pytest

from core.execution.monitor import AlertSeverity, ExecutionMonitor
from core.execution.router import ExecutionRouter
from core.execution.slippage import SlippageModel
from core.execution.twap import TWAPExecutor, TWAPSlice
from core.execution.vwap import VWAPExecutor, VWAPSlice


class TestTWAPExecutor:
    """Tests for TWAP execution algorithm."""

    @pytest.fixture
    def mock_order_manager(self):
        """Create mock order manager."""
        manager = Mock()
        manager.place_market_order = AsyncMock(return_value="order_123")
        manager.get_order_status = AsyncMock(
            return_value={"filled_avg_price": 150.25, "status": "FILLED"}
        )
        return manager

    @pytest.fixture
    def twap_executor(self, mock_order_manager):
        """Create TWAP executor."""
        return TWAPExecutor(
            order_manager=mock_order_manager,
            default_time_window=60,
            default_num_slices=10,
        )

    def test_twap_executor_init(self, twap_executor):
        """Test TWAP executor initialization."""
        assert twap_executor.default_time_window == 60
        assert twap_executor.default_num_slices == 10
        assert len(twap_executor.active_executions) == 0

    def test_create_slice_plan(self, twap_executor):
        """Test TWAP slice plan creation."""
        slices = twap_executor._create_slice_plan(
            total_quantity=1000,
            num_slices=10,
            time_window_minutes=60,
            randomize_timing=False,
        )

        assert len(slices) == 10
        assert sum(s.quantity for s in slices) == 1000
        assert all(isinstance(s, TWAPSlice) for s in slices)
        assert all(s.status == "PENDING" for s in slices)

    def test_create_slice_plan_with_remainder(self, twap_executor):
        """Test slice plan with remainder distribution."""
        slices = twap_executor._create_slice_plan(
            total_quantity=1007,  # Not evenly divisible
            num_slices=10,
            time_window_minutes=60,
            randomize_timing=False,
        )

        assert len(slices) == 10
        assert sum(s.quantity for s in slices) == 1007
        # First 7 slices should have 101, last 3 should have 100
        assert slices[0].quantity == 101
        assert slices[7].quantity == 100

    @pytest.mark.asyncio
    async def test_twap_execute_success(self, twap_executor, mock_order_manager):
        """Test successful TWAP execution."""
        # Speed up execution for testing
        result = await twap_executor.execute(
            symbol="AAPL",
            total_quantity=100,
            action="BUY",
            time_window_minutes=1,  # 1 minute window
            num_slices=2,  # Only 2 slices for fast test
        )

        assert result["symbol"] == "AAPL"
        assert result["total_quantity"] == 100
        assert result["executed_quantity"] == 100
        assert result["slices_executed"] == 2
        assert result["slices_failed"] == 0
        assert result["status"] == "COMPLETED"
        assert "avg_price" in result

    @pytest.mark.asyncio
    async def test_twap_calculate_results(self, twap_executor):
        """Test TWAP results calculation."""
        # Create mock execution state
        slices = [
            TWAPSlice(
                slice_id=1,
                quantity=50,
                scheduled_time=datetime.now(),
                actual_execution_time=datetime.now(),
                fill_price=150.0,
                status="EXECUTED",
            ),
            TWAPSlice(
                slice_id=2,
                quantity=50,
                scheduled_time=datetime.now(),
                actual_execution_time=datetime.now(),
                fill_price=151.0,
                status="EXECUTED",
            ),
        ]

        execution_state = {
            "execution_id": "test_123",
            "symbol": "AAPL",
            "action": "BUY",
            "total_quantity": 100,
            "start_time": datetime.now() - timedelta(minutes=5),
            "slices": slices,
        }

        results = twap_executor._calculate_results(execution_state)

        assert results["executed_quantity"] == 100
        assert results["avg_price"] == 150.5  # (150*50 + 151*50) / 100
        assert results["slices_executed"] == 2
        assert results["slices_failed"] == 0

    def test_get_execution_status(self, twap_executor):
        """Test execution status retrieval."""
        # Add mock active execution
        twap_executor.active_executions["test_123"] = {
            "execution_id": "test_123",
            "status": "RUNNING",
            "start_time": datetime.now(),
            "slices": [
                TWAPSlice(1, 50, datetime.now(), status="EXECUTED"),
                TWAPSlice(2, 50, datetime.now(), status="PENDING"),
            ],
        }

        status = twap_executor.get_execution_status("test_123")

        assert status is not None
        assert status["execution_id"] == "test_123"
        assert status["status"] == "RUNNING"
        assert status["progress_pct"] == 50.0  # 1 of 2 executed
        assert status["slices_executed"] == 1
        assert status["total_slices"] == 2


class TestVWAPExecutor:
    """Tests for VWAP execution algorithm."""

    @pytest.fixture
    def mock_order_manager(self):
        """Create mock order manager."""
        manager = Mock()
        manager.place_market_order = AsyncMock(return_value="order_123")
        manager.get_order_status = AsyncMock(
            return_value={"filled_avg_price": 150.25, "status": "FILLED"}
        )
        return manager

    @pytest.fixture
    def vwap_executor(self, mock_order_manager):
        """Create VWAP executor."""
        return VWAPExecutor(order_manager=mock_order_manager)

    def test_vwap_executor_init(self, vwap_executor):
        """Test VWAP executor initialization."""
        assert vwap_executor.volume_profile is not None
        assert len(vwap_executor.volume_profile) > 0
        assert vwap_executor.vwap_deviation_threshold == 0.005

    def test_default_volume_profile(self, vwap_executor):
        """Test default U-shaped volume profile."""
        profile = vwap_executor.volume_profile

        # Check that morning and closing periods have higher volume
        assert profile["09:30-10:00"] > profile["11:00-11:30"]
        assert profile["15:30-16:00"] > profile["11:00-11:30"]

        # Check that total volume sums to ~1.0
        total_volume = sum(profile.values())
        assert 0.99 <= total_volume <= 1.01

    def test_create_vwap_slice_plan(self, vwap_executor):
        """Test VWAP slice plan creation."""
        start_time = datetime.now().replace(hour=10, minute=0, second=0)

        slices = vwap_executor._create_vwap_slice_plan(
            total_quantity=1000, start_time=start_time, time_window_minutes=120
        )

        assert len(slices) > 0
        assert sum(s.quantity for s in slices) == 1000
        assert all(isinstance(s, VWAPSlice) for s in slices)

    @pytest.mark.asyncio
    async def test_vwap_calculate_results(self, vwap_executor):
        """Test VWAP results calculation."""
        slices = [
            VWAPSlice(
                slice_id=1,
                quantity=60,
                scheduled_time=datetime.now(),
                expected_volume_pct=0.6,
                actual_execution_time=datetime.now(),
                fill_price=150.0,
                status="EXECUTED",
            ),
            VWAPSlice(
                slice_id=2,
                quantity=40,
                scheduled_time=datetime.now(),
                expected_volume_pct=0.4,
                actual_execution_time=datetime.now(),
                fill_price=151.0,
                status="EXECUTED",
            ),
        ]

        execution_state = {
            "execution_id": "vwap_123",
            "symbol": "AAPL",
            "action": "BUY",
            "total_quantity": 100,
            "start_time": datetime.now() - timedelta(minutes=10),
            "slices": slices,
        }

        results = await vwap_executor._calculate_vwap_results(execution_state)

        assert results["executed_quantity"] == 100
        assert results["vwap_price"] == 150.4  # (60*150 + 40*151) / 100
        assert "vwap_deviation" in results
        assert "vwap_deviation_pct" in results


class TestSlippageModel:
    """Tests for slippage modeling."""

    @pytest.fixture
    def slippage_model(self):
        """Create slippage model."""
        return SlippageModel(
            base_spread_bps=5.0, impact_coefficient=0.1, urgency_multiplier=1.5
        )

    def test_slippage_model_init(self, slippage_model):
        """Test slippage model initialization."""
        assert slippage_model.base_spread_bps == 5.0
        assert slippage_model.impact_coefficient == 0.1
        assert slippage_model.urgency_multiplier == 1.5

    def test_estimate_slippage_market_order(self, slippage_model):
        """Test slippage estimation for market order."""
        estimate = slippage_model.estimate_slippage(
            symbol="AAPL",
            quantity=1000,
            action="BUY",
            current_price=150.0,
            avg_daily_volume=100_000_000,
            order_type="MARKET",
        )

        assert estimate.symbol == "AAPL"
        assert estimate.quantity == 1000
        assert estimate.current_price == 150.0
        assert estimate.slippage_bps > 0
        assert estimate.slippage_dollars > 0
        assert estimate.estimated_fill_price > 150.0  # BUY pays more

        # Check components
        assert "spread_cost_bps" in estimate.components
        assert "market_impact_bps" in estimate.components
        assert "urgency_premium_bps" in estimate.components

    def test_estimate_slippage_limit_order(self, slippage_model):
        """Test slippage estimation for limit order."""
        estimate = slippage_model.estimate_slippage(
            symbol="AAPL",
            quantity=1000,
            action="BUY",
            current_price=150.0,
            avg_daily_volume=100_000_000,
            order_type="LIMIT",
        )

        # Limit orders should have no urgency premium
        assert estimate.components["urgency_premium_bps"] == 0.0
        # But should still have spread and impact costs
        assert estimate.components["spread_cost_bps"] > 0
        assert estimate.components["market_impact_bps"] > 0

    def test_market_impact_calculation(self, slippage_model):
        """Test market impact scales with order size."""
        small_impact = slippage_model._calculate_market_impact(
            quantity=100, price=150.0, avg_daily_volume=100_000_000
        )

        large_impact = slippage_model._calculate_market_impact(
            quantity=10000, price=150.0, avg_daily_volume=100_000_000
        )

        # Larger orders should have higher impact
        assert large_impact > small_impact

    def test_record_actual_slippage(self, slippage_model):
        """Test recording actual slippage."""
        slippage_model.record_actual_slippage(
            symbol="AAPL",
            quantity=1000,
            action="BUY",
            expected_price=150.0,
            actual_price=150.10,
        )

        assert len(slippage_model.historical_slippage) == 1
        record = slippage_model.historical_slippage[0]
        assert record["symbol"] == "AAPL"
        assert record["expected_price"] == 150.0
        assert record["actual_price"] == 150.10
        assert (
            abs(record["slippage_dollars"] - 100.0) < 0.01
        )  # 0.10 * 1000 (allow rounding)

    def test_slippage_statistics(self, slippage_model):
        """Test slippage statistics calculation."""
        # Record multiple slippages
        slippage_model.record_actual_slippage("AAPL", 1000, "BUY", 150.0, 150.10)
        slippage_model.record_actual_slippage("AAPL", 1000, "SELL", 150.0, 149.95)

        stats = slippage_model.get_slippage_statistics()

        assert stats["total_trades"] == 2
        assert stats["avg_slippage_bps"] > 0
        assert stats["total_slippage_cost"] > 0
        assert stats["buy_trades"] == 1
        assert stats["sell_trades"] == 1

    def test_execution_quality_score(self, slippage_model):
        """Test execution quality scoring."""
        quality = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0, actual_slippage_bps=8.5
        )

        assert quality["quality_score"] == 85.0
        assert quality["rating"] == "EXCELLENT"
        assert quality["deviation_bps"] == -1.5


class TestExecutionRouter:
    """Tests for execution router."""

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
            }
        )
        return vwap

    @pytest.fixture
    def router(self, mock_order_manager, mock_twap, mock_vwap):
        """Create execution router."""
        return ExecutionRouter(
            order_manager=mock_order_manager,
            twap_executor=mock_twap,
            vwap_executor=mock_vwap,
            small_order_threshold=10_000,
            large_order_threshold=100_000,
        )

    def test_router_init(self, router):
        """Test router initialization."""
        assert router.small_order_threshold == 10_000
        assert router.large_order_threshold == 100_000
        assert router.twap is not None
        assert router.vwap is not None

    def test_select_strategy_small_order(self, router):
        """Test strategy selection for small order."""
        strategy = router._select_strategy(
            order_value=5_000, urgency="NORMAL", symbol="AAPL", avg_daily_volume=None
        )

        assert strategy == "MARKET"

    def test_select_strategy_medium_order(self, router):
        """Test strategy selection for medium order."""
        strategy = router._select_strategy(
            order_value=50_000, urgency="NORMAL", symbol="AAPL", avg_daily_volume=None
        )

        assert strategy == "TWAP"

    def test_select_strategy_large_order(self, router):
        """Test strategy selection for large order with high participation."""
        # Order value / (avg_daily_volume * assumed_price) > 0.01 → VWAP
        # Need: 150M / (100M * 100) = 0.015 > 0.01 → VWAP
        strategy = router._select_strategy(
            order_value=150_000_000,  # $150M order
            urgency="NORMAL",
            symbol="AAPL",
            avg_daily_volume=100_000_000,  # 100M shares/day
        )

        assert strategy == "VWAP"

    def test_select_strategy_immediate_urgency(self, router):
        """Test strategy selection for immediate urgency."""
        strategy = router._select_strategy(
            order_value=50_000,
            urgency="IMMEDIATE",
            symbol="AAPL",
            avg_daily_volume=None,
        )

        assert strategy == "MARKET"

    def test_select_strategy_low_urgency(self, router):
        """Test strategy selection for low urgency."""
        strategy = router._select_strategy(
            order_value=50_000, urgency="LOW", symbol="AAPL", avg_daily_volume=None
        )

        assert strategy == "LIMIT"

    @pytest.mark.asyncio
    async def test_route_order_market(self, router, mock_order_manager):
        """Test routing to market execution."""
        result = await router.route_order(
            symbol="AAPL",
            quantity=50,
            action="BUY",
            current_price=150.0,
            urgency="IMMEDIATE",
        )

        assert result["execution_type"] == "MARKET"
        assert result["symbol"] == "AAPL"
        assert "routing_info" in result

    @pytest.mark.asyncio
    async def test_route_order_twap(self, router, mock_twap):
        """Test routing to TWAP execution."""
        result = await router.route_order(
            symbol="AAPL",
            quantity=500,
            action="BUY",
            current_price=150.0,
            urgency="NORMAL",
        )

        assert result["execution_type"] == "TWAP"
        mock_twap.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_route_order_vwap(self, router, mock_vwap):
        """Test routing to VWAP execution."""
        # $150M order with 100M daily volume → participation rate = 1.5% > 1%
        result = await router.route_order(
            symbol="AAPL",
            quantity=1000000,  # $150M at $150
            action="BUY",
            current_price=150.0,
            urgency="NORMAL",
            avg_daily_volume=100_000_000,
        )

        assert result["execution_type"] == "VWAP"
        mock_vwap.execute.assert_called_once()

    def test_get_execution_statistics(self, router):
        """Test execution statistics."""
        # Add mock executions
        router.execution_history = [
            {"execution_type": "MARKET", "duration_minutes": 0},
            {"execution_type": "TWAP", "duration_minutes": 30},
            {"execution_type": "VWAP", "duration_minutes": 60},
        ]

        stats = router.get_execution_statistics()

        assert stats["total_executions"] == 3
        assert stats["by_strategy"]["MARKET"] == 1
        assert stats["by_strategy"]["TWAP"] == 1
        assert stats["by_strategy"]["VWAP"] == 1
        assert stats["avg_execution_time_minutes"] == 45.0  # (30 + 60) / 2


class TestExecutionMonitor:
    """Tests for execution monitoring."""

    @pytest.fixture
    def monitor(self):
        """Create execution monitor."""
        return ExecutionMonitor(
            slippage_threshold_bps=20.0,
            vwap_deviation_threshold=0.01,
            failed_order_threshold=3,
        )

    def test_monitor_init(self, monitor):
        """Test monitor initialization."""
        assert monitor.slippage_threshold_bps == 20.0
        assert monitor.vwap_deviation_threshold == 0.01
        assert monitor.failed_order_threshold == 3

    def test_monitor_execution_success(self, monitor):
        """Test monitoring successful execution."""
        execution_result = {
            "execution_id": "test_123",
            "symbol": "AAPL",
            "quantity": 1000,
            "avg_price": 150.25,
            "status": "COMPLETED",
        }

        monitor.monitor_execution(execution_result)

        assert len(monitor.executions) == 1
        assert len(monitor.alerts) == 0  # No alerts for successful execution

    def test_check_slippage_alert(self, monitor):
        """Test slippage alert generation."""
        execution_result = {
            "execution_id": "test_123",
            "symbol": "AAPL",
            "routing_info": {
                "slippage_estimate": {
                    "slippage_bps": 25.0,  # Above threshold
                    "slippage_dollars": 375.0,
                }
            },
        }

        monitor._check_slippage_alert(execution_result)

        assert len(monitor.alerts) == 1
        alert = monitor.alerts[0]
        assert alert.alert_type == "EXCESSIVE_SLIPPAGE"
        assert alert.severity == AlertSeverity.WARNING

    def test_check_vwap_deviation_alert(self, monitor):
        """Test VWAP deviation alert."""
        execution_result = {
            "execution_id": "vwap_123",
            "symbol": "AAPL",
            "execution_type": "VWAP",
            "vwap_deviation_pct": 0.015,  # Above 1% threshold
            "avg_price": 150.25,
            "vwap_price": 150.00,
        }

        monitor._check_vwap_deviation_alert(execution_result)

        assert len(monitor.alerts) == 1
        alert = monitor.alerts[0]
        assert alert.alert_type == "VWAP_DEVIATION"
        assert alert.severity == AlertSeverity.WARNING

    def test_get_active_alerts(self, monitor):
        """Test getting active alerts."""
        # Add some alerts
        execution_result = {
            "execution_id": "test_123",
            "symbol": "AAPL",
            "routing_info": {
                "slippage_estimate": {"slippage_bps": 25.0, "slippage_dollars": 375.0}
            },
        }

        monitor._check_slippage_alert(execution_result)

        active_alerts = monitor.get_active_alerts()
        assert len(active_alerts) == 1

        # Acknowledge alert
        alert_id = active_alerts[0].alert_id
        monitor.acknowledge_alert(alert_id)

        # Should be no active alerts now
        active_alerts = monitor.get_active_alerts()
        assert len(active_alerts) == 0

    def test_get_daily_summary(self, monitor):
        """Test daily summary generation."""
        # Add some executions
        for i in range(5):
            monitor.monitor_execution(
                {
                    "execution_id": f"test_{i}",
                    "symbol": "AAPL",
                    "executed_quantity": 100,
                    "avg_price": 150.0,
                    "status": "COMPLETED",
                    "execution_type": "MARKET",
                }
            )

        summary = monitor.get_daily_summary()

        assert summary["total_executions"] == 5
        assert summary["successful_executions"] == 5
        assert summary["success_rate"] == 1.0
        assert summary["total_volume"] == 500
        assert "by_strategy" in summary

    def test_get_execution_quality_score(self, monitor):
        """Test execution quality scoring."""
        # Add successful executions
        for i in range(10):
            monitor.monitor_execution(
                {"execution_id": f"test_{i}", "status": "COMPLETED"}
            )

        quality = monitor.get_execution_quality_score()

        assert "quality_score" in quality
        assert "grade" in quality
        assert quality["quality_score"] > 0
        assert quality["grade"] in ["A", "B", "C", "D", "F"]


# Integration Tests


@pytest.mark.asyncio
async def test_end_to_end_execution_flow():
    """Test complete execution flow from routing to monitoring."""
    # Create mocks
    order_manager = Mock()
    order_manager.place_market_order = AsyncMock(return_value="order_123")
    order_manager.get_order_status = AsyncMock(
        return_value={"filled_avg_price": 150.25, "status": "FILLED"}
    )

    # Create components
    router = ExecutionRouter(order_manager=order_manager, small_order_threshold=10_000)
    monitor = ExecutionMonitor()

    # Execute order
    result = await router.route_order(
        symbol="AAPL",
        quantity=50,
        action="BUY",
        current_price=150.0,
        urgency="IMMEDIATE",
    )

    # Monitor execution
    monitor.monitor_execution(result)

    # Check results
    assert result["execution_type"] == "MARKET"
    assert len(monitor.executions) == 1
    assert monitor.get_daily_summary()["total_executions"] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
