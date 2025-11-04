"""
Production Execution Module - Advanced order execution algorithms

Provides institutional-grade execution algorithms for DeepStack:
- TWAP (Time-Weighted Average Price)
- VWAP (Volume-Weighted Average Price)
- Smart order routing
- Slippage modeling
- Execution monitoring

This module is the bridge between strategy signals and market execution,
ensuring optimal order execution with minimal market impact.
"""

from .router import ExecutionRouter
from .slippage import SlippageModel
from .twap import TWAPExecutor
from .vwap import VWAPExecutor

__all__ = [
    "TWAPExecutor",
    "VWAPExecutor",
    "ExecutionRouter",
    "SlippageModel",
]
