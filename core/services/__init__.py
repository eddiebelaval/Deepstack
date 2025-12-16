"""
Services module for DeepStack Trading System.

Contains business logic services that orchestrate data from multiple sources.
"""

from .news_aggregator import NewsAggregator

__all__ = ["NewsAggregator"]
