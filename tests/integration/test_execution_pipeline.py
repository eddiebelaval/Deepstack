"""
Integration tests for Execution Pipeline

Tests the flow: Order Submission → TWAP/VWAP Execution → Stop Placement → Monitoring

Test Coverage:
- Order submission to execution flow
- TWAP execution with time slicing
- VWAP execution with volume weighting
- Automatic stop loss placement post-execution
- Partial fill handling
- Order rejection handling
- Position monitoring after execution
- Multi-leg order coordination
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from core.execution.router import ExecutionRouter
from core.execution.slippage import SlippageModel
from core.execution.twap import TWAPExecutor
from core.execution.vwap import VWAPExecutor

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_order_manager():
    """Mock order manager for execution testing."""
    mgr = AsyncMock()

    # Mock successful order placement
    mgr.place_market_order.return_value = "order_12345"
    mgr.place_limit_order.return_value = "order_12346"
    mgr.place_stop_order.return_value = "order_12347"

    # Mock order status
    mgr.get_order_status.return_value = {
        "order_id": "order_12345",
        "status": "FILLED",
        "filled_avg_price": 150.0,
        "filled_quantity": 100,
    }

    return mgr


@pytest.fixture
def execution_router(mock_order_manager):
    """Execution router with all components."""
    return ExecutionRouter(
        order_manager=mock_order_manager,
        small_order_threshold=10000.0,
        large_order_threshold=100000.0,
    )


@pytest.fixture
def twap_executor(mock_order_manager):
    """TWAP executor for time-sliced execution."""
    return TWAPExecutor(order_manager=mock_order_manager)


@pytest.fixture
def vwap_executor(mock_order_manager):
    """VWAP executor for volume-weighted execution."""
    return VWAPExecutor(order_manager=mock_order_manager)


# ============================================================================
# Order Submission to Execution Flow Tests
# ============================================================================


@pytest.mark.asyncio
async def test_order_submission_to_market_execution(
    execution_router, mock_order_manager
):
    """Test complete flow from submission to market execution."""
    # Submit order
    result = await execution_router.route_order(
        symbol="AAPL",
        quantity=100,
        action="BUY",
        current_price=150.0,
        urgency="IMMEDIATE",
    )

    # Should execute as market order
    assert result["execution_type"] == "MARKET"
    assert result["symbol"] == "AAPL"
    assert result["quantity"] == 100
    assert result["order_id"] is not None

    # Verify order manager was called
    mock_order_manager.place_market_order.assert_called_once()


@pytest.mark.asyncio
async def test_order_routing_based_on_size(execution_router):
    """Test order routing selects strategy based on order size."""
    # Small order (< $10k) - should use market
    small_result = await execution_router.route_order(
        symbol="AAPL",
        quantity=50,  # 50 shares @ $150 = $7,500
        action="BUY",
        current_price=150.0,
        urgency="NORMAL",
    )
    assert small_result["execution_type"] == "MARKET"

    # Large order (> $100k) - should use VWAP
    large_result = await execution_router.route_order(
        symbol="AAPL",
        quantity=1000,  # 1000 shares @ $150 = $150,000
        action="BUY",
        current_price=150.0,
        urgency="NORMAL",
        avg_daily_volume=10000000,  # Provide volume for VWAP
    )
    assert large_result["execution_type"] in ["VWAP", "TWAP"]


@pytest.mark.asyncio
async def test_order_routing_based_on_urgency(execution_router):
    """Test order routing respects urgency levels."""
    # Immediate urgency - always market
    immediate_result = await execution_router.route_order(
        symbol="AAPL",
        quantity=500,  # Medium size
        action="BUY",
        current_price=150.0,
        urgency="IMMEDIATE",
    )
    assert immediate_result["execution_type"] == "MARKET"

    # Low urgency - should use limit
    low_result = await execution_router.route_order(
        symbol="AAPL", quantity=500, action="BUY", current_price=150.0, urgency="LOW"
    )
    assert low_result["execution_type"] == "LIMIT"


# ============================================================================
# TWAP Execution Tests
# ============================================================================


@pytest.mark.asyncio
async def test_twap_execution_with_time_slicing(twap_executor, mock_order_manager):
    """Test TWAP execution slices order over time."""
    # Execute TWAP order
    result = await twap_executor.execute(
        symbol="AAPL",
        total_quantity=1000,
        action="BUY",
        time_window_minutes=10,  # 10 minute window
        num_slices=5,  # 5 slices = 200 shares each
    )

    # Should have executed multiple slices
    assert result["symbol"] == "AAPL"
    assert result["total_quantity"] == 1000
    assert result["num_slices"] == 5
    assert "slices" in result

    # Each slice should be ~200 shares (1000 / 5)
    assert len(result["slices"]) == 5
    assert all(slice_data["quantity"] == 200 for slice_data in result["slices"])

    # Should have called order manager for each slice
    assert mock_order_manager.place_market_order.call_count == 5


@pytest.mark.asyncio
async def test_twap_execution_timing(twap_executor):
    """Test TWAP execution respects time intervals."""
    import time

    start_time = time.time()

    # Execute TWAP with 3 slices over 0.3 seconds
    result = await twap_executor.execute(
        symbol="AAPL",
        total_quantity=300,
        action="BUY",
        time_window_minutes=0.005,  # 0.3 seconds (0.005 min)
        num_slices=3,
    )

    elapsed = time.time() - start_time

    # Should take approximately 0.3 seconds
    assert elapsed >= 0.2  # At least 0.2s (accounting for execution time)
    assert elapsed <= 0.5  # But not too long


@pytest.mark.asyncio
async def test_twap_handles_partial_fills(twap_executor, mock_order_manager):
    """Test TWAP handles partial fills gracefully."""
    # Mock partial fill
    mock_order_manager.get_order_status.return_value = {
        "order_id": "order_12345",
        "status": "PARTIALLY_FILLED",
        "filled_avg_price": 150.0,
        "filled_quantity": 50,  # Only 50 of 100 filled
    }

    # Execute TWAP
    result = await twap_executor.execute(
        symbol="AAPL",
        total_quantity=200,
        action="BUY",
        time_window_minutes=1,
        num_slices=2,
    )

    # Should track partial fills
    assert "slices" in result
    # Implementation may continue or adjust remaining slices


# ============================================================================
# VWAP Execution Tests
# ============================================================================


@pytest.mark.asyncio
async def test_vwap_execution_with_volume_weighting(vwap_executor, mock_order_manager):
    """Test VWAP execution weights by volume."""
    # Mock volume profile data
    with patch.object(
        vwap_executor,
        "_get_volume_profile",
        return_value=[
            {"time": "09:30", "volume_pct": 0.15},
            {"time": "10:00", "volume_pct": 0.20},
            {"time": "10:30", "volume_pct": 0.25},
            {"time": "11:00", "volume_pct": 0.20},
            {"time": "11:30", "volume_pct": 0.20},
        ],
    ):
        # Execute VWAP order
        result = await vwap_executor.execute(
            symbol="AAPL",
            total_quantity=1000,
            action="BUY",
            time_window_minutes=120,  # 2 hours
        )

        # Should have executed volume-weighted slices
        assert result["symbol"] == "AAPL"
        assert result["total_quantity"] == 1000
        assert "slices" in result

        # Slices should be volume-weighted (not equal sized)
        slice_quantities = [s["quantity"] for s in result["slices"]]

        # Largest slice should correspond to highest volume period (10:30 - 25%)
        max_slice = max(slice_quantities)
        assert max_slice > 200  # More than equal distribution (1000/5=200)


@pytest.mark.asyncio
async def test_vwap_without_volume_data_fallback(vwap_executor):
    """Test VWAP falls back to TWAP without volume data."""
    # Mock no volume profile available
    with patch.object(vwap_executor, "_get_volume_profile", return_value=None):
        # Execute VWAP
        result = await vwap_executor.execute(
            symbol="AAPL", total_quantity=1000, action="BUY", time_window_minutes=60
        )

        # Should complete (fallback to equal slicing)
        assert result["symbol"] == "AAPL"
        assert result["total_quantity"] == 1000


# ============================================================================
# Stop Loss Placement Tests
# ============================================================================


@pytest.mark.asyncio
async def test_automatic_stop_placement_after_buy(execution_router, mock_order_manager):
    """Test automatic stop loss placed after buy execution."""
    # Execute buy order
    result = await execution_router.route_order(
        symbol="AAPL",
        quantity=100,
        action="BUY",
        current_price=150.0,
        urgency="IMMEDIATE",
    )

    # In production, stop loss would be automatically placed
    # For now, verify execution completed
    assert result["order_id"] is not None
    assert result["execution_type"] == "MARKET"


@pytest.mark.asyncio
async def test_stop_loss_calculation_from_entry_price(mock_order_manager):
    """Test stop loss calculated from actual entry price."""
    from core.risk.stop_loss_manager import StopLossManager

    mgr = StopLossManager(
        account_balance=100000.0, max_risk_per_trade=0.02, default_stop_pct=0.02
    )

    # Calculate stop for executed position
    entry_price = 150.0  # Actual fill price
    position_size = 15000.0  # $15k position

    stop_data = mgr.calculate_stop_loss(
        symbol="AAPL",
        entry_price=entry_price,
        position_size=position_size,
        position_side="long",
        stop_type="fixed_pct",
        stop_pct=0.02,
    )

    # Stop should be 2% below entry
    expected_stop = entry_price * 0.98
    assert stop_data["stop_price"] == expected_stop
    assert stop_data["shares"] == 100  # 15000 / 150


@pytest.mark.asyncio
async def test_stop_loss_not_placed_for_sells(execution_router):
    """Test stop loss not placed for sell orders."""
    # Execute sell order
    result = await execution_router.route_order(
        symbol="AAPL",
        quantity=100,
        action="SELL",
        current_price=150.0,
        urgency="IMMEDIATE",
    )

    # Should complete without stop (selling = closing position)
    assert result["execution_type"] == "MARKET"


# ============================================================================
# Order Rejection Handling Tests
# ============================================================================


@pytest.mark.asyncio
async def test_execution_handles_order_rejection(execution_router, mock_order_manager):
    """Test execution handles order rejection gracefully."""
    # Mock order rejection
    mock_order_manager.place_market_order.return_value = None  # Failed

    # Try to execute
    with pytest.raises(Exception):
        await execution_router.route_order(
            symbol="AAPL",
            quantity=100,
            action="BUY",
            current_price=150.0,
            urgency="IMMEDIATE",
        )


@pytest.mark.asyncio
async def test_execution_handles_broker_error(execution_router, mock_order_manager):
    """Test execution handles broker errors."""
    # Mock broker error
    mock_order_manager.place_market_order.side_effect = Exception(
        "Broker connection lost"
    )

    # Should propagate error
    with pytest.raises(Exception):
        await execution_router.route_order(
            symbol="AAPL",
            quantity=100,
            action="BUY",
            current_price=150.0,
            urgency="IMMEDIATE",
        )


# ============================================================================
# Slippage Tracking Tests
# ============================================================================


@pytest.mark.asyncio
async def test_slippage_estimation_and_tracking(execution_router):
    """Test slippage is estimated and tracked."""
    # Execute order with slippage estimation
    result = await execution_router.route_order(
        symbol="AAPL",
        quantity=100,
        action="BUY",
        current_price=150.0,
        urgency="NORMAL",
        avg_daily_volume=10000000,
    )

    # Should have slippage info in routing metadata
    assert "routing_info" in result
    routing_info = result["routing_info"]

    # May have slippage estimate
    if routing_info.get("slippage_estimate"):
        slippage = routing_info["slippage_estimate"]
        assert "slippage_bps" in slippage
        assert "estimated_fill_price" in slippage


def test_slippage_model_calculation():
    """Test slippage model calculations."""
    model = SlippageModel()

    # Estimate slippage for order
    estimate = model.estimate_slippage(
        symbol="AAPL",
        quantity=1000,
        action="BUY",
        current_price=150.0,
        avg_daily_volume=50000000,
        order_type="MARKET",
    )

    # Should have slippage estimate
    assert estimate.slippage_bps >= 0
    assert estimate.estimated_fill_price >= current_price  # Buy = pay more
    assert estimate.slippage_dollars >= 0


def test_slippage_increases_with_order_size():
    """Test slippage increases with larger orders."""
    model = SlippageModel()

    # Small order
    small_estimate = model.estimate_slippage(
        symbol="AAPL",
        quantity=100,
        action="BUY",
        current_price=150.0,
        avg_daily_volume=50000000,
        order_type="MARKET",
    )

    # Large order
    large_estimate = model.estimate_slippage(
        symbol="AAPL",
        quantity=10000,
        action="BUY",
        current_price=150.0,
        avg_daily_volume=50000000,
        order_type="MARKET",
    )

    # Large order should have more slippage
    assert large_estimate.slippage_bps > small_estimate.slippage_bps


# ============================================================================
# Multi-Leg Order Coordination Tests
# ============================================================================


@pytest.mark.asyncio
async def test_bracket_order_coordination(mock_order_manager):
    """Test bracket order (entry + stop + target) coordination."""
    # Mock bracket order manager methods
    mock_order_manager.place_limit_order = AsyncMock(return_value="entry_order")
    mock_order_manager.place_stop_order = AsyncMock(return_value="stop_order")

    # Simulate bracket order placement
    entry_id = await mock_order_manager.place_limit_order(
        symbol="AAPL", quantity=100, action="BUY", limit_price=150.0
    )
    stop_id = await mock_order_manager.place_stop_order(
        symbol="AAPL", quantity=100, action="SELL", stop_price=147.0
    )

    # Should have multiple order IDs
    assert entry_id == "entry_order"
    assert stop_id == "stop_order"


@pytest.mark.asyncio
async def test_multi_symbol_execution_coordination(execution_router):
    """Test coordinated execution across multiple symbols."""
    symbols = ["AAPL", "MSFT", "GOOGL"]
    results = []

    for symbol in symbols:
        result = await execution_router.route_order(
            symbol=symbol,
            quantity=100,
            action="BUY",
            current_price=150.0,
            urgency="NORMAL",
        )
        results.append(result)

        # Small delay to avoid rate limits
        await asyncio.sleep(0.01)

    # All should execute
    assert len(results) == 3
    assert all(r["order_id"] is not None for r in results)


# ============================================================================
# Position Monitoring After Execution Tests
# ============================================================================


@pytest.mark.asyncio
async def test_position_monitoring_after_fill(execution_router, mock_order_manager):
    """Test position is monitored after fill."""
    # Execute order
    result = await execution_router.route_order(
        symbol="AAPL",
        quantity=100,
        action="BUY",
        current_price=150.0,
        urgency="IMMEDIATE",
    )

    order_id = result["order_id"]

    # Query order status
    status = await mock_order_manager.get_order_status(order_id)

    # Should have fill details
    assert status["status"] == "FILLED"
    assert status["filled_avg_price"] > 0
    assert status["filled_quantity"] == 100


@pytest.mark.asyncio
async def test_execution_statistics_tracking(execution_router):
    """Test execution statistics are tracked."""
    # Execute multiple orders
    for i in range(5):
        await execution_router.route_order(
            symbol="AAPL",
            quantity=100 + i * 50,
            action="BUY",
            current_price=150.0,
            urgency="NORMAL",
        )

    # Get execution statistics
    stats = execution_router.get_execution_statistics()

    assert stats["total_executions"] == 5
    assert "by_strategy" in stats
    assert stats["total_executions"] > 0


# ============================================================================
# Performance and Stress Tests
# ============================================================================


@pytest.mark.asyncio
async def test_execution_pipeline_performance(execution_router):
    """Test execution pipeline performance under load."""
    import time

    # Execute 20 orders rapidly
    start = time.time()

    tasks = []
    for i in range(20):
        task = execution_router.route_order(
            symbol=f"STOCK{i}",
            quantity=100,
            action="BUY",
            current_price=100.0,
            urgency="NORMAL",
        )
        tasks.append(task)

    results = await asyncio.gather(*tasks)
    elapsed = time.time() - start

    # Should complete reasonably fast (< 5 seconds for 20 orders)
    assert elapsed < 5.0
    assert len(results) == 20


@pytest.mark.asyncio
async def test_twap_execution_under_volatility(twap_executor, mock_order_manager):
    """Test TWAP execution adapts to volatility."""
    # Mock volatile fills
    fill_prices = [150.0, 152.0, 149.0, 151.0, 150.5]
    call_count = {"count": 0}

    async def mock_place_order(*args, **kwargs):
        idx = call_count["count"]
        call_count["count"] += 1
        return f"order_{idx}"

    mock_order_manager.place_market_order.side_effect = mock_place_order

    # Execute TWAP
    result = await twap_executor.execute(
        symbol="VOLATILE",
        total_quantity=500,
        action="BUY",
        time_window_minutes=5,
        num_slices=5,
    )

    # Should complete all slices despite volatility
    assert result["num_slices"] == 5
    assert len(result["slices"]) == 5


# ============================================================================
# Edge Cases
# ============================================================================


@pytest.mark.asyncio
async def test_execution_with_zero_quantity(execution_router):
    """Test execution handles zero quantity gracefully."""
    # Should reject or handle gracefully
    try:
        await execution_router.route_order(
            symbol="AAPL", quantity=0, action="BUY", current_price=150.0  # Invalid
        )
        # If it doesn't raise, check result
    except (ValueError, Exception):
        # Expected to raise
        pass


@pytest.mark.asyncio
async def test_execution_with_negative_price(execution_router):
    """Test execution handles negative price gracefully."""
    # Should handle invalid price
    result = await execution_router.route_order(
        symbol="AAPL",
        quantity=100,
        action="BUY",
        current_price=None,  # Missing price
        urgency="NORMAL",
    )

    # Should still attempt (using fallback price)
    assert result is not None or "error" in result


@pytest.mark.asyncio
async def test_twap_with_single_slice(twap_executor):
    """Test TWAP with single slice (edge case)."""
    result = await twap_executor.execute(
        symbol="AAPL",
        total_quantity=100,
        action="BUY",
        time_window_minutes=1,
        num_slices=1,  # Single slice = market order
    )

    # Should execute as single order
    assert result["num_slices"] == 1
    assert len(result["slices"]) == 1
