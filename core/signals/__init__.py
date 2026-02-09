"""
Signal processing module for DeepStack Trading System (DeepSignals)

Transforms raw market data into actionable trading signals:
- GEX (Gamma Exposure) calculation from options chains
- Unusual options flow detection
- Implied volatility surface tracking
- Multi-source sentiment aggregation
"""

# Phase 2 signal engines (uncomment as implemented):
# from .gex_calculator import GEXCalculator
# from .flow_detector import FlowDetector
from .iv_tracker import IVTracker
# from .sentiment_aggregator import SentimentAggregator

__all__ = [
    # "GEXCalculator",
    # "FlowDetector",
    "IVTracker",
    # "SentimentAggregator",
]
