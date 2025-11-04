"""
Kelly Criterion Position Sizer - Production-ready position sizing for DeepStack

Implements the Kelly Criterion formula for optimal position sizing with safety caps.
Designed for real-world trading with conservative fractional Kelly and strict limits.

Kelly Formula:
    Kelly % = (W × R - L) / R
    Where:
        W = Win rate (probability of winning)
        R = Win/Loss ratio (average win / average loss)
        L = Loss rate (1 - W)

Safety Features:
    - Fractional Kelly (default 0.5x for safety)
    - Max 25% per position cap
    - Max 100% total portfolio exposure
    - Min/max position size limits
    - Portfolio heat consideration
    - Comprehensive input validation
"""

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class KellyPositionSizer:
    """
    Production-ready Kelly Criterion position sizer.

    Calculates optimal position sizes using the Kelly Criterion formula
    with conservative safety caps and portfolio-wide risk management.

    Example:
        >>> sizer = KellyPositionSizer(
        ...     account_balance=100000,
        ...     max_position_pct=0.25,
        ...     max_total_exposure=1.0
        ... )
        >>> result = sizer.calculate_position_size(
        ...     win_rate=0.55,
        ...     avg_win=1500,
        ...     avg_loss=1000,
        ...     stock_price=100.0
        ... )
        >>> print(f"Position size: ${result['position_size']:.2f}")
    """

    def __init__(
        self,
        account_balance: float,
        max_position_pct: float = 0.25,
        max_total_exposure: float = 1.0,
        min_position_size: float = 100.0,
        max_position_size: float = 50000.0,
        current_positions: Optional[Dict[str, float]] = None,
    ):
        """
        Initialize Kelly position sizer.

        Args:
            account_balance: Total account balance in dollars
            max_position_pct: Maximum % of portfolio per position (default 0.25 = 25%)
            max_total_exposure: Maximum total portfolio exposure (default 1.0 = 100%)
            min_position_size: Minimum position size in dollars (default $100)
            max_position_size: Maximum position size in dollars (default $50k)
            current_positions: Dict of {symbol: position_value} for existing positions

        Raises:
            ValueError: If inputs are invalid
        """
        # Validate account balance
        if account_balance <= 0:
            raise ValueError(f"Account balance must be positive, got {account_balance}")

        # Validate max position percentage
        if not 0 < max_position_pct <= 1.0:
            raise ValueError(
                f"max_position_pct must be between 0 and 1, got {max_position_pct}"
            )

        # Validate max total exposure
        if not 0 < max_total_exposure <= 1.0:
            raise ValueError(
                f"max_total_exposure must be between 0 and 1, got {max_total_exposure}"
            )

        # Validate min/max position sizes
        if min_position_size < 0:
            raise ValueError(
                f"min_position_size must be non-negative, got {min_position_size}"
            )

        if max_position_size < min_position_size:
            raise ValueError(
                f"max_position_size ({max_position_size}) must be >= min_position_size ({min_position_size})"
            )

        self.account_balance = account_balance
        self.max_position_pct = max_position_pct
        self.max_total_exposure = max_total_exposure
        self.min_position_size = min_position_size
        self.max_position_size = max_position_size
        self.current_positions = current_positions or {}

        logger.info(
            f"KellyPositionSizer initialized: balance=${account_balance:,.2f}, "
            f"max_position={max_position_pct:.1%}, max_exposure={max_total_exposure:.1%}"
        )

    def calculate_position_size(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        kelly_fraction: float = 0.5,
        stock_price: Optional[float] = None,
        symbol: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculate optimal position size using Kelly Criterion.

        Args:
            win_rate: Historical win rate (0-1), e.g., 0.55 = 55% win rate
            avg_win: Average win amount in dollars
            avg_loss: Average loss amount in dollars (positive number)
            kelly_fraction: Fraction of Kelly to use (default 0.5 for safety)
            stock_price: Current stock price (optional, for share calculation)
            symbol: Stock symbol (optional, for existing position check)

        Returns:
            Dict with position sizing details:
                {
                    "position_size": float,      # Dollar amount to invest
                    "shares": int or None,       # Number of shares (if price provided)
                    "kelly_pct": float,          # Raw Kelly percentage (before caps)
                    "adjusted_pct": float,       # Final position % (after all caps)
                    "win_loss_ratio": float,     # Calculated W/L ratio
                    "fractional_kelly": float,   # Kelly fraction applied
                    "rationale": str,            # Explanation of sizing decision
                    "warnings": list,            # Any warnings about the position
                    "portfolio_heat": float,     # Current portfolio exposure %
                }

        Raises:
            ValueError: If inputs are invalid
        """
        # Validate inputs
        validation_result = self.validate_inputs(
            win_rate, avg_win, avg_loss, kelly_fraction
        )
        if not validation_result["valid"]:
            return {
                "position_size": 0.0,
                "shares": 0,
                "kelly_pct": 0.0,
                "adjusted_pct": 0.0,
                "win_loss_ratio": 0.0,
                "fractional_kelly": kelly_fraction,
                "rationale": validation_result["reason"],
                "warnings": [validation_result["reason"]],
                "portfolio_heat": self.get_portfolio_heat(),
            }

        # Calculate win/loss ratio (R in Kelly formula)
        win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else 0.0

        # Calculate raw Kelly percentage
        # Kelly % = (W × R - L) / R
        # Where: W = win_rate, R = win_loss_ratio, L = loss_rate (1 - W)
        loss_rate = 1 - win_rate
        kelly_pct = (win_rate * win_loss_ratio - loss_rate) / win_loss_ratio

        # Ensure Kelly is non-negative (no position if negative edge)
        if kelly_pct <= 0:
            return {
                "position_size": 0.0,
                "shares": 0,
                "kelly_pct": kelly_pct,
                "adjusted_pct": 0.0,
                "win_loss_ratio": win_loss_ratio,
                "fractional_kelly": kelly_fraction,
                "rationale": f"Negative edge detected (Kelly={kelly_pct:.2%}). No position recommended.",
                "warnings": [
                    "Negative expected value - win rate too low or W/L ratio unfavorable"
                ],
                "portfolio_heat": self.get_portfolio_heat(),
            }

        # Apply fractional Kelly for safety
        fractional_kelly_pct = kelly_pct * kelly_fraction

        # Apply position caps and get final adjusted percentage
        cap_result = self.apply_position_caps(fractional_kelly_pct, symbol=symbol)

        adjusted_pct = cap_result["adjusted_pct"]
        position_size = self.account_balance * adjusted_pct

        # Apply absolute dollar limits
        if position_size < self.min_position_size:
            position_size = 0.0
            adjusted_pct = 0.0
            # If position was already 0 due to portfolio caps, keep that rationale
            if cap_result["adjusted_pct"] == 0.0:
                warnings = cap_result["warnings"]
                rationale = cap_result["rationale"]
            else:
                warnings = [
                    f"Position size below minimum ${self.min_position_size:.2f}"
                ]
                rationale = "Position too small to trade"
        elif position_size > self.max_position_size:
            position_size = self.max_position_size
            adjusted_pct = position_size / self.account_balance
            warnings = [
                f"Position capped at absolute max ${self.max_position_size:,.2f}"
            ]
            rationale = (
                cap_result["rationale"] + f" (Hard cap: ${self.max_position_size:,.2f})"
            )
        else:
            warnings = cap_result["warnings"]
            rationale = cap_result["rationale"]

        # Calculate number of shares if price provided
        shares = None
        if stock_price is not None and stock_price > 0 and position_size > 0:
            shares = int(position_size / stock_price)
            # Recalculate actual position size based on whole shares
            actual_position_size = shares * stock_price
            position_size = actual_position_size
            adjusted_pct = position_size / self.account_balance

        return {
            "position_size": position_size,
            "shares": shares,
            "kelly_pct": kelly_pct,
            "adjusted_pct": adjusted_pct,
            "win_loss_ratio": win_loss_ratio,
            "fractional_kelly": kelly_fraction,
            "rationale": rationale,
            "warnings": warnings,
            "portfolio_heat": self.get_portfolio_heat(),
        }

    def validate_inputs(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        kelly_fraction: float,
    ) -> Dict[str, Any]:
        """
        Validate all inputs for position sizing calculation.

        Args:
            win_rate: Win rate to validate (must be 0-1)
            avg_win: Average win to validate (must be > 0)
            avg_loss: Average loss to validate (must be > 0)
            kelly_fraction: Kelly fraction to validate (must be 0-1)

        Returns:
            Dict with validation result:
                {"valid": bool, "reason": str}
        """
        # Validate win rate
        if not 0 <= win_rate <= 1:
            return {
                "valid": False,
                "reason": f"Win rate must be between 0 and 1, got {win_rate}",
            }

        # Validate average win
        if avg_win <= 0:
            return {
                "valid": False,
                "reason": f"Average win must be positive, got {avg_win}",
            }

        # Validate average loss
        if avg_loss <= 0:
            return {
                "valid": False,
                "reason": f"Average loss must be positive, got {avg_loss}",
            }

        # Validate Kelly fraction
        if not 0 <= kelly_fraction <= 1:
            return {
                "valid": False,
                "reason": f"Kelly fraction must be between 0 and 1, got {kelly_fraction}",
            }

        # Check for extreme win rates (likely data issues)
        if win_rate < 0.1 or win_rate > 0.9:
            return {
                "valid": True,  # Still valid, but warn
                "reason": f"Warning: Extreme win rate {win_rate:.1%} detected",
            }

        return {"valid": True, "reason": "All inputs valid"}

    def apply_position_caps(
        self,
        kelly_pct: float,
        symbol: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Apply position size caps and portfolio heat limits.

        Enforces:
        1. Maximum position % cap (default 25%)
        2. Portfolio heat limit (existing positions)
        3. Maximum total exposure cap (default 100%)

        Args:
            kelly_pct: Calculated Kelly percentage (after fractional adjustment)
            symbol: Stock symbol (to check existing position)

        Returns:
            Dict with capping details:
                {
                    "adjusted_pct": float,    # Final position %
                    "rationale": str,         # Why this adjustment
                    "warnings": list,         # Cap warnings
                    "caps_applied": list,     # Which caps were hit
                }
        """
        warnings = []
        caps_applied = []
        original_pct = kelly_pct

        # Cap 1: Maximum position percentage
        if kelly_pct > self.max_position_pct:
            kelly_pct = self.max_position_pct
            caps_applied.append("max_position_pct")
            warnings.append(
                f"Position capped at {self.max_position_pct:.1%} (max per position)"
            )

        # Cap 2: Check portfolio heat (existing positions)
        current_heat = self.get_portfolio_heat()
        remaining_capacity = self.max_total_exposure - current_heat

        # Adjust for existing position in same symbol
        if symbol and symbol in self.current_positions:
            # We're adding to existing position, so remove it from current heat
            existing_position_pct = (
                self.current_positions[symbol] / self.account_balance
            )
            remaining_capacity += existing_position_pct
            warnings.append(
                f"Existing {symbol} position: {existing_position_pct:.1%} will be replaced/adjusted"
            )

        # Cap 3: Portfolio heat limit
        if kelly_pct > remaining_capacity:
            if remaining_capacity <= 0:
                kelly_pct = 0.0
                caps_applied.append("portfolio_full")
                warnings.append(
                    f"Portfolio at capacity ({current_heat:.1%} of {self.max_total_exposure:.1%})"
                )
            else:
                kelly_pct = remaining_capacity
                caps_applied.append("portfolio_heat")
                warnings.append(
                    f"Position reduced to fit portfolio capacity (remaining: {remaining_capacity:.1%})"
                )

        # Build rationale
        if not caps_applied:
            rationale = f"Kelly position: {kelly_pct:.2%} of portfolio"
        else:
            rationale = (
                f"Original Kelly: {original_pct:.2%}, "
                f"adjusted to {kelly_pct:.2%} "
                f"(caps: {', '.join(caps_applied)})"
            )

        return {
            "adjusted_pct": kelly_pct,
            "rationale": rationale,
            "warnings": warnings,
            "caps_applied": caps_applied,
        }

    def get_portfolio_heat(self) -> float:
        """
        Calculate current portfolio heat (total exposure).

        Sums all existing position values as percentage of account balance.

        Returns:
            float: Current portfolio heat (0-1 scale)
        """
        if not self.current_positions:
            return 0.0

        total_position_value = sum(self.current_positions.values())
        return total_position_value / self.account_balance

    def calculate_fractional_kelly(
        self,
        kelly_pct: float,
        kelly_fraction: float = 0.5,
    ) -> float:
        """
        Calculate fractional Kelly (for conservative sizing).

        Full Kelly can be aggressive and lead to high volatility.
        Fractional Kelly (e.g., 0.5x or 0.25x) provides more stability
        with only slightly lower long-term returns.

        Args:
            kelly_pct: Raw Kelly percentage
            kelly_fraction: Fraction to apply (0.25 = quarter Kelly, 0.5 = half Kelly)

        Returns:
            float: Fractional Kelly percentage
        """
        return kelly_pct * kelly_fraction

    def update_positions(self, positions: Dict[str, float]):
        """
        Update current positions for portfolio heat calculation.

        Args:
            positions: Dict of {symbol: position_value}
        """
        self.current_positions = positions
        logger.info(
            f"Updated positions: {len(positions)} holdings, "
            f"total heat: {self.get_portfolio_heat():.1%}"
        )

    def update_account_balance(self, new_balance: float):
        """
        Update account balance.

        Args:
            new_balance: New account balance

        Raises:
            ValueError: If new balance is invalid
        """
        if new_balance <= 0:
            raise ValueError(f"Account balance must be positive, got {new_balance}")

        old_balance = self.account_balance
        self.account_balance = new_balance
        logger.info(
            f"Account balance updated: ${old_balance:,.2f} -> ${new_balance:,.2f} "
            f"({((new_balance - old_balance) / old_balance):.2%} change)"
        )

    def get_max_position_value(self) -> float:
        """
        Get maximum position value in dollars.

        Returns:
            float: Maximum position value based on % cap and absolute cap
        """
        pct_based_max = self.account_balance * self.max_position_pct
        return min(pct_based_max, self.max_position_size)

    def get_position_info(self) -> Dict[str, Any]:
        """
        Get current sizer configuration and portfolio state.

        Returns:
            Dict with sizer info:
                {
                    "account_balance": float,
                    "max_position_pct": float,
                    "max_position_value": float,
                    "max_total_exposure": float,
                    "current_heat": float,
                    "remaining_capacity": float,
                    "num_positions": int,
                    "position_symbols": list,
                }
        """
        current_heat = self.get_portfolio_heat()
        return {
            "account_balance": self.account_balance,
            "max_position_pct": self.max_position_pct,
            "max_position_value": self.get_max_position_value(),
            "max_total_exposure": self.max_total_exposure,
            "current_heat": current_heat,
            "remaining_capacity": max(0.0, self.max_total_exposure - current_heat),
            "num_positions": len(self.current_positions),
            "position_symbols": list(self.current_positions.keys()),
        }
