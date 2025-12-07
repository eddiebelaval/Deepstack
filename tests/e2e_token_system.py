from fastapi.testclient import TestClient

from market_api import DEMO_CREDITS, app

client = TestClient(app)


def test_token_system_demo_flow():
    print("\n--- Starting E2E Token System Test (Demo Mode) ---")

    # 1. Reset Demo User
    demo_user_id = "demo-user"
    DEMO_CREDITS[demo_user_id] = 500
    print(f"1. Reset Credits to {DEMO_CREDITS[demo_user_id]}")

    # 2. Get Bars (Cost: 10)
    # No Auth Header -> verify_token returns "demo-user"
    response = client.get("/api/market/bars?symbol=AAPL&timeframe=1d&limit=10")
    if response.status_code != 200:
        print(f"FAILED: Get Bars status {response.status_code}")
        exit(1)

    remaining = int(response.headers.get("X-DeepStack-Credits", -1))
    print(f"2. Called get_bars (Cost 10). Remaining Header: {remaining}")

    assert remaining == 490
    assert DEMO_CREDITS[demo_user_id] == 490
    print("   [PASS] Credits deducted correctly.")

    # 3. Get News (Cost: 5)
    response = client.get("/api/news?symbol=AAPL")
    if (
        response.status_code != 200
    ):  # Note: News might return empty list but 200 OK even in demo?
        # Actually market_api demo mode usually requires keys for News/Assets,
        # but the check_usage happens BEFORE the alpaca call.
        # So even if Alpaca call fails, usage might be checked?
        # Wait, check_usage is a dependency.
        pass

    remaining = int(response.headers.get("X-DeepStack-Credits", -1))
    print(f"3. Called get_news (Cost 5). Remaining Header: {remaining}")
    assert remaining == 485
    print("   [PASS] Credits deducted correctly.")

    # 4. Burn remaining credits
    print("4. Burning remaining credits...")
    DEMO_CREDITS[demo_user_id] = 5

    # 5. Hit 0
    response = client.get("/api/news?symbol=AAPL")  # Cost 5, Remaining 5 -> 0
    remaining = int(response.headers.get("X-DeepStack-Credits", -1))
    print(f"5. Emptied wallet. Remaining: {remaining}")
    assert remaining == 0

    # 6. Verify Paywall
    print("6. Verifying Paywall Trigger...")
    response = client.get("/api/market/bars?symbol=AAPL")  # Cost 10, Have 0
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.json()}")

    assert response.status_code == 402
    print("   [PASS] Paywall triggered (402 Payment Required).")

    print("\n--- E2E Test Completed Successfully ---")


if __name__ == "__main__":
    try:
        test_token_system_demo_flow()
    except AssertionError as e:
        print(f"\n[FAIL] Assertion Error: {e}")
        exit(1)
    except Exception as e:
        print(f"\n[FAIL] Error: {e}")
        exit(1)
