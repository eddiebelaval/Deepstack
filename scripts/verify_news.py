import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from core.config import get_config
from core.data.alpaca_client import AlpacaClient


async def main():
    print("Initializing configuration...")
    config = get_config()

    if not config.alpaca_api_key or not config.alpaca_secret_key:
        print("Error: Alpaca API credentials not found in environment")
        return

    print("Initializing Alpaca Client...")
    try:
        alpaca = AlpacaClient(
            api_key=config.alpaca_api_key, secret_key=config.alpaca_secret_key
        )

        print("\n=== Testing General News ===")
        print("Fetching top 3 general news articles...")
        general_news = await alpaca.get_news(limit=3)

        if not general_news:
            print("No general news found.")
        else:
            for i, article in enumerate(general_news, 1):
                print(f"{i}. {article['headline']} ({article['source']})")
                print(f"   Published: {article['publishedAt']}")
                print(f"   URL: {article['url']}")
                print("")

        print("\n=== Testing Symbol Specific News (AAPL) ===")
        print("Fetching top 3 news articles for AAPL...")
        aapl_news = await alpaca.get_news(symbol="AAPL", limit=3)

        if not aapl_news:
            print("No AAPL news found.")
        else:
            for i, article in enumerate(aapl_news, 1):
                print(f"{i}. {article['headline']} ({article['source']})")
                print(f"   Published: {article['publishedAt']}")
                print("")

    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
