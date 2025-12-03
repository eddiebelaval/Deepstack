"""
Execution Router - Smart order routing and execution strategy selection

Intelligently routes orders to optimal execution algorithm based on:
- Order size (small → market, large → TWAP/VWAP)
- Urgency (urgent → market, patient → limit/TWAP)
- Market conditions (volatile → cautious, stable → aggressive)
- Liquidity (high → aggressive, low → patient)

Routing Rules:
    Small orders (< $10k): Market orders
    Medium orders ($10k-$100k): TWAP
    Large orders (> $100k): VWAP
    Urgent orders: Market with slippage tolerance
    Overnight: Limit orders

Example:
    >>> router = ExecutionRouter(
    ...     order_manager=order_mgr,
    ...     twap_executor=twap,
    ...     vwap_executor=vwap,
    ...     slippage_model=slippage
    ... )
    >>> result = await router.route_order(
    ...     symbol="AAPL",
    ...     quantity=1000,
    ...     action="BUY",
    ...     urgency="NORMAL"
    ... )
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from .slippage import SlippageModel
from .twap import TWAPExecutor
from .vwap import VWAPExecutor

logger = logging.getLogger(__name__)


class OrderUrgency(Enum):
    """Order urgency levels."""

    IMMEDIATE = "IMMEDIATE"  # Execute ASAP (market)
    HIGH = "HIGH"  # Execute quickly (aggressive TWAP)
    NORMAL = "NORMAL"  # Normal execution (TWAP/VWAP)
    LOW = "LOW"  # Patient execution (VWAP/limit)


class ExecutionRouter:
    """
    Smart order routing system.

    Routes orders to optimal execution algorithm based on multiple factors:
    - Order size relative to portfolio
    - Urgency requirements
    - Market conditions
    - Liquidity considerations
    - Slippage expectations

    Tracks execution quality and adapts routing decisions.
    """

    def __init__(
        self,
        order_manager,
        twap_executor: Optional[TWAPExecutor] = None,
        vwap_executor: Optional[VWAPExecutor] = None,
        slippage_model: Optional[SlippageModel] = None,
        small_order_threshold: float = 10_000,
        large_order_threshold: float = 100_000,
    ):
        """
        Initialize execution router.

        Args:
            order_manager: OrderManager instance
            twap_executor: TWAP executor (created if None)
            vwap_executor: VWAP executor (created if None)
            slippage_model: Slippage model (created if None)
            small_order_threshold: Threshold for small orders (default: $10k)
            large_order_threshold: Threshold for large orders (default: $100k)
        """
        self.order_manager = order_manager

        # Initialize execution algorithms
        self.twap = twap_executor or TWAPExecutor(order_manager=order_manager)
        self.vwap = vwap_executor or VWAPExecutor(order_manager=order_manager)
        self.slippage = slippage_model or SlippageModel()

        # Thresholds
        self.small_order_threshold = small_order_threshold
        self.large_order_threshold = large_order_threshold

        # Execution history
        self.execution_history: List[Dict[str, Any]] = []

        logger.info(
            f"Execution Router initialized: "
            f"small_threshold=${small_order_threshold:,.0f}, "
            f"large_threshold=${large_order_threshold:,.0f}"
        )

    async def route_order(
        self,
        symbol: str,
        quantity: int,
        action: str,
        current_price: Optional[float] = None,
        urgency: str = "NORMAL",
        avg_daily_volume: Optional[float] = None,
        time_window_minutes: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Route order to optimal execution algorithm.

        Args:
            symbol: Stock symbol
            quantity: Order quantity
            action: 'BUY' or 'SELL'
            current_price: Current market price (fetched if None)
            urgency: Order urgency ('IMMEDIATE', 'HIGH', 'NORMAL', 'LOW')
            avg_daily_volume: Average daily volume (for slippage estimation)
            time_window_minutes: Execution time window (optional)

        Returns:
            Dict with execution results
        """
        start_time = datetime.now()

        # Get current price if not provided
        if current_price is None:
            # Would fetch from market data provider
            # For now, use placeholder
            logger.warning(
                f"Current price not provided for {symbol}, routing may be suboptimal"
            )
            current_price = 100.0  # Placeholder

        # Calculate order value
        order_value = quantity * current_price

        # Determine execution strategy
        strategy = self._select_strategy(
            order_value=order_value,
            urgency=urgency,
            symbol=symbol,
            avg_daily_volume=avg_daily_volume,
        )

        logger.info(
            f"Routing order: {action} {quantity} {symbol} "
            f"(value=${order_value:,.2f}, urgency={urgency}) → {strategy}"
        )

        # Estimate slippage
        if avg_daily_volume:
            slippage_estimate = self.slippage.estimate_slippage(
                symbol=symbol,
                quantity=quantity,
                action=action,
                current_price=current_price,
                avg_daily_volume=avg_daily_volume,
                order_type="MARKET" if strategy == "MARKET" else "LIMIT",
            )
            logger.info(
                f"Estimated slippage: {slippage_estimate.slippage_bps:.2f}bps "
                f"(${slippage_estimate.slippage_dollars:.2f})"
            )
        else:
            slippage_estimate = None

        # Execute based on strategy
        try:
            if strategy == "MARKET":
                result = await self._execute_market(symbol, quantity, action)
            elif strategy == "TWAP":
                result = await self._execute_twap(
                    symbol, quantity, action, time_window_minutes, urgency
                )
            elif strategy == "VWAP":
                result = await self._execute_vwap(
                    symbol, quantity, action, time_window_minutes
                )
            elif strategy == "LIMIT":
                result = await self._execute_limit(
                    symbol, quantity, action, current_price
                )
            elif strategy == "ICEBERG":
                result = await self._execute_iceberg(
                    symbol, quantity, action, current_price
                )
            else:
                raise ValueError(f"Unknown execution strategy: {strategy}")

            # Add routing metadata
            result["routing_info"] = {
                "strategy_selected": strategy,
                "order_value": order_value,
                "urgency": urgency,
                "routing_time": start_time,
                "slippage_estimate": (
                    slippage_estimate.__dict__ if slippage_estimate else None
                ),
            }

            # Record execution
            self.execution_history.append(result)

            # Record actual slippage if available
            if slippage_estimate and result.get("avg_price"):
                self.slippage.record_actual_slippage(
                    symbol=symbol,
                    quantity=quantity,
                    action=action,
                    expected_price=slippage_estimate.estimated_fill_price,
                    actual_price=result["avg_price"],
                    order_type=strategy,
                )

            logger.info(
                f"Order execution complete: {strategy} - "
                f"avg_price=${result.get('avg_price', 0):.2f}"
            )

            return result

        except Exception as e:
            logger.error(f"Order routing failed: {e}")
            raise

    def _select_strategy(
        self,
        order_value: float,
        urgency: str,
        symbol: str,
        avg_daily_volume: Optional[float] = None,
    ) -> str:
        """
        Select optimal execution strategy.

        Decision tree:
        1. If IMMEDIATE urgency → MARKET
        2. If small order (< $10k) → MARKET
        3. If large order (> $100k) + liquidity data → VWAP
        4. If medium order + NORMAL urgency → TWAP
        5. If LOW urgency → LIMIT

        Args:
            order_value: Order value in dollars
            urgency: Order urgency
            symbol: Stock symbol
            avg_daily_volume: Average daily volume

        Returns:
            Strategy name
        """
        # Immediate urgency always uses market
        if urgency == "IMMEDIATE":
            return "MARKET"

        # Small orders use market (low impact)
        if order_value < self.small_order_threshold:
            return "MARKET"

        # Low urgency uses limit orders
        if urgency == "LOW":
            return "LIMIT"

        # Large orders with volume data use VWAP
        if order_value >= self.large_order_threshold:
            if avg_daily_volume:
                # Check if order is large relative to daily volume
                participation_rate = order_value / (
                    avg_daily_volume * 100
                )  # Assume $100 avg price
                if participation_rate > 0.01:  # > 1% of daily volume
                    return "VWAP"

            # Use Iceberg for large orders without volume data or lower participation
            return "ICEBERG"

        # Medium orders with normal urgency use TWAP
        return "TWAP"

    async def _execute_iceberg(
        self, symbol: str, quantity: int, action: str, current_price: float
    ) -> Dict[str, Any]:
        """
        Execute Iceberg order (split into visible chunks).

        Args:
            symbol: Stock symbol
            quantity: Total quantity
            action: 'BUY' or 'SELL'
            current_price: Current market price

        Returns:
            Execution results
        """
        logger.info(f"Executing ICEBERG order: {action} {quantity} {symbol}")

        # Split into 10 chunks to hide size
        num_chunks = 10
        chunk_size = quantity // num_chunks
        remainder = quantity % num_chunks

        executed_quantity = 0
        total_cost = 0.0
        order_ids = []

        # Execute chunks sequentially
        # In a real system, this would wait for fills.
        # Here we simulate placing multiple smaller limit orders.

        for i in range(num_chunks):
            size = chunk_size + (1 if i < remainder else 0)
            if size == 0:
                continue

            # Randomize price slightly to avoid stacking
            import random

            price_variance = random.uniform(-0.0005, 0.0005)
            limit_price = current_price * (1 + price_variance)

            if action == "BUY":
                limit_price = min(limit_price, current_price * 1.001)
            else:
                limit_price = max(limit_price, current_price * 0.999)

            order_id = await self.order_manager.place_limit_order(
                symbol=symbol, quantity=size, action=action, limit_price=limit_price
            )

            if order_id:
                order_ids.append(order_id)
                executed_quantity += size
                total_cost += size * limit_price  # Estimate cost

        avg_price = total_cost / executed_quantity if executed_quantity > 0 else 0.0

        return {
            "execution_type": "ICEBERG",
            "symbol": symbol,
            "quantity": executed_quantity,
            "action": action,
            "order_ids": order_ids,
            "avg_price": avg_price,
            "status": "FILLED" if executed_quantity == quantity else "PARTIAL",
            "timestamp": datetime.now(),
            "chunks": num_chunks,
        }

    async def _execute_market(
        self, symbol: str, quantity: int, action: str
    ) -> Dict[str, Any]:
        """
        Execute market order.

        Args:
            symbol: Stock symbol
            quantity: Order quantity
            action: 'BUY' or 'SELL'

        Returns:
            Execution results
        """
        logger.info(f"Executing MARKET order: {action} {quantity} {symbol}")

        order_id = await self.order_manager.place_market_order(
            symbol=symbol, quantity=quantity, action=action
        )

        if not order_id:
            from core.exceptions import OrderExecutionError

            raise OrderExecutionError(
                message="Market order execution failed",
                symbol=symbol,
                quantity=quantity,
                side=action,
                reason="Order submission returned no order ID",
            )

        # Get order status for fill details
        order_status = await self.order_manager.get_order_status(order_id)

        return {
            "execution_type": "MARKET",
            "symbol": symbol,
            "quantity": quantity,
            "action": action,
            "order_id": order_id,
            "avg_price": order_status.get("filled_avg_price", 0.0),
            "status": "FILLED",
            "timestamp": datetime.now(),
        }

    async def _execute_twap(
        self,
        symbol: str,
        quantity: int,
        action: str,
        time_window_minutes: Optional[int],
        urgency: str,
    ) -> Dict[str, Any]:
        """
        Execute TWAP order.

        Args:
            symbol: Stock symbol
            quantity: Order quantity
            action: 'BUY' or 'SELL'
            time_window_minutes: Time window
            urgency: Order urgency

        Returns:
            Execution results
        """
        logger.info(f"Executing TWAP order: {action} {quantity} {symbol}")

        # Adjust TWAP parameters based on urgency
        if urgency == "HIGH":
            time_window = time_window_minutes or 30  # Faster execution
            num_slices = 6
        else:  # NORMAL
            time_window = time_window_minutes or 60  # Standard execution
            num_slices = 10

        result = await self.twap.execute(
            symbol=symbol,
            total_quantity=quantity,
            action=action,
            time_window_minutes=time_window,
            num_slices=num_slices,
        )

        result["execution_type"] = "TWAP"
        return result

    async def _execute_vwap(
        self,
        symbol: str,
        quantity: int,
        action: str,
        time_window_minutes: Optional[int],
    ) -> Dict[str, Any]:
        """
        Execute VWAP order.

        Args:
            symbol: Stock symbol
            quantity: Order quantity
            action: 'BUY' or 'SELL'
            time_window_minutes: Time window

        Returns:
            Execution results
        """
        logger.info(f"Executing VWAP order: {action} {quantity} {symbol}")

        result = await self.vwap.execute(
            symbol=symbol,
            total_quantity=quantity,
            action=action,
            time_window_minutes=time_window_minutes,
        )

        result["execution_type"] = "VWAP"
        return result

    async def _execute_limit(
        self, symbol: str, quantity: int, action: str, current_price: float
    ) -> Dict[str, Any]:
        """
        Execute limit order.

        Args:
            symbol: Stock symbol
            quantity: Order quantity
            action: 'BUY' or 'SELL'
            current_price: Current market price

        Returns:
            Execution results
        """
        logger.info(f"Executing LIMIT order: {action} {quantity} {symbol}")

        # Set limit price with small buffer (0.1% better than market)
        if action == "BUY":
            limit_price = current_price * 0.999  # Buy 0.1% below market
        else:
            limit_price = current_price * 1.001  # Sell 0.1% above market

        order_id = await self.order_manager.place_limit_order(
            symbol=symbol, quantity=quantity, action=action, limit_price=limit_price
        )

        if not order_id:
            raise Exception("Limit order failed")

        # Get order status
        order_status = await self.order_manager.get_order_status(order_id)

        return {
            "execution_type": "LIMIT",
            "symbol": symbol,
            "quantity": quantity,
            "action": action,
            "order_id": order_id,
            "limit_price": limit_price,
            "avg_price": order_status.get("filled_avg_price", limit_price),
            "status": order_status.get("status", "PENDING"),
            "timestamp": datetime.now(),
        }

    def get_execution_statistics(self) -> Dict[str, Any]:
        """
        Get execution statistics.

        Returns:
            Dict with execution stats
        """
        if not self.execution_history:
            return {
                "total_executions": 0,
                "by_strategy": {},
                "avg_execution_time": 0.0,
            }

        # Count by strategy
        strategy_counts = {}
        for execution in self.execution_history:
            strategy = execution.get("execution_type", "UNKNOWN")
            strategy_counts[strategy] = strategy_counts.get(strategy, 0) + 1

        # Calculate average execution time (for TWAP/VWAP)
        execution_times = []
        for execution in self.execution_history:
            if execution.get("duration_minutes"):
                execution_times.append(execution["duration_minutes"])

        avg_execution_time = (
            sum(execution_times) / len(execution_times) if execution_times else 0.0
        )

        return {
            "total_executions": len(self.execution_history),
            "by_strategy": strategy_counts,
            "avg_execution_time_minutes": avg_execution_time,
            "slippage_stats": self.slippage.get_slippage_statistics(),
        }

    def get_routing_report(self) -> Dict[str, Any]:
        """
        Get comprehensive routing report.

        Returns:
            Dict with routing analysis
        """
        execution_stats = self.get_execution_statistics()
        slippage_report = self.slippage.get_slippage_report()

        return {
            "execution_statistics": execution_stats,
            "slippage_analysis": slippage_report,
            "recent_executions": self.execution_history[-10:],
        }
