import sys
from datetime import datetime
from fastapi.testclient import TestClient
from main import app
import gmb_service

client = TestClient(app)

def run_verification():
    print("=" * 70)
    print("VERIFYING POST /api/auth/login RESPONSE HEADERS & COOKIES")
    print("=" * 70)

    # 1. Signup & Login
    email = f"cookie_proof_owner_{int(datetime.utcnow().timestamp())}@buzzspire.com"
    password = "Password123!"

    print("\n--- STEP 1: POST /api/auth/signup ---")
    signup_res = client.post("/api/auth/signup", json={"email": email, "password": password, "full_name": "Cookie Proof Owner"})
    print(f"Signup Status: {signup_res.status_code}")

    print("\n--- STEP 2: POST /api/auth/login ---")
    login_res = client.post("/api/auth/login", json={"email": email, "password": password})
    print(f"Login Response Status: {login_res.status_code}")
    print("\n--- EXPLICIT RESPONSE HEADERS FROM POST /api/auth/login ---")
    for key, val in login_res.headers.items():
        print(f"  {key}: {val}")

    print("\n--- SET-COOKIE HEADER VALUE ---")
    set_cookie_val = login_res.headers.get("set-cookie")
    print(f"Set-Cookie: {set_cookie_val}")
    assert set_cookie_val is not None, "Set-Cookie header missing!"
    assert "access_token=" in set_cookie_val, "access_token cookie missing!"
    assert "refresh_token=" in set_cookie_val, "refresh_token cookie missing!"

    print("\n--- RESPONSE BODY FROM POST /api/auth/login ---")
    body = login_res.json()
    print(f"Body JSON: {body}")
    assert "access_token" in body, "access_token field missing in response body!"
    assert "refresh_token" in body, "refresh_token field missing in response body!"
    assert body["token_type"] == "bearer"

    cookies = login_res.cookies

    # Step 3: Mock Google token exchange & accounts API for end-to-end 200 OK proof
    original_exchange = gmb_service.exchange_code_for_tokens
    original_accounts = gmb_service.fetch_google_business_accounts

    def mock_token_func(code, redirect_uri=None):
        return {
            "access_token": "ya29.mock_token_sample",
            "refresh_token": "1//mock_refresh_sample",
            "expires_in": 3600
        }

    def mock_accounts_func(access_token):
        return [
            {
                "accountId": "10987654321",
                "accountName": "BuzzSpire Local HQ",
                "type": "LOCATION_GROUP",
                "role": "OWNER",
                "state": "UNVERIFIED"
            }
        ]

    gmb_service.exchange_code_for_tokens = mock_token_func
    gmb_service.fetch_google_business_accounts = mock_accounts_func

    try:
        print("\n--- STEP 3: Connect OAuth Callback ---")
        cb_res = client.post("/api/gmb/callback", json={"code": "4/0AX4XfWh_sample_code"}, cookies=cookies)
        print(f"Callback status: {cb_res.status_code}")
        assert cb_res.status_code == 200

        print("\n--- STEP 4: GET /api/gmb/accounts WITH COOKIE AUTHENTICATION ---")
        accounts_res = client.get("/api/gmb/accounts", cookies=cookies)
        print(f"Accounts Endpoint Status: {accounts_res.status_code}")
        assert accounts_res.status_code == 200, f"Expected 200 OK, got {accounts_res.status_code}: {accounts_res.text}"
        accounts_data = accounts_res.json()
        print(f"Accounts Count Returned: {len(accounts_data)}")
        print(f"Returned Accounts Data: {accounts_data}")

        print("\n--- STEP 5: GET /api/gmb/accounts WITH BEARER HEADER AUTHENTICATION ---")
        bearer_headers = {"Authorization": f"Bearer {body['access_token']}"}
        swagger_accounts_res = client.get("/api/gmb/accounts", headers=bearer_headers)
        print(f"Swagger Bearer Header Accounts Endpoint Status: {swagger_accounts_res.status_code}")
        assert swagger_accounts_res.status_code == 200
        print(f"Swagger Returned Accounts Data: {swagger_accounts_res.json()}")

    finally:
        gmb_service.exchange_code_for_tokens = original_exchange
        gmb_service.fetch_google_business_accounts = original_accounts

    print("\n" + "=" * 70)
    print("PROVED: COOKIES PRESENT IN HEADERS & GET /api/gmb/accounts RETURNS 200 OK")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
