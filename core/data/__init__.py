"""
Data management module for DeepStack Trading System

Handles market data, price feeds, historical data, and data persistence.
"""

from .data_storage import DataStorage
from .finnhub_client import FinnhubClient
from .market_data import MarketDataManager
from .newsapi_client import NewsAPIClient
from .price_feed import PriceFeed
from .rss_aggregator import RSSAggregator
from .stocktwits_client import StockTwitsClient

__all__ = [
    "DataStorage",
    "FinnhubClient",
    "MarketDataManager",
    "NewsAPIClient",
    "PriceFeed",
    "RSSAggregator",
    "StockTwitsClient",
]
