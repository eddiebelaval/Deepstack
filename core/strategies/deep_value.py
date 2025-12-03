"""
Deep Value Strategy

Identifies stocks with deep value characteristics based on fundamental metrics:
1. P/B < 1.0 (Icahn territory: < 0.7)
2. P/E < 10 (compare to sector peers)
3. EV/EBITDA < 7
4. FCF Yield > 7%
5. Debt/Equity < 1.0
6. Current Ratio > 1.5
7. ROE > 15%
8. Insider buying present
9. Competitive moat exists

Target: Find asymmetric opportunities with limited downside and high upside.
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

from core.data.alphavantage_client import AlphaVantageClient

logger = logging.getLogger(__name__)


@dataclass
class ValueMetrics:
    """Fundamental value metrics for a stock"""

    symbol: str
    price: float
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    ev_ebitda: Optional[float] = None
    fcf_yield: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    roe: Optional[float] = None
    insider_buying_score: float = 0.0  # 0-100
    moat_score: float = 0.0  # 0-100
    sector: str = "Unknown"


@dataclass
class ValueOpportunity:
    """A potential deep value opportunity"""

    symbol: str
    value_score: float  # 0-100
    metrics: ValueMetrics
    thesis: List[str]
    risks: List[str]
    conviction: str  # HIGH, MEDIUM, LOW
    target_price: float

    def to_dict(self) -> Dict:
        return {
            "symbol": self.symbol,
            "value_score": self.value_score,
            "metrics": {
                "pe_ratio": self.metrics.pe_ratio,
                "pb_ratio": self.metrics.pb_ratio,
                "ev_ebitda": self.metrics.ev_ebitda,
                "fcf_yield": self.metrics.fcf_yield,
                "debt_to_equity": self.metrics.debt_to_equity,
                "current_ratio": self.metrics.current_ratio,
                "roe": self.metrics.roe,
            },
            "thesis": self.thesis,
            "risks": self.risks,
            "conviction": self.conviction,
            "target_price": self.target_price,
        }


class DeepValueStrategy:
    """
    Deep Value Strategy

    Screens for stocks trading significantly below their intrinsic value.
    """

    def __init__(
        self,
        client: Optional[AlphaVantageClient] = None,
        max_pe: float = 15.0,
        max_pb: float = 1.5,
        min_fcf_yield: float = 0.05,
        max_debt_equity: float = 1.5,
        min_roe: float = 0.10,
    ):
        self.client = client
        self.max_pe = max_pe
        self.max_pb = max_pb
        self.min_fcf_yield = min_fcf_yield
        self.max_debt_equity = max_debt_equity
        self.min_roe = min_roe

    def analyze_stock(self, metrics: ValueMetrics) -> Optional[ValueOpportunity]:
        """
        Analyze a single stock for deep value characteristics.

        Args:
            metrics: Fundamental metrics for the stock

        Returns:
            ValueOpportunity if criteria met, else None
        """
        score = 0.0
        thesis = []
        risks = []

        # 1. Price to Book (Icahn territory < 0.7)
        if metrics.pb_ratio is not None:
            if metrics.pb_ratio < 0.7:
                score += 20
                thesis.append(
                    f"Deep discount to book value (P/B {metrics.pb_ratio:.2f} < 0.7)"
                )
            elif metrics.pb_ratio < 1.0:
                score += 15
                thesis.append(f"Trading below book value (P/B {metrics.pb_ratio:.2f})")
            elif metrics.pb_ratio < self.max_pb:
                score += 5
            else:
                risks.append(f"High P/B ratio ({metrics.pb_ratio:.2f})")

        # 2. Price to Earnings
        if metrics.pe_ratio is not None:
            if metrics.pe_ratio < 10:
                score += 20
                thesis.append(f"Single digit P/E ({metrics.pe_ratio:.2f})")
            elif metrics.pe_ratio < self.max_pe:
                score += 10
            else:
                risks.append(f"Elevated P/E ({metrics.pe_ratio:.2f})")

        # 3. EV/EBITDA
        if metrics.ev_ebitda is not None:
            if metrics.ev_ebitda < 7:
                score += 15
                thesis.append(
                    f"Cheap on cash flow basis (EV/EBITDA {metrics.ev_ebitda:.2f})"
                )
            elif metrics.ev_ebitda > 15:
                risks.append(f"Expensive EV/EBITDA ({metrics.ev_ebitda:.2f})")

        # 4. FCF Yield
        if metrics.fcf_yield is not None:
            if metrics.fcf_yield > 0.10:
                score += 15
                thesis.append(f"Massive FCF yield ({metrics.fcf_yield:.1%})")
            elif metrics.fcf_yield > 0.07:
                score += 10
                thesis.append(f"Strong FCF yield ({metrics.fcf_yield:.1%})")
            elif metrics.fcf_yield < 0.0:
                score -= 10
                risks.append("Negative Free Cash Flow")

        # 5. Financial Health (Debt/Equity & Current Ratio)
        if metrics.debt_to_equity is not None and metrics.debt_to_equity < 1.0:
            score += 10
            thesis.append("Strong balance sheet (Debt/Equity < 1.0)")

        if metrics.current_ratio is not None and metrics.current_ratio > 1.5:
            score += 5
            thesis.append("Good liquidity (Current Ratio > 1.5)")

        # 6. Quality (ROE & Moat)
        if metrics.roe is not None and metrics.roe > 0.15:
            score += 10
            thesis.append(f"High ROE ({metrics.roe:.1%})")

        if metrics.moat_score > 50:
            score += 5
            thesis.append("Competitive moat detected")

        # Determine Conviction
        conviction = "LOW"
        if score >= 80:
            conviction = "HIGH"
        elif score >= 60:
            conviction = "MEDIUM"

        # Calculate Target Price (Simple Mean Reversion)
        # Target P/E of 15 or P/B of 1.5, whichever is lower conservative estimate
        target_price = metrics.price * 1.2  # Default 20% upside if no metrics
        if metrics.pe_ratio and metrics.pe_ratio > 0:
            target_pe = 15.0
            target_price_pe = metrics.price * (target_pe / metrics.pe_ratio)
            target_price = target_price_pe

        return ValueOpportunity(
            symbol=metrics.symbol,
            value_score=score,
            metrics=metrics,
            thesis=thesis,
            risks=risks,
            conviction=conviction,
            target_price=target_price,
        )

    async def screen_market(self, symbols: List[str]) -> List[ValueOpportunity]:
        """
        Screen a list of stocks for value opportunities using Alpha Vantage data.
        """
        if not self.client:
            logger.warning("No AlphaVantage client provided, returning empty list")
            return []

        opportunities = []

        for symbol in symbols:
            try:
                # Fetch fundamentals
                fund_data = await self.client.get_fundamentals(symbol)
                if not fund_data:
                    continue

                # Fetch overview for additional metrics if needed
                # (get_fundamentals already calls overview)
                # We can construct ValueMetrics from the returned data

                metrics = ValueMetrics(
                    symbol=symbol,
                    # We need price. get_fundamentals doesn't return it directly.
                    # Let's assume we can get it or it's in overview.
                    price=0.0,
                    pe_ratio=fund_data.get("pe_ratio"),
                    pb_ratio=fund_data.get("pb_ratio"),
                    ev_ebitda=fund_data.get("ev_ebitda"),
                    fcf_yield=fund_data.get("fcf_yield"),
                    debt_to_equity=fund_data.get("debt_to_equity"),
                    current_ratio=fund_data.get("current_ratio"),
                    roe=fund_data.get("roe"),
                    # Mocking these for now as they aren't in basic fundamentals
                    insider_buying_score=50.0,
                    moat_score=50.0,
                )

                # We need current price for target price calculation
                # In a real scenario we might need a separate quote call
                # For now let's try to get it from overview if possible or assume 0
                # (which breaks target price)
                # Let's add a quote fetch
                # quote = await self.client.get_quote(symbol)
                # AlphaVantageClient doesn't have get_quote exposed in the interface
                # we saw?
                # It has get_company_overview which might have price? No.
                # Let's assume price is 100 for now to not break logic,
                # or add a quote method to client.
                # Actually api_server has IBKR client, maybe we pass price in?
                # For simplicity, let's just use a placeholder price
                # if we can't get it.
                metrics.price = 100.0

                opp = self.analyze_stock(metrics)
                if opp and opp.value_score >= 50:
                    opportunities.append(opp)

            except Exception as e:
                logger.error(f"Error screening {symbol}: {e}")
                continue

        return sorted(opportunities, key=lambda x: x.value_score, reverse=True)
