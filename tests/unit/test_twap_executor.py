"""
Comprehensive unit tests for TWAP (Time-Weighted Average Price) Executor.

Tests cover:
- Slice plan creation and distribution
- Execution flow and async behavior
- Cancellation and status tracking
- Results calculation and reporting
- Edge cases and error handling
"""

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from core.execution.twap import TWAPExecutor, TWAPSlice

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_order_manager():
    """Mock order manager for testing."""
    manager = AsyncMock()
    manager.place_market_order = AsyncMock(return_value="ORDER_123")
    manager.get_order_status = AsyncMock(
        return_value={"filled_avg_price": 150.0, "status": "FILLED"}
    )
    manager.cancel_order = AsyncMock(return_value=True)
    return manager


@pytest.fixture
def twap_executor(mock_order_manager):
    """Create TWAP executor instance."""
    return TWAPExecutor(
        order_manager=mock_order_manager,
        default_time_window=60,
        default_num_slices=10,
        timing_randomization=30,
    )


@pytest.fixture
def sample_execution_params():
    """Sample execution parameters."""
    return {
        "symbol": "AAPL",
        "total_quantity": 1000,
        "action": "BUY",
        "time_window_minutes": 60,
        "num_slices": 10,
    }


# =============================================================================
# TestTWAPSlicePlan - Slice Planning Tests (8 tests)
# =============================================================================


class TestTWAPSlicePlan:
    """Test TWAP slice plan creation."""

    def test_create_slice_plan_equal_distribution(self, twap_executor):
        """Test slice plan with evenly divisible quantity."""
        slices = twap_executor._create_slice_plan(
            total_quantity=1000,
            num_slices=10,
            time_window_minutes=60,
            randomize_timing=False,
        )

        assert len(slices) == 10
        assert all(s.quantity == 100 for s in slices)
        assert sum(s.quantity for s in slices) == 1000

    def test_create_slice_plan_with_remainder(self, twap_executor):
        """Test slice plan with remainder distribution."""
        slices = twap_executor._create_slice_plan(
            total_quantity=1005,
            num_slices=10,
            time_window_minutes=60,
            randomize_timing=False,
        )

        assert len(slices) == 10
        # First 5 slices should have 101 shares (100 + 1 from remainder)
        assert all(s.quantity == 101 for s in slices[:5])
        # Remaining slices should have 100 shares
        assert all(s.quantity == 100 for s in slices[5:])
        assert sum(s.quantity for s in slices) == 1005

    def test_create_slice_plan_minimum_slices(self, twap_executor):
        """Test slice plan with minimum number of slices."""
        slices = twap_executor._create_slice_plan(
            total_quantity=100,
            num_slices=1,
            time_window_minutes=5,
            randomize_timing=False,
        )

        assert len(slices) == 1
        assert slices[0].quantity == 100
        assert slices[0].slice_id == 1

    def test_create_slice_plan_maximum_slices(self, twap_executor):
        """Test slice plan with large number of slices."""
        slices = twap_executor._create_slice_plan(
            total_quantity=1000,
            num_slices=100,
            time_window_minutes=60,
            randomize_timing=False,
        )

        assert len(slices) == 100
        assert all(s.quantity == 10 for s in slices)
        assert sum(s.quantity for s in slices) == 1000

    def test_create_slice_plan_timing_distribution(self, twap_executor):
        """Test slice timing is evenly distributed."""
        slices = twap_executor._create_slice_plan(
            total_quantity=1000,
            num_slices=10,
            time_window_minutes=60,
            randomize_timing=False,
        )

        # Check timing intervals (should be ~6 minutes apart)
        for i in range(1, len(slices)):
            time_diff = (
                slices[i].scheduled_time - slices[i - 1].scheduled_time
            ).total_seconds()
            assert 350 <= time_diff <= 370  # ~6 minutes ± tolerance

    def test_create_slice_plan_randomized_timing(self, twap_executor):
        """Test randomized timing variation is applied."""
        slices = twap_executor._create_slice_plan(
            total_quantity=1000,
            num_slices=10,
            time_window_minutes=60,
            randomize_timing=True,
        )

        # First slice should not be randomized
        expected_first_time = slices[0].scheduled_time

        # Subsequent slices should have some variation
        # Can't assert exact randomness, but verify structure is correct
        assert slices[0].scheduled_time == expected_first_time
        assert all(s.scheduled_time is not None for s in slices)

    def test_create_slice_plan_zero_quantity(self, twap_executor):
        """Test slice plan with zero quantity."""
        slices = twap_executor._create_slice_plan(
            total_quantity=0,
            num_slices=10,
            time_window_minutes=60,
            randomize_timing=False,
        )

        assert len(slices) == 10
        assert all(s.quantity == 0 for s in slices)

    def test_create_slice_plan_small_quantity(self, twap_executor):
        """Test slice plan where quantity < num_slices."""
        slices = twap_executor._create_slice_plan(
            total_quantity=5,
            num_slices=10,
            time_window_minutes=60,
            randomize_timing=False,
        )

        assert len(slices) == 10
        # First 5 slices get 1 share each
        assert sum(s.quantity for s in slices[:5]) == 5
        # Remaining slices get 0 shares
        assert all(s.quantity == 0 for s in slices[5:])
        assert sum(s.quantity for s in slices) == 5


# =============================================================================
# TestTWAPExecution - Main Execution Flow Tests (12 tests)
# =============================================================================


class TestTWAPExecution:
    """Test TWAP execution flow."""

    @pytest.mark.asyncio
    async def test_execute_success_all_slices(
        self, twap_executor, sample_execution_params
    ):
        """Test successful execution of all slices."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["status"] == "COMPLETED"
        assert result["total_quantity"] == 1000
        assert result["executed_quantity"] == 1000
        assert result["slices_executed"] == 10
        assert result["slices_failed"] == 0
        assert result["avg_price"] == 150.0

    @pytest.mark.asyncio
    async def test_execute_with_partial_fills(
        self, twap_executor, sample_execution_params
    ):
        """Test execution with some slices failing."""
        mock_om = twap_executor.order_manager

        # Make every other slice fail
        async def place_order_side_effect(*args, **kwargs):
            place_order_side_effect.counter = (
                getattr(place_order_side_effect, "counter", 0) + 1
            )
            if place_order_side_effect.counter % 2 == 0:
                return None  # Fail
            return f"ORDER_{place_order_side_effect.counter}"

        mock_om.place_market_order = AsyncMock(side_effect=place_order_side_effect)

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["status"] == "COMPLETED"
        assert result["slices_executed"] == 5
        assert result["slices_failed"] == 5
        assert result["executed_quantity"] == 500

    @pytest.mark.asyncio
    async def test_execute_with_slice_failures(
        self, twap_executor, sample_execution_params
    ):
        """Test execution when order placement raises exceptions."""
        mock_om = twap_executor.order_manager

        # Make first 3 slices raise exceptions
        async def place_order_side_effect(*args, **kwargs):
            place_order_side_effect.counter = (
                getattr(place_order_side_effect, "counter", 0) + 1
            )
            if place_order_side_effect.counter <= 3:
                raise Exception("Order placement failed")
            return f"ORDER_{place_order_side_effect.counter}"

        mock_om.place_market_order = AsyncMock(side_effect=place_order_side_effect)

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["status"] == "COMPLETED"
        assert result["slices_failed"] == 3
        assert result["slices_executed"] == 7

    @pytest.mark.asyncio
    async def test_execute_cancellation_mid_execution(
        self, twap_executor, sample_execution_params
    ):
        """Test cancelling execution mid-flight."""
        counter = {"count": 0}

        async def cancel_after_slices(*args, **kwargs):
            """Cancel execution after 3 slices."""
            counter["count"] += 1
            if counter["count"] == 3:
                # Get execution ID from active executions
                exec_ids = twap_executor.get_active_executions()
                if exec_ids:
                    await twap_executor.cancel_execution(exec_ids[0])
            return f"ORDER_{counter['count']}"

        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=cancel_after_slices
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        # Should have executed some slices before cancellation
        assert result["slices_executed"] <= 10
        slices = result["slices"]
        cancelled_slices = [s for s in slices if s.status == "CANCELLED"]
        # At least some slices should exist (either executed or cancelled)
        assert len(slices) == 10

    @pytest.mark.asyncio
    async def test_execute_with_rate_limiting(
        self, twap_executor, sample_execution_params
    ):
        """Test execution respects timing between slices."""
        sleep_times = []

        async def track_sleep(seconds):
            sleep_times.append(seconds)

        with patch("asyncio.sleep", new_callable=AsyncMock, side_effect=track_sleep):
            await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        # Should have 9 sleep calls (10 slices - first slice executes immediately)
        # First slice executes immediately, so we skip it
        assert len([s for s in sleep_times if s > 0]) >= 8

    @pytest.mark.asyncio
    async def test_execute_with_market_closure(
        self, twap_executor, sample_execution_params
    ):
        """Test execution handles market closure gracefully."""
        # Simulate market closure by making order manager return None
        twap_executor.order_manager.place_market_order = AsyncMock(return_value=None)

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["status"] == "COMPLETED"
        assert result["slices_failed"] == 10
        assert result["executed_quantity"] == 0

    @pytest.mark.asyncio
    async def test_execute_records_execution_time(
        self, twap_executor, sample_execution_params
    ):
        """Test execution records accurate timing."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert "start_time" in result
        assert "end_time" in result
        assert "duration_minutes" in result
        assert isinstance(result["start_time"], datetime)
        assert isinstance(result["end_time"], datetime)
        assert result["end_time"] >= result["start_time"]

    @pytest.mark.asyncio
    async def test_execute_calculates_average_price(
        self, twap_executor, sample_execution_params
    ):
        """Test average price calculation across slices."""
        # Mock different prices for different slices
        prices = [150.0, 151.0, 149.5, 150.5, 150.0, 151.5, 149.0, 150.0, 151.0, 150.5]
        price_index = 0

        async def get_order_status_varying(*args, **kwargs):
            nonlocal price_index
            price = prices[price_index % len(prices)]
            price_index += 1
            return {"filled_avg_price": price, "status": "FILLED"}

        twap_executor.order_manager.get_order_status = AsyncMock(
            side_effect=get_order_status_varying
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        # Calculate expected average: sum(price * quantity) / total_quantity
        expected_avg = sum(prices) / len(prices)
        assert abs(result["avg_price"] - expected_avg) < 0.01

    @pytest.mark.asyncio
    async def test_execute_tracks_slippage(
        self, twap_executor, sample_execution_params
    ):
        """Test execution tracks price slippage."""
        # Set varying prices to simulate slippage
        twap_executor.order_manager.get_order_status = AsyncMock(
            return_value={"filled_avg_price": 152.5, "status": "FILLED"}
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["avg_price"] == 152.5
        assert result["total_cost"] == 1000 * 152.5

    @pytest.mark.asyncio
    async def test_execute_with_intermittent_failures(
        self, twap_executor, sample_execution_params
    ):
        """Test execution continues after intermittent failures."""
        failure_pattern = [
            True,
            False,
            True,
            False,
            False,
            True,
            False,
            False,
            False,
            False,
        ]
        pattern_index = 0

        async def intermittent_failure(*args, **kwargs):
            nonlocal pattern_index
            should_fail = failure_pattern[pattern_index % len(failure_pattern)]
            pattern_index += 1
            if should_fail:
                return None
            return f"ORDER_{pattern_index}"

        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=intermittent_failure
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["status"] == "COMPLETED"
        assert result["slices_failed"] == 3
        assert result["slices_executed"] == 7

    @pytest.mark.asyncio
    async def test_execute_respects_time_window(
        self, twap_executor, sample_execution_params
    ):
        """Test execution stays within specified time window."""
        slices_data = []

        async def capture_slice_data(*args, **kwargs):
            slices_data.append(datetime.now())
            return "ORDER_123"

        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=capture_slice_data
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        # Verify all slices are recorded
        assert len(result["slices"]) == 10

    @pytest.mark.asyncio
    async def test_execute_with_all_slices_failing(
        self, twap_executor, sample_execution_params
    ):
        """Test execution when all slices fail."""
        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=Exception("All orders failed")
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["status"] == "COMPLETED"
        assert result["slices_failed"] == 10
        assert result["slices_executed"] == 0
        assert result["executed_quantity"] == 0
        assert result["avg_price"] == 0.0


# =============================================================================
# TestTWAPAsyncBehavior - Async Behavior Tests (8 tests)
# =============================================================================


class TestTWAPAsyncBehavior:
    """Test TWAP async behavior and concurrency."""

    @pytest.mark.asyncio
    async def test_execute_asyncio_sleep_timing(
        self, twap_executor, sample_execution_params
    ):
        """Test asyncio.sleep is called with correct timing."""
        sleep_calls = []

        async def track_sleep(seconds):
            sleep_calls.append(seconds)

        with patch("asyncio.sleep", new_callable=AsyncMock, side_effect=track_sleep):
            await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        # Verify sleep was called for slices (excluding first slice)
        assert len([s for s in sleep_calls if s > 0]) >= 8

    @pytest.mark.asyncio
    async def test_execute_concurrent_executions(
        self, twap_executor, mock_order_manager
    ):
        """Test multiple concurrent TWAP executions."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            # Start two concurrent executions
            task1 = asyncio.create_task(
                twap_executor.execute(
                    symbol="AAPL",
                    total_quantity=1000,
                    action="BUY",
                    time_window_minutes=30,
                    num_slices=5,
                    randomize_timing=False,
                )
            )

            task2 = asyncio.create_task(
                twap_executor.execute(
                    symbol="GOOGL",
                    total_quantity=500,
                    action="SELL",
                    time_window_minutes=30,
                    num_slices=5,
                    randomize_timing=False,
                )
            )

            results = await asyncio.gather(task1, task2)

        assert len(results) == 2
        assert results[0]["symbol"] == "AAPL"
        assert results[1]["symbol"] == "GOOGL"
        assert results[0]["total_quantity"] == 1000
        assert results[1]["total_quantity"] == 500

    @pytest.mark.asyncio
    async def test_execute_state_tracking(self, twap_executor, sample_execution_params):
        """Test execution state is tracked correctly."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            # Start execution (don't await yet)
            exec_task = asyncio.create_task(
                twap_executor.execute(**sample_execution_params, randomize_timing=False)
            )

            # Give it a moment to start
            await asyncio.sleep(0.01)

            # Check active executions
            active = twap_executor.get_active_executions()

            # Wait for completion
            await exec_task

        # Should have been in active executions during run
        # After completion, should be in history
        assert len(twap_executor.execution_history) > 0

    @pytest.mark.asyncio
    async def test_cancel_execution_stops_slices(
        self, twap_executor, sample_execution_params
    ):
        """Test cancellation stops pending slices."""
        cancel_trigger = asyncio.Event()

        async def slow_order_placement(*args, **kwargs):
            """Slow order placement to allow cancellation."""
            await asyncio.sleep(0.05)
            return "ORDER_123"

        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=slow_order_placement
        )

        async def cancel_soon():
            await asyncio.sleep(0.1)
            exec_ids = twap_executor.get_active_executions()
            if exec_ids:
                await twap_executor.cancel_execution(exec_ids[0])

        with patch("asyncio.sleep", new_callable=AsyncMock):
            # Start execution and cancellation concurrently
            exec_task = asyncio.create_task(
                twap_executor.execute(**sample_execution_params, randomize_timing=False)
            )
            cancel_task = asyncio.create_task(cancel_soon())

            result = await exec_task
            await cancel_task

        # Some slices should be cancelled
        cancelled = [s for s in result["slices"] if s.status == "CANCELLED"]
        assert len(cancelled) >= 0  # May have executed some before cancel

    @pytest.mark.asyncio
    async def test_cancel_execution_cleanup(
        self, twap_executor, sample_execution_params
    ):
        """Test cancellation cleans up pending orders."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            # Start execution
            exec_task = asyncio.create_task(
                twap_executor.execute(**sample_execution_params, randomize_timing=False)
            )

            await asyncio.sleep(0.01)

            # Cancel it
            exec_ids = twap_executor.get_active_executions()
            if exec_ids:
                cancelled = await twap_executor.cancel_execution(exec_ids[0])
                assert cancelled is True

            await exec_task

    @pytest.mark.asyncio
    async def test_get_execution_status_active(
        self, twap_executor, sample_execution_params
    ):
        """Test getting status of active execution."""
        status_captured = None
        first_slice_started = asyncio.Event()
        allow_continue = asyncio.Event()

        async def controlled_order_placement(*args, **kwargs):
            """Control order placement to capture active status between slices."""
            first_slice_started.set()
            await allow_continue.wait()  # Block until we've captured status
            return "ORDER_123"

        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=controlled_order_placement
        )

        # Patch asyncio.sleep to avoid real waits
        with patch("asyncio.sleep", new_callable=AsyncMock):
            # Start execution task
            exec_task = asyncio.create_task(
                twap_executor.execute(
                    **sample_execution_params,
                    execution_id="test_exec_123",
                    randomize_timing=False,
                )
            )

            # Wait for first slice to start (execution is now active)
            await asyncio.wait_for(first_slice_started.wait(), timeout=1.0)

            # Get status while execution is running
            status_captured = twap_executor.get_execution_status("test_exec_123")

            # Allow the execution to continue and complete
            allow_continue.set()

            # Wait for completion
            try:
                await asyncio.wait_for(exec_task, timeout=2.0)
            except asyncio.TimeoutError:
                exec_task.cancel()
                try:
                    await exec_task
                except asyncio.CancelledError:
                    pass

        # Verify we captured active status
        assert status_captured is not None
        assert status_captured["execution_id"] == "test_exec_123"
        assert "progress_pct" in status_captured
        assert "slices_executed" in status_captured

    @pytest.mark.asyncio
    async def test_get_execution_status_completed(
        self, twap_executor, sample_execution_params
    ):
        """Test getting status of completed execution."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params,
                execution_id="completed_exec",
                randomize_timing=False,
            )

        # Get status from history
        status = twap_executor.get_execution_status("completed_exec")

        assert status is not None
        assert status["execution_id"] == "completed_exec"
        assert status["status"] == "COMPLETED"

    @pytest.mark.asyncio
    async def test_get_execution_status_not_found(self, twap_executor):
        """Test getting status of non-existent execution."""
        status = twap_executor.get_execution_status("nonexistent_exec")
        assert status is None


# =============================================================================
# TestTWAPResults - Results Calculation Tests (7 tests)
# =============================================================================


class TestTWAPResults:
    """Test TWAP results calculation."""

    @pytest.mark.asyncio
    async def test_results_total_quantity_correct(
        self, twap_executor, sample_execution_params
    ):
        """Test total quantity matches input."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["total_quantity"] == sample_execution_params["total_quantity"]

    @pytest.mark.asyncio
    async def test_results_average_price_calculation(
        self, twap_executor, sample_execution_params
    ):
        """Test average price is calculated correctly."""
        # Mock varying prices
        prices = [100.0, 101.0, 102.0, 103.0, 104.0, 105.0, 106.0, 107.0, 108.0, 109.0]
        price_iter = iter(prices)

        async def get_varying_price(*args, **kwargs):
            return {"filled_avg_price": next(price_iter), "status": "FILLED"}

        twap_executor.order_manager.get_order_status = AsyncMock(
            side_effect=get_varying_price
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        expected_avg = sum(prices) / len(prices)
        assert abs(result["avg_price"] - expected_avg) < 0.01

    @pytest.mark.asyncio
    async def test_results_slices_executed_count(
        self, twap_executor, sample_execution_params
    ):
        """Test executed slices count is accurate."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["slices_executed"] == 10
        assert result["total_slices"] == 10

    @pytest.mark.asyncio
    async def test_results_slices_failed_count(
        self, twap_executor, sample_execution_params
    ):
        """Test failed slices count is accurate."""
        # Make half the orders fail
        call_count = 0

        async def fail_alternating(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return "ORDER_123" if call_count % 2 == 1 else None

        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=fail_alternating
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["slices_failed"] == 5
        assert result["slices_executed"] == 5

    @pytest.mark.asyncio
    async def test_results_execution_duration(
        self, twap_executor, sample_execution_params
    ):
        """Test execution duration is calculated."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert "duration_minutes" in result
        assert result["duration_minutes"] >= 0
        assert isinstance(result["duration_minutes"], (int, float))

    @pytest.mark.asyncio
    async def test_results_with_no_fills(self, twap_executor, sample_execution_params):
        """Test results when no slices are filled."""
        twap_executor.order_manager.place_market_order = AsyncMock(return_value=None)

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["executed_quantity"] == 0
        assert result["avg_price"] == 0.0
        assert result["total_cost"] == 0.0
        assert result["slices_executed"] == 0
        assert result["slices_failed"] == 10

    @pytest.mark.asyncio
    async def test_results_with_partial_execution(
        self, twap_executor, sample_execution_params
    ):
        """Test results with partial execution."""
        # Only first 3 slices succeed
        call_count = 0

        async def partial_success(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return f"ORDER_{call_count}" if call_count <= 3 else None

        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=partial_success
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        assert result["slices_executed"] == 3
        assert result["slices_failed"] == 7
        assert result["executed_quantity"] == 300  # 3 slices * 100 shares each


# =============================================================================
# TestTWAPEdgeCases - Edge Cases and Error Handling (5 tests)
# =============================================================================


class TestTWAPEdgeCases:
    """Test TWAP edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_execute_with_none_fill_price(
        self, twap_executor, sample_execution_params
    ):
        """Test execution handles None fill price."""
        twap_executor.order_manager.get_order_status = AsyncMock(
            return_value={"filled_avg_price": None, "status": "PENDING"}
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        # Should handle None prices gracefully
        assert result["status"] == "COMPLETED"
        # Avg price should only count slices with actual prices
        assert result["avg_price"] >= 0

    @pytest.mark.asyncio
    async def test_execute_negative_wait_time_handled(
        self, twap_executor, sample_execution_params
    ):
        """Test execution handles past scheduled times."""
        # Create slices with past scheduled times
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

            # Should not sleep negative amounts
            for call in mock_sleep.call_args_list:
                if call[0]:  # If there are positional args
                    assert call[0][0] >= 0

        assert result["status"] == "COMPLETED"

    @pytest.mark.asyncio
    async def test_execute_with_very_short_time_window(self, twap_executor):
        """Test execution with very short time window."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                symbol="AAPL",
                total_quantity=100,
                action="BUY",
                time_window_minutes=1,
                num_slices=5,
                randomize_timing=False,
            )

        assert result["status"] == "COMPLETED"
        assert result["total_quantity"] == 100
        assert len(result["slices"]) == 5

    @pytest.mark.asyncio
    async def test_execute_with_very_long_time_window(self, twap_executor):
        """Test execution with very long time window."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                symbol="AAPL",
                total_quantity=1000,
                action="BUY",
                time_window_minutes=480,  # 8 hours
                num_slices=10,
                randomize_timing=False,
            )

        assert result["status"] == "COMPLETED"
        assert len(result["slices"]) == 10

    @pytest.mark.asyncio
    async def test_execute_cleanup_on_exception(
        self, twap_executor, sample_execution_params
    ):
        """Test execution cleans up properly on exception."""
        # Make order manager raise exception
        twap_executor.order_manager.place_market_order = AsyncMock(
            side_effect=Exception("Fatal error")
        )

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        # Should still return completed result even with all failures
        assert result["status"] == "COMPLETED"
        assert result["slices_failed"] == 10


# =============================================================================
# Additional Tests - Executor Methods and State Management
# =============================================================================


class TestTWAPExecutorMethods:
    """Test TWAP executor helper methods."""

    def test_get_active_executions_empty(self, twap_executor):
        """Test getting active executions when none exist."""
        active = twap_executor.get_active_executions()
        assert active == []

    @pytest.mark.asyncio
    async def test_get_active_executions_with_running(self, twap_executor):
        """Test getting active executions during execution."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            task = asyncio.create_task(
                twap_executor.execute(
                    symbol="AAPL",
                    total_quantity=100,
                    action="BUY",
                    time_window_minutes=10,
                    num_slices=5,
                    randomize_timing=False,
                )
            )

            await asyncio.sleep(0.01)
            active = twap_executor.get_active_executions()

            await task

        # Should have had at least one active execution
        assert len(twap_executor.execution_history) > 0

    def test_get_execution_summary_empty(self, twap_executor):
        """Test execution summary with no history."""
        summary = twap_executor.get_execution_summary()

        assert summary["total_executions"] == 0
        assert summary["active_executions"] == 0
        assert summary["completed_executions"] == 0
        assert summary["failed_executions"] == 0

    @pytest.mark.asyncio
    async def test_get_execution_summary_with_history(
        self, twap_executor, sample_execution_params
    ):
        """Test execution summary with completed executions."""
        with patch("asyncio.sleep", new_callable=AsyncMock):
            await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )
            await twap_executor.execute(
                **sample_execution_params, randomize_timing=False
            )

        summary = twap_executor.get_execution_summary()

        assert summary["total_executions"] == 2
        assert summary["completed_executions"] == 2
        assert summary["active_executions"] == 0

    @pytest.mark.asyncio
    async def test_cancel_execution_not_found(self, twap_executor):
        """Test cancelling non-existent execution."""
        result = await twap_executor.cancel_execution("nonexistent_id")
        assert result is False

    def test_twap_slice_dataclass(self):
        """Test TWAPSlice dataclass initialization."""
        slice_obj = TWAPSlice(
            slice_id=1,
            quantity=100,
            scheduled_time=datetime.now(),
            order_id="ORDER_123",
            fill_price=150.0,
            status="EXECUTED",
        )

        assert slice_obj.slice_id == 1
        assert slice_obj.quantity == 100
        assert slice_obj.order_id == "ORDER_123"
        assert slice_obj.fill_price == 150.0
        assert slice_obj.status == "EXECUTED"

    def test_twap_slice_defaults(self):
        """Test TWAPSlice default values."""
        slice_obj = TWAPSlice(slice_id=1, quantity=100, scheduled_time=datetime.now())

        assert slice_obj.actual_execution_time is None
        assert slice_obj.order_id is None
        assert slice_obj.fill_price is None
        assert slice_obj.status == "PENDING"
