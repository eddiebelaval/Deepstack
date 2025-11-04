"""
Slippage Modeling - Estimate and track execution slippage

Provides realistic slippage estimation for order execution:
- Market impact based on order size
- Bid-ask spread capture
- Liquidity-based adjustment
- Historical slippage tracking
- Cost analysis and reporting

Key Concepts:
    Market Impact: Price movement caused by order execution
    Bid-Ask Spread: Cost of crossing the spread
    Slippage: Difference between expected and actual execution price

Example:
    >>> slippage = SlippageModel()
    >>> estimate = slippage.estimate_slippage(
    ...     symbol="AAPL",
    ...     quantity=1000,
    ...     action="BUY",
    ...     current_price=150.0,
    ...     avg_daily_volume=100_000_000
    ... )
    >>> print(f"Expected slippage: ${estimate['slippage_dollars']:.2f}")
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class SlippageEstimate:
    """Slippage estimation result."""

    symbol: str
    quantity: int
    action: str
    current_price: float
    estimated_fill_price: float
    slippage_dollars: float
    slippage_bps: float  # Basis points
    components: Dict[str, float]  # Breakdown by component
    timestamp: datetime


class SlippageModel:
    """
    Slippage estimation and tracking model.

    Uses multi-factor model:
    1. Market Impact: Size relative to liquidity
    2. Bid-Ask Spread: Typical spread cost
    3. Urgency Premium: Market vs limit order
    4. Volatility: Higher vol = higher slippage

    Tracks historical slippage for analysis and improvement.
    """

    def __init__(
        self,
        base_spread_bps: float = 5.0,
        impact_coefficient: float = 0.1,
        urgency_multiplier: float = 1.5,
    ):
        """
        Initialize slippage model.

        Args:
            base_spread_bps: Base bid-ask spread in basis points (default: 5)
            impact_coefficient: Market impact coefficient (default: 0.1)
            urgency_multiplier: Urgency multiplier for market orders (default: 1.5)
        """
        self.base_spread_bps = base_spread_bps
        self.impact_coefficient = impact_coefficient
        self.urgency_multiplier = urgency_multiplier

        self.historical_slippage: List[Dict[str, Any]] = []

        logger.info(
            f"Slippage Model initialized: base_spread={base_spread_bps}bps, "
            f"impact_coef={impact_coefficient}"
        )

    def estimate_slippage(
        self,
        symbol: str,
        quantity: int,
        action: str,
        current_price: float,
        avg_daily_volume: float,
        volatility: Optional[float] = None,
        order_type: str = "MARKET",
    ) -> SlippageEstimate:
        """
        Estimate execution slippage for an order.

        Args:
            symbol: Stock symbol
            quantity: Order quantity
            action: 'BUY' or 'SELL'
            current_price: Current market price
            avg_daily_volume: Average daily volume
            volatility: Annualized volatility (optional)
            order_type: Order type ('MARKET' or 'LIMIT')

        Returns:
            SlippageEstimate object
        """
        components = {}

        # 1. Bid-Ask Spread Cost (always present)
        spread_cost_bps = self._calculate_spread_cost(current_price, volatility)
        components["spread_cost_bps"] = spread_cost_bps

        # 2. Market Impact (based on order size vs liquidity)
        impact_bps = self._calculate_market_impact(
            quantity, current_price, avg_daily_volume
        )
        components["market_impact_bps"] = impact_bps

        # 3. Urgency Premium (market orders pay more)
        if order_type == "MARKET":
            urgency_bps = spread_cost_bps * (self.urgency_multiplier - 1.0)
            components["urgency_premium_bps"] = urgency_bps
        else:
            urgency_bps = 0.0
            components["urgency_premium_bps"] = 0.0

        # 4. Volatility Adjustment (higher vol = higher slippage)
        if volatility:
            vol_adjustment_bps = self._calculate_volatility_adjustment(
                volatility, spread_cost_bps
            )
            components["volatility_adjustment_bps"] = vol_adjustment_bps
        else:
            vol_adjustment_bps = 0.0
            components["volatility_adjustment_bps"] = 0.0

        # Total slippage in basis points
        total_slippage_bps = (
            spread_cost_bps + impact_bps + urgency_bps + vol_adjustment_bps
        )

        # Convert to dollars
        slippage_pct = total_slippage_bps / 10000
        slippage_dollars = current_price * slippage_pct * quantity

        # Adjust for action (BUY pays more, SELL receives less)
        if action == "BUY":
            estimated_fill_price = current_price * (1 + slippage_pct)
        else:  # SELL
            estimated_fill_price = current_price * (1 - slippage_pct)

        estimate = SlippageEstimate(
            symbol=symbol,
            quantity=quantity,
            action=action,
            current_price=current_price,
            estimated_fill_price=estimated_fill_price,
            slippage_dollars=slippage_dollars,
            slippage_bps=total_slippage_bps,
            components=components,
            timestamp=datetime.now(),
        )

        logger.debug(
            f"Slippage estimate for {action} {quantity} {symbol}: "
            f"{total_slippage_bps:.2f}bps (${slippage_dollars:.2f})"
        )

        return estimate

    def _calculate_spread_cost(
        self, current_price: float, volatility: Optional[float] = None
    ) -> float:
        """
        Calculate bid-ask spread cost in basis points.

        Args:
            current_price: Current price
            volatility: Annualized volatility (optional)

        Returns:
            Spread cost in basis points
        """
        # Base spread
        spread_bps = self.base_spread_bps

        # Adjust for volatility (higher vol = wider spreads)
        if volatility:
            vol_multiplier = 1.0 + (volatility * 2)  # Double spread at 50% vol
            spread_bps *= vol_multiplier

        return spread_bps

    def _calculate_market_impact(
        self, quantity: int, price: float, avg_daily_volume: float
    ) -> float:
        """
        Calculate market impact in basis points.

        Uses square root model: Impact ∝ sqrt(order_size / daily_volume)

        Args:
            quantity: Order quantity
            price: Current price
            avg_daily_volume: Average daily volume

        Returns:
            Market impact in basis points
        """
        if avg_daily_volume <= 0:
            logger.warning("Invalid daily volume, using default impact")
            return 10.0  # Default 10 bps

        # Calculate order as % of daily volume
        order_value = quantity * price
        daily_value = avg_daily_volume * price
        participation_rate = order_value / daily_value

        # Square root model
        impact_bps = self.impact_coefficient * (participation_rate**0.5) * 10000

        # Cap at 100 bps (1%)
        return min(impact_bps, 100.0)

    def _calculate_volatility_adjustment(
        self, volatility: float, base_spread_bps: float
    ) -> float:
        """
        Calculate volatility-based adjustment.

        Higher volatility = higher slippage due to uncertainty.

        Args:
            volatility: Annualized volatility (e.g., 0.30 for 30%)
            base_spread_bps: Base spread in bps

        Returns:
            Volatility adjustment in bps
        """
        # Add 10% to spread for every 10% of volatility
        vol_factor = volatility * 1.0
        return base_spread_bps * vol_factor

    def record_actual_slippage(
        self,
        symbol: str,
        quantity: int,
        action: str,
        expected_price: float,
        actual_price: float,
        order_type: str = "MARKET",
    ):
        """
        Record actual slippage for analysis.

        Args:
            symbol: Stock symbol
            quantity: Order quantity
            action: 'BUY' or 'SELL'
            expected_price: Expected execution price
            actual_price: Actual execution price
            order_type: Order type
        """
        slippage_dollars = abs(actual_price - expected_price) * quantity
        slippage_pct = (
            abs(actual_price - expected_price) / expected_price
            if expected_price > 0
            else 0.0
        )
        slippage_bps = slippage_pct * 10000

        record = {
            "timestamp": datetime.now(),
            "symbol": symbol,
            "quantity": quantity,
            "action": action,
            "order_type": order_type,
            "expected_price": expected_price,
            "actual_price": actual_price,
            "slippage_dollars": slippage_dollars,
            "slippage_bps": slippage_bps,
        }

        self.historical_slippage.append(record)

        logger.info(
            f"Slippage recorded: {symbol} {action} - "
            f"expected=${expected_price:.2f}, actual=${actual_price:.2f}, "
            f"slippage={slippage_bps:.2f}bps"
        )

    def get_slippage_statistics(
        self, symbol: Optional[str] = None, lookback_days: int = 30
    ) -> Dict[str, Any]:
        """
        Get slippage statistics.

        Args:
            symbol: Filter by symbol (optional)
            lookback_days: Lookback period in days

        Returns:
            Dict with slippage statistics
        """
        if not self.historical_slippage:
            return {
                "total_trades": 0,
                "avg_slippage_bps": 0.0,
                "median_slippage_bps": 0.0,
                "max_slippage_bps": 0.0,
                "total_slippage_cost": 0.0,
            }

        # Filter by symbol if specified
        if symbol:
            records = [r for r in self.historical_slippage if r["symbol"] == symbol]
        else:
            records = self.historical_slippage

        if not records:
            return {
                "total_trades": 0,
                "avg_slippage_bps": 0.0,
                "median_slippage_bps": 0.0,
                "max_slippage_bps": 0.0,
                "total_slippage_cost": 0.0,
            }

        # Calculate statistics
        slippage_bps_list = [r["slippage_bps"] for r in records]
        slippage_dollars_list = [r["slippage_dollars"] for r in records]

        avg_slippage_bps = sum(slippage_bps_list) / len(slippage_bps_list)
        median_slippage_bps = sorted(slippage_bps_list)[len(slippage_bps_list) // 2]
        max_slippage_bps = max(slippage_bps_list)
        total_slippage_cost = sum(slippage_dollars_list)

        # Breakdown by action
        buy_records = [r for r in records if r["action"] == "BUY"]
        sell_records = [r for r in records if r["action"] == "SELL"]

        return {
            "total_trades": len(records),
            "avg_slippage_bps": avg_slippage_bps,
            "median_slippage_bps": median_slippage_bps,
            "max_slippage_bps": max_slippage_bps,
            "total_slippage_cost": total_slippage_cost,
            "buy_trades": len(buy_records),
            "sell_trades": len(sell_records),
            "avg_buy_slippage_bps": (
                sum(r["slippage_bps"] for r in buy_records) / len(buy_records)
                if buy_records
                else 0.0
            ),
            "avg_sell_slippage_bps": (
                sum(r["slippage_bps"] for r in sell_records) / len(sell_records)
                if sell_records
                else 0.0
            ),
        }

    def get_slippage_report(self) -> Dict[str, Any]:
        """
        Get comprehensive slippage report.

        Returns:
            Dict with detailed slippage analysis
        """
        overall_stats = self.get_slippage_statistics()

        # Get per-symbol breakdown
        symbols = set(r["symbol"] for r in self.historical_slippage)
        symbol_stats = {}
        for symbol in symbols:
            symbol_stats[symbol] = self.get_slippage_statistics(symbol=symbol)

        return {
            "overall": overall_stats,
            "by_symbol": symbol_stats,
            "recent_slippage": self.historical_slippage[-10:],  # Last 10
        }

    def calculate_execution_quality(
        self,
        expected_slippage_bps: float,
        actual_slippage_bps: float,
    ) -> Dict[str, Any]:
        """
        Calculate execution quality score.

        Compares actual slippage to expected slippage.

        Args:
            expected_slippage_bps: Expected slippage
            actual_slippage_bps: Actual slippage

        Returns:
            Dict with quality metrics
        """
        deviation = actual_slippage_bps - expected_slippage_bps
        deviation_pct = (
            (deviation / expected_slippage_bps) if expected_slippage_bps > 0 else 0.0
        )

        # Quality score (0-100)
        # 100 = actual equals expected
        # > 100 = worse than expected
        # < 100 = better than expected
        if expected_slippage_bps > 0:
            quality_score = 100 * (actual_slippage_bps / expected_slippage_bps)
        else:
            quality_score = 100.0

        # Determine quality rating
        if quality_score < 90:
            rating = "EXCELLENT"
        elif quality_score < 110:
            rating = "GOOD"
        elif quality_score < 130:
            rating = "FAIR"
        else:
            rating = "POOR"

        return {
            "expected_slippage_bps": expected_slippage_bps,
            "actual_slippage_bps": actual_slippage_bps,
            "deviation_bps": deviation,
            "deviation_pct": deviation_pct,
            "quality_score": quality_score,
            "rating": rating,
        }

    def clear_history(self):
        """Clear historical slippage data."""
        self.historical_slippage.clear()
        logger.info("Slippage history cleared")
