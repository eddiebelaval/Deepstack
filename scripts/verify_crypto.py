import sys

import requests

BASE_URL = "http://127.0.0.1:8001"


def test_crypto_bars():
    print("Testing crypto bars...")
    response = requests.get(
        f"{BASE_URL}/api/market/bars",
        params={"symbol": "BTC/USD", "limit": 10},
        timeout=30,
    )
    if response.status_code == 200:
        data = response.json()
        bars = data.get("bars", [])
        if len(bars) > 0:
            print(f"SUCCESS: Fetched {len(bars)} bars for BTC/USD")
            print(f"Sample bar: {bars[0]}")
        else:
            print("FAILURE: No bars returned for BTC/USD")
            sys.exit(1)
    else:
        print(f"FAILURE: Status code {response.status_code}")
        print(response.text)
        sys.exit(1)


def test_crypto_quotes():
    print("\nTesting crypto quotes...")
    response = requests.get(
        f"{BASE_URL}/api/market/quotes",
        params={"symbols": "BTC/USD,ETH/USD"},
        timeout=30,
    )
    if response.status_code == 200:
        data = response.json()
        quotes = data.get("quotes", {})
        if "BTC/USD" in quotes and "ETH/USD" in quotes:
            print("SUCCESS: Fetched quotes for BTC/USD and ETH/USD")
            print(f"BTC/USD quote: {quotes['BTC/USD']}")
        else:
            print("FAILURE: Missing quotes for BTC/USD or ETH/USD")
            sys.exit(1)
    else:
        print(f"FAILURE: Status code {response.status_code}")
        print(response.text)
        sys.exit(1)


if __name__ == "__main__":
    try:
        test_crypto_bars()
        test_crypto_quotes()
        print("\nAll crypto tests passed!")
    except requests.exceptions.ConnectionError:
        print("FAILURE: Could not connect to the server. Make sure it is running.")
        sys.exit(1)
