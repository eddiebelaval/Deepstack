"""
Gamma Exposure (GEX) Calculator

Computes dealer gamma exposure from options chains to identify:
- Gamma regime (long vs short gamma)
- Key price levels (max gamma, put wall, call wall)
- GEX flip point (where dealer hedging flips direction)

GEX Formula:
  Call GEX per strike = gamma * open_interest * 100 * spot_price
  Put GEX per strike  = gamma * open_interest * 100 * spot_price * -1
  Positive total GEX = dealers long gamma (mean-reverting, low vol)
  Negative total GEX = dealers short gamma (trending, high vol)
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

from core.data.alpaca_options_client import OptionContract, OptionType

logger = logging.getLogger(__name__)


@dataclass
class GEXData:
    """GEX breakdown for a single strike price."""

    strike: float
    call_gex: float
    put_gex: float
    total_gex: float
    call_oi: int
    put_oi: int


@dataclass
class GEXLevels:
    """Key GEX-derived price levels."""

    max_gamma_strike: float  # Strike with highest absolute GEX
    put_wall: float  # Strike with most negative GEX
    call_wall: float  # Strike with most positive GEX


@dataclass
class TotalGEX:
    """Aggregate GEX summary with regime classification."""

    total_gex: float
    regime: str  # "long_gamma" or "short_gamma"
    flip_point: Optional[float]
    max_gamma_strike: float
    put_wall: float
    call_wall: float


class GEXCalculator:
    """
    Gamma Exposure calculator for DeepStack Trading System.

    Pure calculation engine — no network calls, no state.
    Takes option contract lists and spot price, returns GEX analysis.
    """

    @staticmethod
    def _is_valid_contract(contract: OptionContract) -> bool:
        """Check if a contract has valid gamma and OI for GEX calculation."""
        if contract.gamma is None or contract.gamma == 0:
            return False
        if contract.open_interest is None or contract.open_interest == 0:
            return False
        return True

    def calculate_gex_by_strike(
        self,
        contracts: List[OptionContract],
        spot_price: float,
    ) -> Dict[float, GEXData]:
        """
        Calculate GEX for each strike from an options chain.

        Groups contracts by strike, computes call/put GEX per strike,
        and returns a mapping of strike -> GEXData.

        Args:
            contracts: List of OptionContract with gamma and open_interest
            spot_price: Current underlying price

        Returns:
            Dict mapping strike price to GEXData
        """
        if not contracts or spot_price <= 0:
            return {}

        # Accumulate per-strike data
        strike_data: Dict[float, Dict] = {}

        for contract in contracts:
            if not self._is_valid_contract(contract):
                continue

            strike = contract.strike_price
            if strike not in strike_data:
                strike_data[strike] = {
                    "call_gex": 0.0,
                    "put_gex": 0.0,
                    "call_oi": 0,
                    "put_oi": 0,
                }

            gex = contract.gamma * contract.open_interest * 100 * spot_price

            if contract.option_type == OptionType.CALL:
                strike_data[strike]["call_gex"] += gex
                strike_data[strike]["call_oi"] += contract.open_interest
            elif contract.option_type == OptionType.PUT:
                strike_data[strike]["put_gex"] += gex * -1
                strike_data[strike]["put_oi"] += contract.open_interest

        result = {}
        for strike, data in sorted(strike_data.items()):
            result[strike] = GEXData(
                strike=strike,
                call_gex=data["call_gex"],
                put_gex=data["put_gex"],
                total_gex=data["call_gex"] + data["put_gex"],
                call_oi=data["call_oi"],
                put_oi=data["put_oi"],
            )

        logger.debug(f"Calculated GEX for {len(result)} strikes")
        return result

    def get_key_levels(self, gex_by_strike: Dict[float, GEXData]) -> GEXLevels:
        """
        Identify key GEX levels from per-strike data.

        Args:
            gex_by_strike: Output of calculate_gex_by_strike

        Returns:
            GEXLevels with max_gamma_strike, put_wall, call_wall

        Raises:
            ValueError: If gex_by_strike is empty
        """
        if not gex_by_strike:
            raise ValueError("No GEX data to derive levels from")

        max_gamma_strike = max(
            gex_by_strike.values(), key=lambda g: abs(g.total_gex)
        ).strike

        call_wall = max(
            gex_by_strike.values(), key=lambda g: g.total_gex
        ).strike

        put_wall = min(
            gex_by_strike.values(), key=lambda g: g.total_gex
        ).strike

        return GEXLevels(
            max_gamma_strike=max_gamma_strike,
            put_wall=put_wall,
            call_wall=call_wall,
        )

    def find_gex_flip_point(
        self, gex_by_strike: Dict[float, GEXData]
    ) -> Optional[float]:
        """
        Find the price where total GEX crosses zero.

        Interpolates between adjacent strikes where total_gex changes sign.
        If multiple zero-crossings exist, returns the one closest to the
        middle of the strike range.

        Args:
            gex_by_strike: Output of calculate_gex_by_strike

        Returns:
            Interpolated flip point price, or None if no sign change
        """
        if not gex_by_strike:
            return None

        sorted_strikes = sorted(gex_by_strike.keys())
        if len(sorted_strikes) < 2:
            return None

        crossings: List[float] = []

        for i in range(len(sorted_strikes) - 1):
            s1 = sorted_strikes[i]
            s2 = sorted_strikes[i + 1]
            gex1 = gex_by_strike[s1].total_gex
            gex2 = gex_by_strike[s2].total_gex

            # Check for sign change
            if gex1 * gex2 < 0:
                # Linear interpolation: find where the line crosses zero
                ratio = abs(gex1) / (abs(gex1) + abs(gex2))
                flip = s1 + ratio * (s2 - s1)
                crossings.append(flip)

        if not crossings:
            return None

        # Return crossing closest to mid-range
        mid = (sorted_strikes[0] + sorted_strikes[-1]) / 2
        return min(crossings, key=lambda x: abs(x - mid))

    def calculate_total_gex(
        self,
        contracts: List[OptionContract],
        spot_price: float,
    ) -> TotalGEX:
        """
        Calculate total GEX summary with regime and key levels.

        This is the main entry point — computes everything in one call.

        Args:
            contracts: List of OptionContract with gamma and open_interest
            spot_price: Current underlying price

        Returns:
            TotalGEX with aggregate GEX, regime, flip point, and levels
        """
        gex_by_strike = self.calculate_gex_by_strike(contracts, spot_price)

        if not gex_by_strike:
            return TotalGEX(
                total_gex=0.0,
                regime="short_gamma",
                flip_point=None,
                max_gamma_strike=0.0,
                put_wall=0.0,
                call_wall=0.0,
            )

        total = sum(g.total_gex for g in gex_by_strike.values())
        regime = "long_gamma" if total >= 0 else "short_gamma"
        flip_point = self.find_gex_flip_point(gex_by_strike)
        levels = self.get_key_levels(gex_by_strike)

        flip_str = f"{flip_point:.2f}" if flip_point is not None else "N/A"
        logger.info(
            f"GEX={total:,.0f} regime={regime} "
            f"flip={flip_str} "
            f"max_gamma={levels.max_gamma_strike} "
            f"put_wall={levels.put_wall} call_wall={levels.call_wall}"
        )

        return TotalGEX(
            total_gex=total,
            regime=regime,
            flip_point=flip_point,
            max_gamma_strike=levels.max_gamma_strike,
            put_wall=levels.put_wall,
            call_wall=levels.call_wall,
        )
