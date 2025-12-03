"""
Hedged Position Framework

Implements the "Conviction" vs "Tactical" position splitting framework:
1. Total Position (5% max of portfolio)
2. Split:
    - Conviction (50-60%): Held for the moon (exit on thesis break/catalyst)
    - Tactical (40-50%): Scaled out at milestones (2x, 3x, etc.)

Tactical Scaling Table:
| Event/Milestone | Price Target | % to Sell | Running Total |
|-----------------|--------------|-----------|---------------|
| Early win       | 2x           | 25%       | 25%           |
| Momentum        | 3-4x         | 25%       | 50%           |
| Major catalyst  | 5-7x         | 25%       | 75%           |
| Moon            | 10x+         | 25%       | 100%          |
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class PositionType(Enum):
    CONVICTION = "CONVICTION"
    TACTICAL = "TACTICAL"


@dataclass
class HedgedPositionConfig:
    """Configuration for a hedged position"""

    symbol: str
    entry_price: float
    total_shares: int
    conviction_pct: float = 0.60  # 60% Conviction
    tactical_pct: float = 0.40  # 40% Tactical

    # Tactical Exit Targets (Multipliers of Entry Price)
    target_1_mult: float = 2.0
    target_2_mult: float = 3.5
    target_3_mult: float = 6.0
    target_4_mult: float = 10.0


@dataclass
class SubPosition:
    """A sub-position (either Conviction or Tactical)"""

    type: PositionType
    shares: int
    cost_basis: float
    current_value: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    shares_sold: int = 0


@dataclass
class HedgedPosition:
    """A complete hedged position containing both sub-positions"""

    symbol: str
    config: HedgedPositionConfig
    conviction_pos: SubPosition
    tactical_pos: SubPosition
    total_value: float = 0.0
    total_pnl: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "symbol": self.symbol,
            "total_shares": self.config.total_shares,
            "entry_price": self.config.entry_price,
            "current_value": self.total_value,
            "total_pnl": self.total_pnl,
            "conviction": {
                "shares": self.conviction_pos.shares,
                "value": self.conviction_pos.current_value,
                "pnl": self.conviction_pos.unrealized_pnl,
            },
            "tactical": {
                "shares": self.tactical_pos.shares,
                "value": self.tactical_pos.current_value,
                "pnl": self.tactical_pos.unrealized_pnl,
                "shares_sold": self.tactical_pos.shares_sold,
            },
            "next_target": self._get_next_target(),
        }

    def _get_next_target(self) -> Optional[float]:
        """Get the next price target for tactical scaling"""
        # Simple logic: return the next multiplier target
        # that hasn't been fully realized
        # In a real implementation, we'd track which targets have been hit
        return self.config.entry_price * self.config.target_1_mult


class HedgedPositionManager:
    """
    Manages the lifecycle of hedged positions.
    """

    def __init__(self):
        self.positions: Dict[str, HedgedPosition] = {}

    def create_position(self, config: HedgedPositionConfig) -> HedgedPosition:
        """
        Create a new hedged position split into Conviction and Tactical.
        """
        conviction_shares = int(config.total_shares * config.conviction_pct)
        tactical_shares = config.total_shares - conviction_shares

        conviction_pos = SubPosition(
            type=PositionType.CONVICTION,
            shares=conviction_shares,
            cost_basis=config.entry_price * conviction_shares,
        )

        tactical_pos = SubPosition(
            type=PositionType.TACTICAL,
            shares=tactical_shares,
            cost_basis=config.entry_price * tactical_shares,
        )

        # Initialize current values based on entry price
        conviction_pos.current_value = conviction_pos.cost_basis
        tactical_pos.current_value = tactical_pos.cost_basis

        position = HedgedPosition(
            symbol=config.symbol,
            config=config,
            conviction_pos=conviction_pos,
            tactical_pos=tactical_pos,
            total_value=conviction_pos.current_value + tactical_pos.current_value,
        )

        self.positions[config.symbol] = position
        return position

    def update_price(self, symbol: str, current_price: float) -> Optional[Dict]:
        """
        Update position with current price and check for tactical exits.

        Returns:
            Dict with action details if a tactical exit is triggered, else None
        """
        if symbol not in self.positions:
            return None

        pos = self.positions[symbol]

        # Update values
        pos.conviction_pos.current_value = pos.conviction_pos.shares * current_price
        pos.conviction_pos.unrealized_pnl = (
            pos.conviction_pos.current_value - pos.conviction_pos.cost_basis
        )

        pos.tactical_pos.current_value = pos.tactical_pos.shares * current_price
        pos.tactical_pos.unrealized_pnl = (
            pos.tactical_pos.current_value - pos.tactical_pos.cost_basis
        )

        pos.total_value = (
            pos.conviction_pos.current_value + pos.tactical_pos.current_value
        )
        pos.total_pnl = (
            pos.conviction_pos.unrealized_pnl
            + pos.tactical_pos.unrealized_pnl
            + pos.conviction_pos.realized_pnl
            + pos.tactical_pos.realized_pnl
        )

        # Check for Tactical Exits
        # This is a simplified check.
        # In production, we'd need state to know which targets were already hit.
        action = None

        # Example: Check Target 1 (2x)
        target_1 = pos.config.entry_price * pos.config.target_1_mult
        if current_price >= target_1 and pos.tactical_pos.shares > 0:
            # Check if we haven't sold for this target yet (simplified)
            # In real app, we'd track 'target_1_hit' flag
            pass

        return action

    def get_position(self, symbol: str) -> Optional[HedgedPosition]:
        return self.positions.get(symbol)
