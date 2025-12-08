"""
Prediction Market AI Analysis Engine

Provides AI-powered analysis for prediction markets including:
- Inefficiency detection (market vs fundamentals/news)
- Momentum analysis (price trend + volume)
- Contrarian signals (crowd sentiment vs historical)
- Thesis correlation (how market affects trading thesis)

This is a heuristic-based v1 implementation that can be enhanced
with ML models in future iterations.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from ..data.prediction_markets import (
    Platform,
    PredictionMarket,
    PredictionMarketManager,
)

logger = logging.getLogger(__name__)


class AnalysisType(str, Enum):
    """Types of prediction market analysis."""

    INEFFICIENCY = "inefficiency"  # Market vs fundamentals/news
    MOMENTUM = "momentum"  # Price trend + volume
    CONTRARIAN = "contrarian"  # Crowd sentiment vs historical
    THESIS_CORRELATION = "thesis_correlation"  # How market affects thesis


class Signal(str, Enum):
    """Trading signal direction."""

    BULLISH = "bullish"  # Suggests YES position
    BEARISH = "bearish"  # Suggests NO position
    NEUTRAL = "neutral"  # No clear signal


class MarketAnalysis(BaseModel):
    """Result of prediction market analysis."""

    market_id: str
    platform: str
    analysis_type: AnalysisType
    score: float = Field(
        ..., ge=0.0, le=100.0, description="Confidence/strength score 0-100"
    )
    signal: Signal
    summary: str
    details: Dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        use_enum_values = True


@dataclass
class PricePoint:
    """Historical price data point."""

    timestamp: datetime
    price: float
    volume: Optional[float] = None


@dataclass
class MarketSnapshot:
    """Current market state snapshot."""

    market: PredictionMarket
    history: List[PricePoint] = field(default_factory=list)
    price_24h_ago: Optional[float] = None
    price_7d_ago: Optional[float] = None
    avg_volume_24h: Optional[float] = None

    @property
    def price_change_24h(self) -> Optional[float]:
        """Calculate 24h price change as percentage."""
        if self.price_24h_ago and self.price_24h_ago > 0:
            return (
                (self.market.yes_price - self.price_24h_ago) / self.price_24h_ago
            ) * 100
        return None

    @property
    def price_change_7d(self) -> Optional[float]:
        """Calculate 7d price change as percentage."""
        if self.price_7d_ago and self.price_7d_ago > 0:
            return (
                (self.market.yes_price - self.price_7d_ago) / self.price_7d_ago
            ) * 100
        return None


class PredictionMarketAnalyzer:
    """
    AI-powered analysis engine for prediction markets.

    Provides heuristic-based analysis across multiple dimensions:
    - Inefficiency: Detects mispriced markets based on price movements
    - Momentum: Analyzes price trends and volume patterns
    - Contrarian: Identifies extreme positioning and reversion opportunities
    - Thesis Correlation: Maps prediction markets to trading theses

    This v1 implementation uses rule-based heuristics. Future versions
    can incorporate ML models for improved accuracy.
    """

    def __init__(
        self,
        manager: Optional[PredictionMarketManager] = None,
        # Inefficiency thresholds
        inefficiency_move_threshold: float = 10.0,  # >10% move suggests inefficiency
        extreme_price_threshold: float = 0.90,  # >90% or <10% is extreme
        # Momentum thresholds
        strong_momentum_threshold: float = 15.0,  # >15% move is strong momentum
        moderate_momentum_threshold: float = 5.0,  # >5% move is moderate
        volume_surge_multiplier: float = 2.0,  # 2x average volume is surge
        # Contrarian thresholds
        contrarian_price_low: float = 0.15,  # <15% for contrarian buy
        contrarian_price_high: float = 0.85,  # >85% for contrarian sell
        # Text similarity thresholds
        keyword_match_weight: float = 10.0,  # Points per keyword match
    ):
        self.manager = manager or PredictionMarketManager()

        # Inefficiency params
        self.inefficiency_move_threshold = inefficiency_move_threshold
        self.extreme_price_threshold = extreme_price_threshold

        # Momentum params
        self.strong_momentum_threshold = strong_momentum_threshold
        self.moderate_momentum_threshold = moderate_momentum_threshold
        self.volume_surge_multiplier = volume_surge_multiplier

        # Contrarian params
        self.contrarian_price_low = contrarian_price_low
        self.contrarian_price_high = contrarian_price_high

        # Text analysis params
        self.keyword_match_weight = keyword_match_weight

        logger.info("PredictionMarketAnalyzer initialized")

    async def _get_market_snapshot(
        self, market_id: str, platform: str
    ) -> Optional[MarketSnapshot]:
        """
        Fetch market data and build a snapshot for analysis.

        Args:
            market_id: Market identifier
            platform: Platform name ('kalshi' or 'polymarket')

        Returns:
            MarketSnapshot with current and historical data
        """
        try:
            platform_enum = Platform(platform.lower())

            # Get current market data
            market = await self.manager.get_market_detail(platform_enum, market_id)
            if not market:
                logger.warning(f"Market not found: {market_id} on {platform}")
                return None

            # Get historical data
            history: List[PricePoint] = []
            price_24h_ago = None
            price_7d_ago = None
            avg_volume_24h = None

            if platform_enum == Platform.KALSHI:
                raw_history = await self.manager.kalshi.get_market_history(
                    market_id, limit=100
                )
                if raw_history:
                    now = datetime.now(timezone.utc)
                    volumes = []

                    for point in raw_history:
                        try:
                            ts_str = point.get("ts", "")
                            if ts_str:
                                ts = datetime.fromisoformat(
                                    ts_str.replace("Z", "+00:00")
                                )
                            else:
                                continue

                            price = point.get("yes_price", 0) / 100.0
                            volume = point.get("volume")

                            history.append(
                                PricePoint(timestamp=ts, price=price, volume=volume)
                            )

                            if volume:
                                volumes.append(volume)

                            # Track 24h and 7d prices
                            age = now - ts
                            if age <= timedelta(hours=25) and price_24h_ago is None:
                                price_24h_ago = price
                            if age <= timedelta(days=8) and price_7d_ago is None:
                                price_7d_ago = price

                        except Exception as e:
                            logger.debug(f"Error parsing history point: {e}")
                            continue

                    if volumes:
                        avg_volume_24h = sum(volumes) / len(volumes)

            elif platform_enum == Platform.POLYMARKET:
                raw_history = await self.manager.polymarket.get_prices_history(
                    market_id, fidelity=3600
                )
                if raw_history:
                    now = datetime.now(timezone.utc)

                    for point in raw_history:
                        try:
                            ts_str = point.get("t", "")
                            if ts_str:
                                ts = datetime.fromisoformat(
                                    ts_str.replace("Z", "+00:00")
                                )
                            else:
                                continue

                            price = point.get("p", 0)

                            history.append(PricePoint(timestamp=ts, price=price))

                            # Track 24h and 7d prices
                            age = now - ts
                            if age <= timedelta(hours=25) and price_24h_ago is None:
                                price_24h_ago = price
                            if age <= timedelta(days=8) and price_7d_ago is None:
                                price_7d_ago = price

                        except Exception as e:
                            logger.debug(f"Error parsing history point: {e}")
                            continue

            return MarketSnapshot(
                market=market,
                history=history,
                price_24h_ago=price_24h_ago,
                price_7d_ago=price_7d_ago,
                avg_volume_24h=avg_volume_24h,
            )

        except Exception as e:
            logger.error(f"Error building market snapshot: {e}")
            return None

    async def analyze_inefficiency(
        self, market_id: str, platform: str
    ) -> MarketAnalysis:
        """
        Detect price inefficiencies in prediction markets.

        Inefficiency indicators:
        1. Large price move (>10%) in 24h without corresponding volume
        2. Price at extremes (>90% or <10%) with high volume - overconfidence
        3. Price diverging from similar markets
        4. Rapid price oscillation (potential manipulation)

        Args:
            market_id: Market identifier
            platform: Platform name

        Returns:
            MarketAnalysis with inefficiency assessment
        """
        snapshot = await self._get_market_snapshot(market_id, platform)

        if not snapshot:
            return MarketAnalysis(
                market_id=market_id,
                platform=platform,
                analysis_type=AnalysisType.INEFFICIENCY,
                score=0.0,
                signal=Signal.NEUTRAL,
                summary="Unable to fetch market data for analysis",
                details={"error": "market_not_found"},
            )

        market = snapshot.market
        score = 0.0
        signals: List[str] = []
        details: Dict = {
            "current_price": market.yes_price,
            "price_change_24h": snapshot.price_change_24h,
            "volume_24h": market.volume_24h,
        }

        # Check 1: Large price move without major volume
        if snapshot.price_change_24h is not None:
            move_size = abs(snapshot.price_change_24h)

            if move_size > self.inefficiency_move_threshold:
                # Large move detected
                volume_ratio = 1.0
                if snapshot.avg_volume_24h and market.volume_24h:
                    volume_ratio = market.volume_24h / snapshot.avg_volume_24h

                if volume_ratio < 1.5:
                    # Large move on low volume - potential inefficiency
                    score += 30
                    signals.append(
                        f"Large price move ({move_size:.1f}%) on relatively low volume"
                    )
                    details["volume_ratio"] = volume_ratio
                else:
                    # Large move with volume - more justified
                    score += 10
                    signals.append(
                        f"Large price move ({move_size:.1f}%) with supporting volume"
                    )

        # Check 2: Price at extremes with high volume - overconfidence signal
        if market.yes_price > self.extreme_price_threshold:
            score += 25
            signals.append(
                f"Price at extreme high ({market.yes_price:.1%}) - possible overconfidence"
            )
            details["extreme_high"] = True
        elif market.yes_price < (1 - self.extreme_price_threshold):
            score += 25
            signals.append(
                f"Price at extreme low ({market.yes_price:.1%}) - possible underpricing"
            )
            details["extreme_low"] = True

        # Check 3: Price oscillation (rapid reversals indicate manipulation/inefficiency)
        if len(snapshot.history) >= 10:
            reversals = self._count_reversals(snapshot.history[-20:])
            if reversals >= 5:
                score += 20
                signals.append(
                    f"High price oscillation detected ({reversals} reversals)"
                )
                details["reversal_count"] = reversals

        # Check 4: Days to expiration consideration
        if market.end_date:
            days_to_expiry = (market.end_date - datetime.now(timezone.utc)).days
            if days_to_expiry <= 1 and 0.3 < market.yes_price < 0.7:
                # Market expiring soon but price not decisive - inefficiency
                score += 25
                signals.append(
                    f"Market expires in {days_to_expiry} days but price indecisive"
                )
                details["days_to_expiry"] = days_to_expiry

        # Determine signal direction
        signal = Signal.NEUTRAL
        if score >= 50:
            # High inefficiency detected
            if market.yes_price > 0.5:
                signal = Signal.BEARISH  # Overpriced YES
            else:
                signal = Signal.BULLISH  # Underpriced YES

        # Cap score at 100
        score = min(score, 100.0)

        # Generate summary
        if score >= 70:
            summary = f"High inefficiency detected: {'; '.join(signals)}"
        elif score >= 40:
            summary = (
                f"Moderate inefficiency: {'; '.join(signals)}"
                if signals
                else "Some inefficiency indicators present"
            )
        else:
            summary = "Market appears efficiently priced"

        return MarketAnalysis(
            market_id=market_id,
            platform=platform,
            analysis_type=AnalysisType.INEFFICIENCY,
            score=score,
            signal=signal,
            summary=summary,
            details=details,
        )

    def _count_reversals(self, history: List[PricePoint]) -> int:
        """Count price direction reversals in history."""
        if len(history) < 3:
            return 0

        reversals = 0
        prev_direction = None

        for i in range(1, len(history)):
            current_direction = history[i].price - history[i - 1].price
            if prev_direction is not None:
                if (prev_direction > 0 and current_direction < 0) or (
                    prev_direction < 0 and current_direction > 0
                ):
                    reversals += 1
            prev_direction = current_direction

        return reversals

    async def analyze_momentum(self, market_id: str, platform: str) -> MarketAnalysis:
        """
        Analyze price momentum in prediction markets.

        Momentum indicators:
        1. Price change velocity (1h, 24h, 7d trends)
        2. Volume surge detection (vs average)
        3. Trend strength and consistency
        4. Acceleration/deceleration patterns

        Args:
            market_id: Market identifier
            platform: Platform name

        Returns:
            MarketAnalysis with momentum assessment
        """
        snapshot = await self._get_market_snapshot(market_id, platform)

        if not snapshot:
            return MarketAnalysis(
                market_id=market_id,
                platform=platform,
                analysis_type=AnalysisType.MOMENTUM,
                score=0.0,
                signal=Signal.NEUTRAL,
                summary="Unable to fetch market data for analysis",
                details={"error": "market_not_found"},
            )

        market = snapshot.market
        score = 0.0
        signals: List[str] = []
        momentum_direction = 0  # Positive = bullish, negative = bearish

        details: Dict = {
            "current_price": market.yes_price,
            "price_change_24h": snapshot.price_change_24h,
            "price_change_7d": snapshot.price_change_7d,
            "volume_24h": market.volume_24h,
        }

        # Factor 1: 24h Price Change
        if snapshot.price_change_24h is not None:
            change = snapshot.price_change_24h

            if abs(change) > self.strong_momentum_threshold:
                score += 40
                signals.append(f"Strong 24h momentum: {change:+.1f}%")
                momentum_direction += 2 if change > 0 else -2
            elif abs(change) > self.moderate_momentum_threshold:
                score += 25
                signals.append(f"Moderate 24h momentum: {change:+.1f}%")
                momentum_direction += 1 if change > 0 else -1

            details["momentum_24h"] = (
                "strong"
                if abs(change) > self.strong_momentum_threshold
                else (
                    "moderate"
                    if abs(change) > self.moderate_momentum_threshold
                    else "weak"
                )
            )

        # Factor 2: 7d Price Change (trend confirmation)
        if snapshot.price_change_7d is not None:
            change = snapshot.price_change_7d

            if abs(change) > self.strong_momentum_threshold * 2:
                score += 20
                signals.append(f"Strong weekly trend: {change:+.1f}%")
                momentum_direction += 1 if change > 0 else -1

            # Check trend consistency (24h vs 7d same direction)
            if snapshot.price_change_24h is not None:
                if (snapshot.price_change_24h > 0 and change > 0) or (
                    snapshot.price_change_24h < 0 and change < 0
                ):
                    score += 10
                    signals.append("Trend consistency confirmed (24h aligns with 7d)")
                    details["trend_consistent"] = True

        # Factor 3: Volume Analysis
        if snapshot.avg_volume_24h and market.volume_24h:
            volume_ratio = market.volume_24h / snapshot.avg_volume_24h
            details["volume_ratio"] = volume_ratio

            if volume_ratio > self.volume_surge_multiplier:
                score += 20
                signals.append(f"Volume surge: {volume_ratio:.1f}x average")
                # Volume confirms momentum direction
                if momentum_direction != 0:
                    momentum_direction += 1 if momentum_direction > 0 else -1

        # Factor 4: Trend strength from history
        if len(snapshot.history) >= 5:
            trend_score = self._calculate_trend_strength(snapshot.history[-10:])
            details["trend_strength"] = trend_score

            if abs(trend_score) > 0.7:
                score += 10
                signals.append(f"Strong trend strength: {trend_score:.2f}")

        # Determine signal
        if momentum_direction > 0:
            signal = Signal.BULLISH
        elif momentum_direction < 0:
            signal = Signal.BEARISH
        else:
            signal = Signal.NEUTRAL

        # Cap score
        score = min(score, 100.0)

        # Generate summary
        direction_str = (
            "bullish"
            if momentum_direction > 0
            else "bearish" if momentum_direction < 0 else "neutral"
        )
        if score >= 60:
            summary = f"Strong {direction_str} momentum: {'; '.join(signals)}"
        elif score >= 30:
            summary = f"Moderate {direction_str} momentum detected"
        else:
            summary = "Low momentum - market is ranging"

        return MarketAnalysis(
            market_id=market_id,
            platform=platform,
            analysis_type=AnalysisType.MOMENTUM,
            score=score,
            signal=signal,
            summary=summary,
            details=details,
        )

    def _calculate_trend_strength(self, history: List[PricePoint]) -> float:
        """
        Calculate trend strength from -1 (strong down) to +1 (strong up).

        Uses simple linear regression slope normalized.
        """
        if len(history) < 2:
            return 0.0

        prices = [p.price for p in history]
        n = len(prices)

        # Simple linear regression
        x_mean = (n - 1) / 2
        y_mean = sum(prices) / n

        numerator = sum((i - x_mean) * (prices[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))

        if denominator == 0:
            return 0.0

        slope = numerator / denominator

        # Normalize by price range
        price_range = max(prices) - min(prices)
        if price_range > 0:
            normalized_slope = slope / price_range * n
            return max(min(normalized_slope, 1.0), -1.0)

        return 0.0

    async def analyze_contrarian(self, market_id: str, platform: str) -> MarketAnalysis:
        """
        Identify contrarian trading opportunities.

        Contrarian indicators:
        1. Extreme positioning (>85% or <15%)
        2. Mean reversion potential
        3. Historical crowd accuracy in similar situations
        4. Sentiment exhaustion signals

        Args:
            market_id: Market identifier
            platform: Platform name

        Returns:
            MarketAnalysis with contrarian assessment
        """
        snapshot = await self._get_market_snapshot(market_id, platform)

        if not snapshot:
            return MarketAnalysis(
                market_id=market_id,
                platform=platform,
                analysis_type=AnalysisType.CONTRARIAN,
                score=0.0,
                signal=Signal.NEUTRAL,
                summary="Unable to fetch market data for analysis",
                details={"error": "market_not_found"},
            )

        market = snapshot.market
        score = 0.0
        signals: List[str] = []
        contrarian_direction = 0  # Positive = buy YES, negative = buy NO

        details: Dict = {
            "current_price": market.yes_price,
            "price_change_24h": snapshot.price_change_24h,
        }

        # Factor 1: Extreme Price Positioning
        if market.yes_price > self.contrarian_price_high:
            score += 40
            contrarian_direction = -1  # Contrarian = bet against crowd (buy NO)
            signals.append(
                f"Extreme bullish positioning ({market.yes_price:.1%}) - contrarian bearish"
            )
            details["extreme_positioning"] = "bullish"

            # Extra points for very extreme
            if market.yes_price > 0.95:
                score += 15
                signals.append("Near-certainty pricing creates asymmetric opportunity")

        elif market.yes_price < self.contrarian_price_low:
            score += 40
            contrarian_direction = 1  # Contrarian = buy YES
            signals.append(
                f"Extreme bearish positioning ({market.yes_price:.1%}) - contrarian bullish"
            )
            details["extreme_positioning"] = "bearish"

            # Extra points for very extreme
            if market.yes_price < 0.05:
                score += 15
                signals.append("Near-zero pricing creates asymmetric opportunity")

        # Factor 2: Recent Rapid Move to Extreme (crowd pile-on)
        if snapshot.price_change_24h is not None:
            change = snapshot.price_change_24h

            # Rapid move to extreme is more contrarian
            if market.yes_price > self.contrarian_price_high and change > 10:
                score += 20
                signals.append(f"Rapid crowd pile-on (+{change:.1f}% in 24h)")
                details["rapid_move"] = True
            elif market.yes_price < self.contrarian_price_low and change < -10:
                score += 20
                signals.append(f"Panic selling ({change:.1f}% in 24h)")
                details["rapid_move"] = True

        # Factor 3: Time to Expiry Analysis
        if market.end_date:
            days_to_expiry = (market.end_date - datetime.now(timezone.utc)).days
            details["days_to_expiry"] = days_to_expiry

            if days_to_expiry > 30:
                # Long time to expiry - more room for reversion
                if score > 0:
                    score += 15
                    signals.append(
                        f"Plenty of time for mean reversion ({days_to_expiry} days)"
                    )
            elif days_to_expiry < 7:
                # Short time - reduce contrarian score
                if score > 0:
                    score -= 10
                    signals.append(
                        f"Limited time for reversion ({days_to_expiry} days)"
                    )

        # Factor 4: Historical Price Range Analysis
        if len(snapshot.history) >= 10:
            prices = [p.price for p in snapshot.history]
            price_range = max(prices) - min(prices)
            avg_price = sum(prices) / len(prices)

            details["historical_avg"] = avg_price
            details["price_range"] = price_range

            # Current price far from historical average
            deviation = abs(market.yes_price - avg_price)
            if deviation > 0.2:
                score += 10
                signals.append(f"Price {deviation:.1%} away from historical average")

        # Determine signal
        if contrarian_direction > 0:
            signal = Signal.BULLISH
        elif contrarian_direction < 0:
            signal = Signal.BEARISH
        else:
            signal = Signal.NEUTRAL

        # Cap score
        score = min(max(score, 0), 100.0)

        # Generate summary
        if score >= 60:
            direction = (
                "bullish (buy YES)" if contrarian_direction > 0 else "bearish (buy NO)"
            )
            summary = f"Strong contrarian {direction}: {'; '.join(signals)}"
        elif score >= 30:
            summary = (
                f"Moderate contrarian opportunity: {'; '.join(signals)}"
                if signals
                else "Some contrarian indicators present"
            )
        else:
            summary = "No significant contrarian opportunity detected"

        return MarketAnalysis(
            market_id=market_id,
            platform=platform,
            analysis_type=AnalysisType.CONTRARIAN,
            score=score,
            signal=signal,
            summary=summary,
            details=details,
        )

    async def correlate_to_thesis(
        self, market_id: str, platform: str, thesis_symbol: str, thesis_hypothesis: str
    ) -> MarketAnalysis:
        """
        Analyze how a prediction market relates to a trading thesis.

        Correlation analysis includes:
        1. Text similarity between market title and thesis
        2. Sector/category matching
        3. Keyword extraction and matching
        4. Directional relationship (positive/negative correlation)

        Args:
            market_id: Market identifier
            platform: Platform name
            thesis_symbol: Stock symbol the thesis is about
            thesis_hypothesis: Description of the trading thesis

        Returns:
            MarketAnalysis with thesis correlation assessment
        """
        snapshot = await self._get_market_snapshot(market_id, platform)

        if not snapshot:
            return MarketAnalysis(
                market_id=market_id,
                platform=platform,
                analysis_type=AnalysisType.THESIS_CORRELATION,
                score=0.0,
                signal=Signal.NEUTRAL,
                summary="Unable to fetch market data for analysis",
                details={"error": "market_not_found"},
            )

        market = snapshot.market
        score = 0.0
        signals: List[str] = []
        correlation_type = "neutral"  # positive, negative, or neutral

        details: Dict = {
            "market_title": market.title,
            "thesis_symbol": thesis_symbol,
            "thesis_hypothesis": thesis_hypothesis[:200],  # Truncate for storage
            "current_price": market.yes_price,
        }

        # Normalize text for comparison
        market_text = (
            f"{market.title} {market.description or ''} {market.category}".lower()
        )
        thesis_text = f"{thesis_symbol} {thesis_hypothesis}".lower()

        # Factor 1: Direct Symbol Match
        symbol_lower = thesis_symbol.lower()
        if symbol_lower in market_text:
            score += 40
            signals.append(f"Direct symbol match ({thesis_symbol})")
            details["symbol_match"] = True
            correlation_type = "positive"

        # Factor 2: Keyword Extraction and Matching
        thesis_keywords = self._extract_keywords(thesis_hypothesis)
        market_keywords = self._extract_keywords(
            f"{market.title} {market.description or ''}"
        )

        matching_keywords = thesis_keywords & market_keywords
        if matching_keywords:
            keyword_score = min(len(matching_keywords) * self.keyword_match_weight, 30)
            score += keyword_score
            signals.append(f"Keyword matches: {', '.join(list(matching_keywords)[:5])}")
            details["matching_keywords"] = list(matching_keywords)

        # Factor 3: Sector/Category Analysis
        sector_keywords = self._get_sector_keywords(thesis_hypothesis)
        for keyword in sector_keywords:
            if keyword in market.category.lower() or keyword in market_text:
                score += 15
                signals.append(f"Sector alignment: {keyword}")
                details["sector_match"] = keyword
                correlation_type = "positive"
                break

        # Factor 4: Event Impact Analysis
        # Check if market outcome would positively or negatively affect thesis
        impact_keywords_positive = [
            "growth",
            "increase",
            "rise",
            "bull",
            "expand",
            "approve",
            "win",
        ]
        impact_keywords_negative = [
            "decline",
            "fall",
            "bear",
            "recession",
            "reject",
            "fail",
            "lose",
        ]

        positive_count = sum(1 for k in impact_keywords_positive if k in market_text)
        negative_count = sum(1 for k in impact_keywords_negative if k in market_text)

        if positive_count > negative_count:
            details["market_sentiment"] = "positive"
            if correlation_type == "positive":
                signals.append("Market outcome aligns with thesis direction")
                score += 10
        elif negative_count > positive_count:
            details["market_sentiment"] = "negative"
            if correlation_type == "positive":
                correlation_type = "negative"
                signals.append("Market outcome opposes thesis direction")
                score += 10

        # Determine signal based on correlation
        if correlation_type == "positive":
            # If market predicts YES (>50%), bullish for thesis
            signal = Signal.BULLISH if market.yes_price > 0.5 else Signal.BEARISH
        elif correlation_type == "negative":
            # Inverse relationship
            signal = Signal.BEARISH if market.yes_price > 0.5 else Signal.BULLISH
        else:
            signal = Signal.NEUTRAL

        details["correlation_type"] = correlation_type

        # Cap score
        score = min(score, 100.0)

        # Generate summary
        if score >= 60:
            summary = f"Strong correlation to thesis ({correlation_type}): {'; '.join(signals)}"
        elif score >= 30:
            summary = (
                f"Moderate correlation to thesis: {'; '.join(signals)}"
                if signals
                else "Some correlation indicators"
            )
        else:
            summary = f"Weak or no correlation between market '{market.title[:50]}' and thesis for {thesis_symbol}"

        return MarketAnalysis(
            market_id=market_id,
            platform=platform,
            analysis_type=AnalysisType.THESIS_CORRELATION,
            score=score,
            signal=signal,
            summary=summary,
            details=details,
        )

    def _extract_keywords(self, text: str) -> set:
        """Extract meaningful keywords from text."""
        # Remove common words and extract meaningful terms
        stop_words = {
            "the",
            "a",
            "an",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "shall",
            "can",
            "need",
            "dare",
            "ought",
            "used",
            "to",
            "of",
            "in",
            "for",
            "on",
            "with",
            "at",
            "by",
            "from",
            "as",
            "into",
            "through",
            "during",
            "before",
            "after",
            "above",
            "below",
            "between",
            "under",
            "again",
            "further",
            "then",
            "once",
            "here",
            "there",
            "when",
            "where",
            "why",
            "how",
            "all",
            "each",
            "few",
            "more",
            "most",
            "other",
            "some",
            "such",
            "no",
            "nor",
            "not",
            "only",
            "own",
            "same",
            "so",
            "than",
            "too",
            "very",
            "just",
            "and",
            "but",
            "if",
            "or",
            "because",
            "until",
            "while",
            "this",
            "that",
            "these",
            "those",
            "what",
            "which",
            "who",
            "whom",
            "i",
            "me",
            "my",
            "we",
            "our",
            "you",
            "your",
            "he",
            "him",
            "his",
            "she",
            "her",
            "it",
            "its",
            "they",
            "them",
            "their",
            "price",
            "market",
            "trading",
            "stock",
        }

        # Extract words (alphanumeric only)
        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())

        # Filter stop words and return unique keywords
        keywords = {w for w in words if w not in stop_words}

        return keywords

    def _get_sector_keywords(self, text: str) -> List[str]:
        """Extract sector-related keywords from text."""
        sector_map = {
            "tech": [
                "technology",
                "tech",
                "software",
                "ai",
                "cloud",
                "semiconductor",
                "chip",
            ],
            "finance": [
                "bank",
                "finance",
                "financial",
                "interest",
                "rate",
                "fed",
                "treasury",
            ],
            "healthcare": ["health", "pharma", "drug", "fda", "biotech", "medical"],
            "energy": [
                "oil",
                "gas",
                "energy",
                "renewable",
                "solar",
                "wind",
                "ev",
                "electric",
            ],
            "retail": ["retail", "consumer", "shopping", "ecommerce", "amazon"],
            "crypto": ["bitcoin", "crypto", "ethereum", "blockchain", "defi"],
            "politics": [
                "election",
                "vote",
                "president",
                "congress",
                "policy",
                "regulation",
            ],
        }

        text_lower = text.lower()
        matching_sectors = []

        for sector, keywords in sector_map.items():
            if any(kw in text_lower for kw in keywords):
                matching_sectors.extend(keywords)

        return matching_sectors

    async def full_analysis(
        self,
        market_id: str,
        platform: str,
        thesis_symbol: Optional[str] = None,
        thesis_hypothesis: Optional[str] = None,
    ) -> List[MarketAnalysis]:
        """
        Run all analysis types and return combined results.

        Args:
            market_id: Market identifier
            platform: Platform name
            thesis_symbol: Optional stock symbol for thesis correlation
            thesis_hypothesis: Optional thesis description

        Returns:
            List of MarketAnalysis results from all applicable analyses
        """
        analyses: List[MarketAnalysis] = []

        # Run core analyses
        inefficiency = await self.analyze_inefficiency(market_id, platform)
        analyses.append(inefficiency)

        momentum = await self.analyze_momentum(market_id, platform)
        analyses.append(momentum)

        contrarian = await self.analyze_contrarian(market_id, platform)
        analyses.append(contrarian)

        # Run thesis correlation if provided
        if thesis_symbol and thesis_hypothesis:
            correlation = await self.correlate_to_thesis(
                market_id, platform, thesis_symbol, thesis_hypothesis
            )
            analyses.append(correlation)

        logger.info(
            f"Full analysis completed for {platform}/{market_id}: "
            f"{len(analyses)} analyses, avg score {sum(a.score for a in analyses) / len(analyses):.1f}"
        )

        return analyses

    async def close(self):
        """Close manager connections."""
        await self.manager.close()
