"""
TWAP (Time-Weighted Average Price) Execution Algorithm

Splits large orders into equal-sized chunks spread evenly across time.
Reduces market impact and detection by avoiding large block trades.

Key Features:
- Equal-sized order slices across time window
- Random timing variation to avoid detection
- Progress tracking and cancellation support
- Configurable time window and slice count
- Execution analytics and reporting

Use Case:
- Medium to large orders ($10k - $1M+)
- Non-urgent executions
- Minimize market impact
- Reduce information leakage

Example:
    >>> twap = TWAPExecutor(order_manager=order_mgr)
    >>> result = await twap.execute(
    ...     symbol="AAPL",
    ...     total_quantity=1000,
    ...     action="BUY",
    ...     time_window_minutes=60,
    ...     num_slices=10
    ... )
    >>> print(f"TWAP complete: {result['avg_price']:.2f}")
"""

import asyncio
import logging
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class TWAPSlice:
    """Represents a single TWAP order slice."""

    slice_id: int
    quantity: int
    scheduled_time: datetime
    actual_execution_time: Optional[datetime] = None
    order_id: Optional[str] = None
    fill_price: Optional[float] = None
    status: str = "PENDING"  # PENDING, EXECUTED, CANCELLED, FAILED


class TWAPExecutor:
    """
    Time-Weighted Average Price execution algorithm.

    Splits orders into equal-sized slices executed at regular intervals,
    with optional random timing variation to avoid detection.

    Attributes:
        order_manager: Order manager for placing slices
        default_time_window: Default execution window (minutes)
        default_num_slices: Default number of slices
        timing_randomization: Random timing variation (seconds)
    """

    def __init__(
        self,
        order_manager,
        default_time_window: int = 60,
        default_num_slices: int = 10,
        timing_randomization: int = 30,
    ):
        """
        Initialize TWAP executor.

        Args:
            order_manager: OrderManager instance for execution
            default_time_window: Default time window in minutes (default: 60)
            default_num_slices: Default number of slices (default: 10)
            timing_randomization: Random timing variation in seconds (default: 30)
        """
        self.order_manager = order_manager
        self.default_time_window = default_time_window
        self.default_num_slices = default_num_slices
        self.timing_randomization = timing_randomization

        self.active_executions: Dict[str, Dict[str, Any]] = {}
        self.execution_history: List[Dict[str, Any]] = []

        logger.info(
            f"TWAP Executor initialized: "
            f"window={default_time_window}m, slices={default_num_slices}"
        )

    async def execute(
        self,
        symbol: str,
        total_quantity: int,
        action: str,
        time_window_minutes: Optional[int] = None,
        num_slices: Optional[int] = None,
        randomize_timing: bool = True,
        execution_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute TWAP order.

        Args:
            symbol: Stock symbol
            total_quantity: Total shares to trade
            action: 'BUY' or 'SELL'
            time_window_minutes: Time window for execution
                (default: uses default_time_window)
            num_slices: Number of slices (default: uses default_num_slices)
            randomize_timing: Add random timing variation (default: True)
            execution_id: Custom execution ID (auto-generated if None)

        Returns:
            Dict with execution results:
                {
                    "execution_id": str,
                    "symbol": str,
                    "total_quantity": int,
                    "executed_quantity": int,
                    "avg_price": float,
                    "total_cost": float,
                    "slices_executed": int,
                    "slices_failed": int,
                    "start_time": datetime,
                    "end_time": datetime,
                    "duration_minutes": float,
                    "slices": List[TWAPSlice],
                    "status": str,
                }
        """
        # Use defaults if not specified
        time_window = time_window_minutes or self.default_time_window
        slices = num_slices or self.default_num_slices

        # Generate execution ID
        if execution_id is None:
            execution_id = f"twap_{symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        logger.info(
            f"Starting TWAP execution: {execution_id} - "
            f"{action} {total_quantity} {symbol} over {time_window}m in {slices} slices"
        )

        # Create execution plan
        slice_plan = self._create_slice_plan(
            total_quantity=total_quantity,
            num_slices=slices,
            time_window_minutes=time_window,
            randomize_timing=randomize_timing,
        )

        # Store execution state
        execution_state = {
            "execution_id": execution_id,
            "symbol": symbol,
            "action": action,
            "total_quantity": total_quantity,
            "time_window_minutes": time_window,
            "num_slices": slices,
            "slices": slice_plan,
            "start_time": datetime.now(),
            "status": "RUNNING",
        }

        self.active_executions[execution_id] = execution_state

        # Execute slices
        try:
            await self._execute_slices(execution_id, symbol, action, slice_plan)

            # Calculate results
            results = self._calculate_results(execution_state)

            # Mark as completed
            execution_state["status"] = "COMPLETED"
            execution_state["end_time"] = datetime.now()
            execution_state["results"] = results

            # Move to history
            self.execution_history.append(execution_state)
            del self.active_executions[execution_id]

            logger.info(
                f"TWAP execution complete: {execution_id} - "
                f"avg_price=${results['avg_price']:.2f}, "
                f"executed={results['executed_quantity']}/{total_quantity}"
            )

            return results

        except Exception as e:
            logger.error(f"TWAP execution failed: {execution_id} - {e}")
            execution_state["status"] = "FAILED"
            execution_state["error"] = str(e)
            raise

    def _create_slice_plan(
        self,
        total_quantity: int,
        num_slices: int,
        time_window_minutes: int,
        randomize_timing: bool = True,
    ) -> List[TWAPSlice]:
        """
        Create TWAP slice execution plan.

        Args:
            total_quantity: Total shares to trade
            num_slices: Number of slices
            time_window_minutes: Time window for execution
            randomize_timing: Add random timing variation

        Returns:
            List of TWAPSlice objects
        """
        # Calculate base slice size
        base_slice_size = total_quantity // num_slices
        remainder = total_quantity % num_slices

        # Calculate time interval between slices
        interval_minutes = time_window_minutes / num_slices

        slices = []
        start_time = datetime.now()

        for i in range(num_slices):
            # Distribute remainder across first slices
            slice_quantity = base_slice_size + (1 if i < remainder else 0)

            # Calculate scheduled time
            scheduled_time = start_time + timedelta(minutes=i * interval_minutes)

            # Add random timing variation
            if randomize_timing and i > 0:  # Don't randomize first slice
                random_seconds = random.randint(  # nosec
                    -self.timing_randomization, self.timing_randomization
                )
                scheduled_time += timedelta(seconds=random_seconds)

            slice_obj = TWAPSlice(
                slice_id=i + 1,
                quantity=slice_quantity,
                scheduled_time=scheduled_time,
            )

            slices.append(slice_obj)

        logger.debug(
            f"Created TWAP plan: {num_slices} slices, "
            f"base_size={base_slice_size}, window={time_window_minutes}m"
        )

        return slices

    async def _execute_slices(
        self, execution_id: str, symbol: str, action: str, slices: List[TWAPSlice]
    ):
        """
        Execute TWAP slices according to schedule.

        Args:
            execution_id: Execution ID
            symbol: Stock symbol
            action: 'BUY' or 'SELL'
            slices: List of slice plans
        """
        for slice_obj in slices:
            # Check if execution was cancelled
            if (
                execution_id not in self.active_executions
                or self.active_executions[execution_id]["status"] == "CANCELLED"
            ):
                logger.info(f"TWAP execution cancelled: {execution_id}")
                slice_obj.status = "CANCELLED"
                continue

            # Wait until scheduled time
            now = datetime.now()
            wait_time = (slice_obj.scheduled_time - now).total_seconds()

            if wait_time > 0:
                logger.debug(
                    f"Waiting {wait_time:.1f}s for slice "
                    f"{slice_obj.slice_id}/{len(slices)}"
                )
                await asyncio.sleep(wait_time)

            # Execute slice
            try:
                logger.info(
                    f"Executing TWAP slice {slice_obj.slice_id}/{len(slices)}: "
                    f"{action} {slice_obj.quantity} {symbol}"
                )

                order_id = await self.order_manager.place_market_order(
                    symbol=symbol,
                    quantity=slice_obj.quantity,
                    action=action,
                    validate_risk=True,
                )

                if order_id:
                    # Get fill details
                    order_status = await self.order_manager.get_order_status(order_id)

                    slice_obj.order_id = order_id
                    slice_obj.actual_execution_time = datetime.now()
                    slice_obj.fill_price = (
                        order_status.get("filled_avg_price") if order_status else None
                    )
                    slice_obj.status = "EXECUTED"

                    logger.info(
                        f"TWAP slice {slice_obj.slice_id} executed: "
                        f"order={order_id}, price=${slice_obj.fill_price:.2f}"
                    )
                else:
                    slice_obj.status = "FAILED"
                    logger.error(f"TWAP slice {slice_obj.slice_id} failed to execute")

            except Exception as e:
                logger.error(f"Error executing TWAP slice {slice_obj.slice_id}: {e}")
                slice_obj.status = "FAILED"

    def _calculate_results(self, execution_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate execution results.

        Args:
            execution_state: Execution state dictionary

        Returns:
            Results dictionary
        """
        slices = execution_state["slices"]

        # Calculate executed quantity and average price
        executed_slices = [s for s in slices if s.status == "EXECUTED"]
        failed_slices = [s for s in slices if s.status == "FAILED"]

        executed_quantity = sum(s.quantity for s in executed_slices)
        total_cost = sum(
            s.quantity * s.fill_price for s in executed_slices if s.fill_price
        )

        avg_price = total_cost / executed_quantity if executed_quantity > 0 else 0.0

        # Calculate duration
        if executed_slices:
            start_time = execution_state["start_time"]
            end_time = max(s.actual_execution_time for s in executed_slices)
            duration_minutes = (end_time - start_time).total_seconds() / 60
        else:
            duration_minutes = 0.0

        return {
            "execution_id": execution_state["execution_id"],
            "symbol": execution_state["symbol"],
            "action": execution_state["action"],
            "total_quantity": execution_state["total_quantity"],
            "executed_quantity": executed_quantity,
            "avg_price": avg_price,
            "total_cost": total_cost,
            "slices_executed": len(executed_slices),
            "slices_failed": len(failed_slices),
            "total_slices": len(slices),
            "start_time": execution_state["start_time"],
            "end_time": datetime.now(),
            "duration_minutes": duration_minutes,
            "slices": slices,
            "status": "COMPLETED",
        }

    async def cancel_execution(self, execution_id: str) -> bool:
        """
        Cancel active TWAP execution.

        Args:
            execution_id: Execution ID to cancel

        Returns:
            bool: True if cancelled
        """
        if execution_id not in self.active_executions:
            logger.warning(f"TWAP execution not found: {execution_id}")
            return False

        try:
            # Mark as cancelled
            self.active_executions[execution_id]["status"] = "CANCELLED"

            # Cancel any pending orders
            slices = self.active_executions[execution_id]["slices"]
            for slice_obj in slices:
                if slice_obj.status == "PENDING" and slice_obj.order_id:
                    await self.order_manager.cancel_order(slice_obj.order_id)

            logger.info(f"TWAP execution cancelled: {execution_id}")
            return True

        except Exception as e:
            logger.error(f"Error cancelling TWAP execution: {e}")
            return False

    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status of TWAP execution.

        Args:
            execution_id: Execution ID

        Returns:
            Status dictionary or None
        """
        # Check active executions
        if execution_id in self.active_executions:
            state = self.active_executions[execution_id]

            # Calculate progress
            slices = state["slices"]
            executed = len([s for s in slices if s.status == "EXECUTED"])
            total = len(slices)
            progress_pct = (executed / total) * 100 if total > 0 else 0.0

            return {
                "execution_id": execution_id,
                "status": state["status"],
                "progress_pct": progress_pct,
                "slices_executed": executed,
                "total_slices": total,
                "start_time": state["start_time"],
            }

        # Check history
        for state in self.execution_history:
            if state["execution_id"] == execution_id:
                return state.get("results", {})

        return None

    def get_active_executions(self) -> List[str]:
        """
        Get list of active execution IDs.

        Returns:
            List of execution IDs
        """
        return list(self.active_executions.keys())

    def get_execution_summary(self) -> Dict[str, Any]:
        """
        Get summary of all TWAP executions.

        Returns:
            Summary dictionary
        """
        total_executions = len(self.execution_history) + len(self.active_executions)
        completed = len(
            [e for e in self.execution_history if e["status"] == "COMPLETED"]
        )
        failed = len([e for e in self.execution_history if e["status"] == "FAILED"])

        return {
            "total_executions": total_executions,
            "active_executions": len(self.active_executions),
            "completed_executions": completed,
            "failed_executions": failed,
            "execution_history": self.execution_history[-10:],  # Last 10
        }
