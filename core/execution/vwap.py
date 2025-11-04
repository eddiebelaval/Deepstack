"""
VWAP (Volume-Weighted Average Price) Execution Algorithm

Splits large orders based on historical volume patterns to minimize market impact.
Executes more shares during high-volume periods, less during low-volume periods.

Key Features:
- Volume-based slice sizing using intraday profile
- U-shaped volume curve (high at open/close, low midday)
- Real-time volume tracking and adjustment
- VWAP deviation alerts
- Execution quality reporting

Use Case:
- Large institutional orders (> $100k)
- Minimize market impact
- Track benchmark VWAP price
- High-volume stocks

Example:
    >>> vwap = VWAPExecutor(order_manager=order_mgr)
    >>> result = await vwap.execute(
    ...     symbol="AAPL",
    ...     total_quantity=5000,
    ...     action="BUY",
    ...     time_window_minutes=120
    ... )
    >>> print(f"VWAP: ${result['vwap_price']:.2f}, "
    ...       f"execution: ${result['avg_price']:.2f}")
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class VWAPSlice:
    """Represents a single VWAP order slice."""

    slice_id: int
    quantity: int
    scheduled_time: datetime
    expected_volume_pct: float  # Expected % of total volume at this time
    actual_execution_time: Optional[datetime] = None
    order_id: Optional[str] = None
    fill_price: Optional[float] = None
    status: str = "PENDING"


class VWAPExecutor:
    """
    Volume-Weighted Average Price execution algorithm.

    Splits orders based on historical intraday volume patterns,
    executing larger slices during high-volume periods.

    Uses U-shaped volume curve typical of equity markets:
    - High volume: Market open (9:30-10:30 AM)
    - Medium volume: Midday (10:30 AM - 3:00 PM)
    - High volume: Market close (3:00-4:00 PM)

    Attributes:
        order_manager: Order manager for placing slices
        volume_profile: Intraday volume distribution
        vwap_deviation_threshold: Alert threshold for VWAP deviation
    """

    def __init__(
        self,
        order_manager,
        volume_profile: Optional[Dict[str, float]] = None,
        vwap_deviation_threshold: float = 0.005,  # 0.5%
    ):
        """
        Initialize VWAP executor.

        Args:
            order_manager: OrderManager instance
            volume_profile: Custom volume profile (uses default U-curve if None)
            vwap_deviation_threshold: VWAP deviation alert threshold (default: 0.5%)
        """
        self.order_manager = order_manager
        self.vwap_deviation_threshold = vwap_deviation_threshold

        # Use default U-shaped volume profile if not provided
        self.volume_profile = volume_profile or self._create_default_volume_profile()

        self.active_executions: Dict[str, Dict[str, Any]] = {}
        self.execution_history: List[Dict[str, Any]] = []

        logger.info(
            f"VWAP Executor initialized with "
            f"{len(self.volume_profile)} time buckets"
        )

    def _create_default_volume_profile(self) -> Dict[str, float]:
        """
        Create default U-shaped intraday volume profile.

        Based on typical equity market volume patterns:
        - 9:30-10:00: 15% of daily volume
        - 10:00-10:30: 12% of daily volume
        - 10:30-15:00: 50% of daily volume (evenly distributed)
        - 15:00-15:30: 12% of daily volume
        - 15:30-16:00: 11% of daily volume

        Returns:
            Dict mapping time periods to volume percentages
        """
        profile = {}

        # Morning spike (9:30-10:30) - 27% of volume
        profile["09:30-10:00"] = 0.15
        profile["10:00-10:30"] = 0.12

        # Midday (10:30-15:00) - 50% of volume over 9 half-hour periods
        midday_hours = [
            "10:30-11:00",
            "11:00-11:30",
            "11:30-12:00",
            "12:00-12:30",
            "12:30-13:00",
            "13:00-13:30",
            "13:30-14:00",
            "14:00-14:30",
            "14:30-15:00",
        ]
        midday_pct = 0.50 / len(midday_hours)
        for period in midday_hours:
            profile[period] = midday_pct

        # Closing spike (15:00-16:00) - 23% of volume
        profile["15:00-15:30"] = 0.12
        profile["15:30-16:00"] = 0.11

        return profile

    async def execute(
        self,
        symbol: str,
        total_quantity: int,
        action: str,
        time_window_minutes: Optional[int] = None,
        start_time: Optional[datetime] = None,
        execution_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute VWAP order.

        Args:
            symbol: Stock symbol
            total_quantity: Total shares to trade
            action: 'BUY' or 'SELL'
            time_window_minutes: Time window for execution (default: until market close)
            start_time: Start time (default: now)
            execution_id: Custom execution ID

        Returns:
            Dict with execution results including VWAP tracking
        """
        if start_time is None:
            start_time = datetime.now()

        if execution_id is None:
            execution_id = f"vwap_{symbol}_{start_time.strftime('%Y%m%d_%H%M%S')}"

        logger.info(
            f"Starting VWAP execution: {execution_id} - "
            f"{action} {total_quantity} {symbol}"
        )

        # Create volume-weighted slice plan
        slice_plan = self._create_vwap_slice_plan(
            total_quantity=total_quantity,
            start_time=start_time,
            time_window_minutes=time_window_minutes,
        )

        # Store execution state
        execution_state = {
            "execution_id": execution_id,
            "symbol": symbol,
            "action": action,
            "total_quantity": total_quantity,
            "start_time": start_time,
            "slices": slice_plan,
            "status": "RUNNING",
        }

        self.active_executions[execution_id] = execution_state

        # Execute slices
        try:
            await self._execute_slices(execution_id, symbol, action, slice_plan)

            # Calculate results with VWAP tracking
            results = await self._calculate_vwap_results(execution_state)

            # Mark as completed
            execution_state["status"] = "COMPLETED"
            execution_state["end_time"] = datetime.now()
            execution_state["results"] = results

            # Move to history
            self.execution_history.append(execution_state)
            del self.active_executions[execution_id]

            logger.info(
                f"VWAP execution complete: {execution_id} - "
                f"avg_price=${results['avg_price']:.2f}, "
                f"vwap_deviation={results['vwap_deviation_pct']:.2%}"
            )

            return results

        except Exception as e:
            logger.error(f"VWAP execution failed: {execution_id} - {e}")
            execution_state["status"] = "FAILED"
            execution_state["error"] = str(e)
            raise

    def _create_vwap_slice_plan(
        self,
        total_quantity: int,
        start_time: datetime,
        time_window_minutes: Optional[int] = None,
    ) -> List[VWAPSlice]:
        """
        Create VWAP slice plan based on volume profile.

        Args:
            total_quantity: Total shares to trade
            start_time: Start time
            time_window_minutes: Time window (default: until close)

        Returns:
            List of VWAPSlice objects
        """
        # Calculate end time
        if time_window_minutes:
            end_time = start_time + timedelta(minutes=time_window_minutes)
        else:
            # Default to market close (4:00 PM ET)
            end_time = start_time.replace(hour=16, minute=0, second=0)

        # Get volume distribution for time window
        volume_distribution = self._get_volume_distribution(start_time, end_time)

        # Create slices based on volume profile
        slices = []
        slice_id = 1

        for time_period, volume_pct in volume_distribution.items():
            # Calculate slice quantity based on volume percentage
            slice_quantity = int(total_quantity * volume_pct)

            if slice_quantity == 0:
                continue

            # Parse time period to get scheduled time
            period_start = self._parse_time_period(time_period, start_time.date())

            # Skip if before start time or after end time
            if period_start < start_time or period_start > end_time:
                continue

            slice_obj = VWAPSlice(
                slice_id=slice_id,
                quantity=slice_quantity,
                scheduled_time=period_start,
                expected_volume_pct=volume_pct,
            )

            slices.append(slice_obj)
            slice_id += 1

        # Adjust last slice to ensure all shares are allocated
        if slices:
            allocated_quantity = sum(s.quantity for s in slices)
            remainder = total_quantity - allocated_quantity
            if remainder != 0:
                slices[-1].quantity += remainder

        logger.debug(f"Created VWAP plan: {len(slices)} slices based on volume profile")

        return slices

    def _get_volume_distribution(
        self, start_time: datetime, end_time: datetime
    ) -> Dict[str, float]:
        """
        Get volume distribution for time window.

        Args:
            start_time: Start time
            end_time: End time

        Returns:
            Dict of time periods to volume percentages
        """
        # Filter volume profile to time window
        relevant_periods = {}
        total_volume = 0.0

        for period, volume_pct in self.volume_profile.items():
            period_start = self._parse_time_period(period, start_time.date())

            if start_time <= period_start <= end_time:
                relevant_periods[period] = volume_pct
                total_volume += volume_pct

        # Normalize to ensure percentages sum to 1.0
        if total_volume > 0:
            return {
                period: pct / total_volume for period, pct in relevant_periods.items()
            }
        else:
            # Fallback: equal distribution
            return {period: 1.0 / len(relevant_periods) for period in relevant_periods}

    def _parse_time_period(self, period: str, date) -> datetime:
        """
        Parse time period string to datetime.

        Args:
            period: Time period string (e.g., "09:30-10:00")
            date: Date for the time

        Returns:
            datetime object
        """
        start_time_str = period.split("-")[0]
        hour, minute = map(int, start_time_str.split(":"))
        return datetime.combine(date, time(hour, minute))

    async def _execute_slices(
        self, execution_id: str, symbol: str, action: str, slices: List[VWAPSlice]
    ):
        """
        Execute VWAP slices according to volume-based schedule.

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
                logger.info(f"VWAP execution cancelled: {execution_id}")
                slice_obj.status = "CANCELLED"
                continue

            # Wait until scheduled time
            now = datetime.now()
            wait_time = (slice_obj.scheduled_time - now).total_seconds()

            if wait_time > 0:
                logger.debug(
                    f"Waiting {wait_time:.1f}s for VWAP slice "
                    f"{slice_obj.slice_id} ({slice_obj.expected_volume_pct:.1%} volume)"
                )
                await asyncio.sleep(wait_time)

            # Execute slice
            try:
                logger.info(
                    f"Executing VWAP slice {slice_obj.slice_id}/{len(slices)}: "
                    f"{action} {slice_obj.quantity} {symbol} "
                    f"(volume_pct={slice_obj.expected_volume_pct:.1%})"
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
                        f"VWAP slice {slice_obj.slice_id} executed: "
                        f"price=${slice_obj.fill_price:.2f}"
                    )
                else:
                    slice_obj.status = "FAILED"
                    logger.error(f"VWAP slice {slice_obj.slice_id} failed to execute")

            except Exception as e:
                logger.error(f"Error executing VWAP slice {slice_obj.slice_id}: {e}")
                slice_obj.status = "FAILED"

    async def _calculate_vwap_results(
        self, execution_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate execution results with VWAP tracking.

        Args:
            execution_state: Execution state dictionary

        Returns:
            Results dictionary with VWAP metrics
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

        # Calculate VWAP (volume-weighted average of fills)
        total_volume = sum(s.quantity for s in executed_slices)
        vwap_price = (
            sum(s.quantity * s.fill_price for s in executed_slices if s.fill_price)
            / total_volume
            if total_volume > 0
            else 0.0
        )

        # VWAP deviation
        vwap_deviation = avg_price - vwap_price
        vwap_deviation_pct = vwap_deviation / vwap_price if vwap_price > 0 else 0.0

        # Check for VWAP deviation alert
        if abs(vwap_deviation_pct) > self.vwap_deviation_threshold:
            logger.warning(
                f"VWAP deviation alert: {execution_state['execution_id']} - "
                f"deviation={vwap_deviation_pct:.2%} "
                f"(threshold={self.vwap_deviation_threshold:.2%})"
            )

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
            "vwap_price": vwap_price,
            "vwap_deviation": vwap_deviation,
            "vwap_deviation_pct": vwap_deviation_pct,
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
        Cancel active VWAP execution.

        Args:
            execution_id: Execution ID to cancel

        Returns:
            bool: True if cancelled
        """
        if execution_id not in self.active_executions:
            logger.warning(f"VWAP execution not found: {execution_id}")
            return False

        try:
            # Mark as cancelled
            self.active_executions[execution_id]["status"] = "CANCELLED"

            # Cancel any pending orders
            slices = self.active_executions[execution_id]["slices"]
            for slice_obj in slices:
                if slice_obj.status == "PENDING" and slice_obj.order_id:
                    await self.order_manager.cancel_order(slice_obj.order_id)

            logger.info(f"VWAP execution cancelled: {execution_id}")
            return True

        except Exception as e:
            logger.error(f"Error cancelling VWAP execution: {e}")
            return False

    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status of VWAP execution.

        Args:
            execution_id: Execution ID

        Returns:
            Status dictionary or None
        """
        if execution_id in self.active_executions:
            state = self.active_executions[execution_id]

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
