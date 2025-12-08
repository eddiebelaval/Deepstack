"""
Analysis Module for DeepStack Trading System

Provides AI-powered analysis capabilities:
- Prediction market analysis (inefficiency, momentum, contrarian signals)
- Market correlation analysis
- Thesis correlation analysis
"""

from .prediction_market_analyzer import (
    AnalysisType,
    MarketAnalysis,
    PredictionMarketAnalyzer,
)

__all__ = [
    "AnalysisType",
    "MarketAnalysis",
    "PredictionMarketAnalyzer",
]
