import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app
from security import create_access_token, create_refresh_token

client = TestClient(app)

def run_investigation():
    print("=" * 70)
    print("INVESTIGATING AUTHENTICATION DIFFERENCES BETWEEN ENDPOINTS & CLIENTS")
    print("=" * 70)

    # 1. Login user
    email = f"auth_investigate_{int(datetime.utcnow().timestamp())}@buzzspire.com"
    signup_res = client.post("/api/auth/signup", json={"email": email, "password": "Password123!"})
    login_res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    cookies = login_res.cookies

    # Create explicit Bearer token
    access_token = create_access_token({"sub": signup_res.json()["id"]})
    bearer_headers = {"Authorization": f"Bearer {access_token}"}

    # TEST SCENARIO A: Request without Cookies or Headers (Swagger UI default without auth)
    print("\n--- SCENARIO A: Unauthenticated Request (e.g. Swagger /docs without Authorize button) ---")
    swagger_res_status = client.get("/api/gmb/status")
    print(f"Status Endpoint Code: {swagger_res_status.status_code}, Body: {swagger_res_status.json()}")
    swagger_res_accounts = client.get("/api/gmb/accounts")
    print(f"Accounts Endpoint Code: {swagger_res_accounts.status_code}, Body: {swagger_res_accounts.json()}")

    # TEST SCENARIO B: Request with Bearer Token in Authorization Header (Swagger UI with Authorize)
    print("\n--- SCENARIO B: Authorization Header Request (e.g. Swagger with Bearer Token) ---")
    header_res_status = client.get("/api/gmb/status", headers=bearer_headers)
    print(f"Status Endpoint Code: {header_res_status.status_code}")
    header_res_accounts = client.get("/api/gmb/accounts", headers=bearer_headers)
    print(f"Accounts Endpoint Code: {header_res_accounts.status_code}, Accounts Count: {len(header_res_accounts.json()) if header_res_accounts.status_code == 200 else 0}")

    # TEST SCENARIO C: Request with HttpOnly Cookies (Frontend credentials: "include")
    print("\n--- SCENARIO C: HttpOnly Cookie Request (Frontend credentials: 'include') ---")
    # First callback to connect OAuth
    cb_res = client.post("/api/gmb/callback", json={"code": "mock_code_investigate"}, cookies=cookies)
    cookie_res_status = client.get("/api/gmb/status", cookies=cookies)
    print(f"Status Endpoint Code: {cookie_res_status.status_code}, Connected: {cookie_res_status.json().get('connected')}")
    cookie_res_accounts = client.get("/api/gmb/accounts", cookies=cookies)
    print(f"Accounts Endpoint Code: {cookie_res_accounts.status_code}, Accounts Count: {len(cookie_res_accounts.json()) if cookie_res_accounts.status_code == 200 else 0}")

    print("\n" + "=" * 70)
    print("INVESTIGATION COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    run_investigation()
