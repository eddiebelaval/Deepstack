import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from core.config import get_config
    from core.data.market_data import MarketDataManager

    config = get_config()
    manager = MarketDataManager(config)
    print("MarketDataManager initialized successfully")
except Exception as e:
    print(f"Error: {e}")
