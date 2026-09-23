import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app
from database import engine, Base, SessionLocal
from models import GoogleConnection, User
from security_crypto import encrypt_token, decrypt_token
import gmb_service

Base.metadata.create_all(bind=engine)
client = TestClient(app, follow_redirects=False)

def run_proof():
    print("=" * 70)
    print("PROVING FIXED GOOGLE OAUTH REDIRECT URI & CALLBACK FLOW")
    print("=" * 70)

    # Step 1: User Signup & Login
    email = f"redirect_fix_owner_{int(datetime.utcnow().timestamp())}@buzzspire.com"
    password = "Password123!"

    print("\n1. USER AUTHENTICATION")
    signup_res = client.post("/api/auth/signup", json={"email": email, "password": password, "full_name": "OAuth Owner"})
    assert signup_res.status_code == 200, f"Signup failed: {signup_res.text}"
    user_id = signup_res.json()["id"]
    print(f"   - Authenticated User ID: {user_id}")
    print(f"   - Authenticated User Email: {email}")

    login_res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    cookies = login_res.cookies

    # Step 2: Generate Google Authorization URL
    print("\n2. GENERATE GOOGLE AUTHORIZATION URL (GET /api/gmb/connect)")
    connect_res = client.get("/api/gmb/connect", cookies=cookies)
    assert connect_res.status_code == 200, f"Connect failed: {connect_res.text}"
    auth_url = connect_res.json()["auth_url"]
    print(f"   - Generated Authorization URL: {auth_url}")
    assert "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fgmb%2Fcallback" in auth_url, "Redirect URI in auth_url is incorrect!"
    print("   - Verified Redirect URI in Auth URL: http://localhost:8000/api/gmb/callback")

    # Step 3: Simulate Google Redirecting Browser to Backend Callback Endpoint
    print("\n3. GOOGLE REDIRECT TO BACKEND CALLBACK (GET /api/gmb/callback)")
    mock_google_code = "4/0AX4XfWh_real_google_auth_code_sample_12345"
    callback_url_received = f"http://localhost:8000/api/gmb/callback?code={mock_google_code}&state=gmb_oauth"
    print(f"   - Callback URL Received: {callback_url_received}")

    # Temporary patch gmb_service.exchange_code_for_tokens to simulate Google returning valid tokens for valid code
    original_exchange = gmb_service.exchange_code_for_tokens
    def mock_google_token_endpoint(code, redirect_uri=None):
        return {
            "access_token": "ya29.a0ARW5m77_real_google_access_token_sample",
            "refresh_token": "1//04_real_google_refresh_token_sample",
            "expires_in": 3600
        }
    gmb_service.exchange_code_for_tokens = mock_google_token_endpoint

    try:
        cb_res = client.get(f"/api/gmb/callback?code={mock_google_code}&state=gmb_oauth", cookies=cookies)
        print(f"   - Backend Callback HTTP Response Status: {cb_res.status_code}")
        print(f"   - Redirect Location Header: {cb_res.headers.get('location')}")
        assert cb_res.status_code in [302, 307], f"Expected redirect response from GET /api/gmb/callback, got {cb_res.status_code}"
        assert cb_res.headers.get("location") == "http://localhost:3000/dashboard?status=connected"
        print("   - Successfully redirected browser to frontend dashboard with status=connected!")
    finally:
        gmb_service.exchange_code_for_tokens = original_exchange

    # Step 4: Verify Database Connection Record Insert / Update
    print("\n4. DATABASE VERIFICATION (GoogleConnection Table)")
    db = SessionLocal()
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == user_id).first()
    assert conn is not None, "GoogleConnection record was not found in DB!"
    decrypted_access = decrypt_token(conn.access_token)
    decrypted_refresh = decrypt_token(conn.refresh_token)
    print(f"   - GoogleConnection ID: {conn.id}")
    print(f"   - User ID: {conn.user_id}")
    print(f"   - Connected Google Email: {conn.google_email}")
    print(f"   - Access Token Stored (Decrypted): {decrypted_access[:15]}...")
    print(f"   - Refresh Token Stored (Decrypted): {decrypted_refresh[:10]}...")
    print(f"   - Token Expiry: {conn.token_expiry}")
    db.close()

    # Step 5: Verify GET /api/gmb/status
    print("\n5. VERIFY GET /api/gmb/status ENDPOINT")
    status_res = client.get("/api/gmb/status", cookies=cookies)
    assert status_res.status_code == 200, f"Status failed: {status_res.text}"
    status_data = status_res.json()
    print(f"   - Connected Status: {status_data['connected']}")
    print(f"   - Connected Email: {status_data['connected_email']}")
    assert status_data["connected"] == True, "Expected GET /api/gmb/status to return connected=True"

    # Step 6: Verify GET /api/gmb/accounts
    print("\n6. VERIFY GET /api/gmb/accounts ENDPOINT")
    accounts_res = client.get("/api/gmb/accounts", cookies=cookies)
    assert accounts_res.status_code == 200, f"Accounts failed: {accounts_res.text}"
    accounts_data = accounts_res.json()
    print(f"   - Accounts Returned Count: {len(accounts_data)}")
    print(f"   - First Account Name: {accounts_data[0]['accountName']}")
    assert len(accounts_data) > 0, "Expected accounts list to be non-empty"

    print("\n" + "=" * 70)
    print("PROOF SUCCESSFUL: ALL ENDPOINTS & DATABASE OPERATIONS VERIFIED!")
    print("=" * 70)

if __name__ == "__main__":
    run_proof()
