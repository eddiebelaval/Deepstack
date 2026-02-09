"""
Unusual Options Flow Detection

Identifies anomalous options activity that may signal institutional positioning:
- Volume spikes relative to open interest
- Large premium trades ($100k+)
- OTM sweeps (aggressive buying near the ask)
- Put/call volume imbalances

These signals serve as a dark-pool-adjacent view into smart money movement.
"""

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from core.data.alpaca_options_client import Moneyness, OptionContract, OptionType

logger = logging.getLogger(__name__)


@dataclass
class FlowAlert:
    """Single unusual flow detection event."""

    symbol: str
    alert_type: str  # volume_spike | large_premium | otm_sweep | pc_imbalance
    option_type: str  # call | put
    strike: float
    expiry: str  # ISO date string
    volume: int
    open_interest: int
    volume_oi_ratio: float
    estimated_premium: float
    confidence: int  # 0-100
    detected_at: datetime = field(default_factory=datetime.now)


@dataclass
class FlowSummary:
    """Aggregated flow analysis for a set of option contracts."""

    total_call_volume: int
    total_put_volume: int
    put_call_ratio: float
    net_premium: float
    top_alerts: List[FlowAlert]
    bullish_score: int  # 0-100
    bearish_score: int  # 0-100


class FlowDetector:
    """
    Unusual options flow detector for DeepStack Trading System.

    Scans option contract lists for anomalous activity patterns
    that may indicate institutional or informed trader positioning.

    All thresholds are configurable via __init__ to allow tuning
    as the system learns from real market data.
    """

    def __init__(
        self,
        volume_oi_threshold: float = 5.0,
        large_premium_threshold: float = 100_000.0,
        sweep_volume_multiplier: float = 10.0,
        sweep_ask_proximity: float = 0.10,
        pc_imbalance_threshold: float = 3.0,
        min_volume: int = 10,
        min_open_interest: int = 1,
    ):
        """
        Initialize flow detector with configurable thresholds.

        Args:
            volume_oi_threshold: Volume/OI ratio to trigger volume spike (default 5x)
            large_premium_threshold: Dollar premium to trigger large premium alert (default $100k)
            sweep_volume_multiplier: Volume vs average to qualify as sweep (default 10x)
            sweep_ask_proximity: Max distance from ask as fraction of spread (default 0.10)
            pc_imbalance_threshold: Put/call ratio to trigger imbalance (default 3x)
            min_volume: Minimum volume to consider a contract (filters noise)
            min_open_interest: Minimum OI to consider (avoids div-by-zero edge cases)
        """
        self.volume_oi_threshold = volume_oi_threshold
        self.large_premium_threshold = large_premium_threshold
        self.sweep_volume_multiplier = sweep_volume_multiplier
        self.sweep_ask_proximity = sweep_ask_proximity
        self.pc_imbalance_threshold = pc_imbalance_threshold
        self.min_volume = min_volume
        self.min_open_interest = min_open_interest

        logger.info(
            f"FlowDetector initialized: vol/OI={volume_oi_threshold}x, "
            f"premium=${large_premium_threshold:,.0f}, "
            f"sweep={sweep_volume_multiplier}x"
        )

    def _safe_volume(self, contract: OptionContract) -> int:
        return contract.volume or 0

    def _safe_oi(self, contract: OptionContract) -> int:
        return contract.open_interest or 0

    def _safe_price(self, contract: OptionContract) -> float:
        return contract.last_price or 0.0

    def _calc_premium(self, contract: OptionContract) -> float:
        """Estimated notional premium = volume * price * 100 (contract multiplier)."""
        return self._safe_volume(contract) * self._safe_price(contract) * 100

    def _make_alert(
        self,
        contract: OptionContract,
        alert_type: str,
        confidence: int,
    ) -> FlowAlert:
        vol = self._safe_volume(contract)
        oi = self._safe_oi(contract)

        return FlowAlert(
            symbol=contract.underlying_symbol,
            alert_type=alert_type,
            option_type=contract.option_type.value,
            strike=contract.strike_price,
            expiry=contract.expiration_date.isoformat(),
            volume=vol,
            open_interest=oi,
            volume_oi_ratio=vol / oi if oi > 0 else 0.0,
            estimated_premium=self._calc_premium(contract),
            confidence=min(max(confidence, 0), 100),
        )

    def _detect_volume_spike(self, contract: OptionContract) -> Optional[FlowAlert]:
        """Volume > threshold * open_interest."""
        vol = self._safe_volume(contract)
        oi = self._safe_oi(contract)

        if vol < self.min_volume or oi < self.min_open_interest:
            return None

        ratio = vol / oi
        if ratio < self.volume_oi_threshold:
            return None

        # Confidence: base 60, +5 per unit above threshold, capped at 95
        confidence = int(min(60 + (ratio - self.volume_oi_threshold) * 5, 95))
        return self._make_alert(contract, "volume_spike", confidence)

    def _detect_large_premium(self, contract: OptionContract) -> Optional[FlowAlert]:
        """Estimated premium > threshold."""
        vol = self._safe_volume(contract)
        if vol < self.min_volume:
            return None

        premium = self._calc_premium(contract)
        if premium < self.large_premium_threshold:
            return None

        # Confidence: base 70, +10 per log unit above threshold
        log_ratio = math.log(premium / self.large_premium_threshold) if premium > 0 else 0
        confidence = int(min(70 + log_ratio * 10, 95))
        return self._make_alert(contract, "large_premium", confidence)

    def _detect_otm_sweep(
        self, contract: OptionContract, avg_volume: float
    ) -> Optional[FlowAlert]:
        """OTM option with volume >> average and price near ask (aggressive buying)."""
        vol = self._safe_volume(contract)
        if vol < self.min_volume or avg_volume <= 0:
            return None

        # Must be OTM
        if contract.moneyness != Moneyness.OTM:
            return None

        # Volume must exceed multiplier * average
        if vol < self.sweep_volume_multiplier * avg_volume:
            return None

        # Price must be near the ask (within proximity % of spread from ask)
        bid = contract.bid or 0.0
        ask = contract.ask or 0.0
        price = self._safe_price(contract)

        if ask <= 0 or price <= 0:
            return None

        spread = ask - bid
        if spread <= 0:
            # Zero spread — price at ask qualifies
            is_near_ask = price >= ask
        else:
            distance_from_ask = ask - price
            is_near_ask = distance_from_ask <= spread * self.sweep_ask_proximity

        if not is_near_ask:
            return None

        return self._make_alert(contract, "otm_sweep", 80)

    def detect_unusual_flow(
        self, contracts: List[OptionContract], spot_price: float
    ) -> List[FlowAlert]:
        """
        Scan contracts for all unusual flow patterns.

        Runs volume spike, large premium, and OTM sweep detection
        across all provided contracts. Each contract can trigger
        multiple alert types.

        Args:
            contracts: List of OptionContract from an options chain
            spot_price: Current underlying price (for moneyness calc)

        Returns:
            List of FlowAlert sorted by confidence descending.
        """
        if not contracts:
            return []

        # Pre-calculate moneyness for all contracts
        for c in contracts:
            if spot_price > 0:
                c.calculate_moneyness(spot_price)

        # Calculate average volume for sweep detection
        volumes = [self._safe_volume(c) for c in contracts]
        non_zero_volumes = [v for v in volumes if v > 0]
        avg_volume = sum(non_zero_volumes) / len(non_zero_volumes) if non_zero_volumes else 0.0

        alerts: List[FlowAlert] = []

        for contract in contracts:
            spike = self._detect_volume_spike(contract)
            if spike:
                alerts.append(spike)

            premium = self._detect_large_premium(contract)
            if premium:
                alerts.append(premium)

            sweep = self._detect_otm_sweep(contract, avg_volume)
            if sweep:
                alerts.append(sweep)

        # Sort by confidence descending
        alerts.sort(key=lambda a: a.confidence, reverse=True)

        logger.info(
            f"Detected {len(alerts)} unusual flow alerts "
            f"across {len(contracts)} contracts"
        )
        return alerts

    def detect_sweeps(self, contracts: List[OptionContract]) -> List[FlowAlert]:
        """
        Detect sweep-like activity: high volume contracts priced near the ask.

        Unlike detect_unusual_flow, this focuses purely on sweep patterns
        without requiring moneyness (useful when spot price is unavailable).

        Args:
            contracts: List of OptionContract

        Returns:
            List of FlowAlert for sweep-like contracts.
        """
        if not contracts:
            return []

        volumes = [self._safe_volume(c) for c in contracts]
        non_zero_volumes = [v for v in volumes if v > 0]
        avg_volume = sum(non_zero_volumes) / len(non_zero_volumes) if non_zero_volumes else 0.0

        alerts: List[FlowAlert] = []

        for contract in contracts:
            vol = self._safe_volume(contract)
            if vol < self.min_volume or avg_volume <= 0:
                continue

            if vol < self.sweep_volume_multiplier * avg_volume:
                continue

            # Check price near ask
            bid = contract.bid or 0.0
            ask = contract.ask or 0.0
            price = self._safe_price(contract)

            if ask <= 0 or price <= 0:
                continue

            spread = ask - bid
            if spread <= 0:
                is_near_ask = price >= ask
            else:
                distance_from_ask = ask - price
                is_near_ask = distance_from_ask <= spread * self.sweep_ask_proximity

            if not is_near_ask:
                continue

            # Sweep confidence: base 75, scales with volume ratio
            vol_ratio = vol / avg_volume
            confidence = int(min(75 + (vol_ratio - self.sweep_volume_multiplier) * 2, 95))
            alerts.append(self._make_alert(contract, "otm_sweep", confidence))

        alerts.sort(key=lambda a: a.confidence, reverse=True)
        logger.info(f"Detected {len(alerts)} sweep alerts")
        return alerts

    def get_flow_summary(
        self, contracts: List[OptionContract], spot_price: float
    ) -> FlowSummary:
        """
        Generate aggregated flow summary with bullish/bearish scoring.

        Combines volume analysis, premium analysis, and alert detection
        into a single directional summary.

        Args:
            contracts: List of OptionContract from an options chain
            spot_price: Current underlying price

        Returns:
            FlowSummary with volumes, ratios, alerts, and directional scores.
        """
        if not contracts:
            return FlowSummary(
                total_call_volume=0,
                total_put_volume=0,
                put_call_ratio=0.0,
                net_premium=0.0,
                top_alerts=[],
                bullish_score=50,
                bearish_score=50,
            )

        # Aggregate volumes and premiums by type
        call_volume = 0
        put_volume = 0
        call_premium = 0.0
        put_premium = 0.0

        for c in contracts:
            vol = self._safe_volume(c)
            prem = self._calc_premium(c)

            if c.option_type == OptionType.CALL:
                call_volume += vol
                call_premium += prem
            else:
                put_volume += vol
                put_premium += prem

        total_volume = call_volume + put_volume
        pc_ratio = put_volume / call_volume if call_volume > 0 else 0.0
        net_premium = call_premium - put_premium

        # Check for put/call imbalance alerts
        alerts = self.detect_unusual_flow(contracts, spot_price)

        if total_volume > 0:
            # PC imbalance: puts > threshold * calls
            if call_volume > 0 and pc_ratio > self.pc_imbalance_threshold:
                alerts.append(FlowAlert(
                    symbol=contracts[0].underlying_symbol,
                    alert_type="pc_imbalance",
                    option_type="put",
                    strike=0.0,
                    expiry="",
                    volume=put_volume,
                    open_interest=0,
                    volume_oi_ratio=0.0,
                    estimated_premium=put_premium,
                    confidence=50,
                ))

            # Inverse: calls > threshold * puts
            inverse_ratio = call_volume / put_volume if put_volume > 0 else 0.0
            if put_volume > 0 and inverse_ratio > self.pc_imbalance_threshold:
                alerts.append(FlowAlert(
                    symbol=contracts[0].underlying_symbol,
                    alert_type="pc_imbalance",
                    option_type="call",
                    strike=0.0,
                    expiry="",
                    volume=call_volume,
                    open_interest=0,
                    volume_oi_ratio=0.0,
                    estimated_premium=call_premium,
                    confidence=50,
                ))

        # Re-sort after adding imbalance alerts
        alerts.sort(key=lambda a: a.confidence, reverse=True)
        top_alerts = alerts[:10]

        # --- Directional scoring ---
        # Base: 50/50 neutral
        bullish = 50.0
        bearish = 50.0

        # Volume component (max +/-20 points)
        if total_volume > 0:
            call_pct = call_volume / total_volume
            put_pct = put_volume / total_volume
            bullish += (call_pct - 0.5) * 40  # +20 if 100% calls, -20 if 0%
            bearish += (put_pct - 0.5) * 40

        # Premium component (max +/-15 points)
        total_premium = call_premium + put_premium
        if total_premium > 0:
            call_prem_pct = call_premium / total_premium
            put_prem_pct = put_premium / total_premium
            bullish += (call_prem_pct - 0.5) * 30
            bearish += (put_prem_pct - 0.5) * 30

        # Alert component (max +/-15 points)
        call_alert_count = sum(1 for a in alerts if a.option_type == "call")
        put_alert_count = sum(1 for a in alerts if a.option_type == "put")
        total_alerts = call_alert_count + put_alert_count

        if total_alerts > 0:
            bullish += (call_alert_count / total_alerts - 0.5) * 30
            bearish += (put_alert_count / total_alerts - 0.5) * 30

        # Clamp to 0-100
        bullish_score = int(min(max(bullish, 0), 100))
        bearish_score = int(min(max(bearish, 0), 100))

        logger.info(
            f"Flow summary: calls={call_volume} puts={put_volume} "
            f"P/C={pc_ratio:.2f} bullish={bullish_score} bearish={bearish_score} "
            f"alerts={len(alerts)}"
        )

        return FlowSummary(
            total_call_volume=call_volume,
            total_put_volume=put_volume,
            put_call_ratio=pc_ratio,
            net_premium=net_premium,
            top_alerts=top_alerts,
            bullish_score=bullish_score,
            bearish_score=bearish_score,
        )
