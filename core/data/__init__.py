"""
Data management module for DeepStack Trading System

Handles market data, price feeds, historical data, and data persistence.
"""

from .market_data import MarketDataManager
from .price_feed import PriceFeed
from .data_storage import DataStorage

__all__ = ['MarketDataManager', 'PriceFeed', 'DataStorage']
