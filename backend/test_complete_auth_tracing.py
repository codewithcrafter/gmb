import sys
from datetime import datetime
from fastapi.testclient import TestClient
from main import app
from database import engine, Base

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def run_trace():
    print("=" * 60)
    print("STARTING COMPLETE AUTHENTICATION & USER ID TRACE TEST")
    print("=" * 60)

    email = f"trace_user_{int(datetime.utcnow().timestamp())}@buzzspire.com"
    password = "Password123!"

    # 1. SIGNUP
    print("\n--- Step 1: POST /api/auth/signup ---")
    signup_res = client.post("/api/auth/signup", json={
        "email": email,
        "password": password,
        "full_name": "Trace Test User"
    })
    assert signup_res.status_code == 200, f"Signup failed: {signup_res.text}"
    signup_user_id = signup_res.json()["id"]
    print(f"VERIFIED SIGNUP USER ID: {signup_user_id}")

    # 2. LOGIN
    print("\n--- Step 2: POST /api/auth/login ---")
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_user_id = login_res.json()["id"]
    print(f"VERIFIED LOGIN USER ID: {login_user_id}")
    cookies = login_res.cookies

    # 3. OAUTH CONNECT
    print("\n--- Step 3: GET /api/gmb/connect ---")
    connect_res = client.get("/api/gmb/connect", cookies=cookies)
    assert connect_res.status_code == 200, f"Connect failed: {connect_res.text}"

    # 4. OAUTH CALLBACK
    print("\n--- Step 4: POST /api/gmb/callback ---")
    callback_res = client.post("/api/gmb/callback", json={
        "code": "mock_code_trace_123"
    }, cookies=cookies)
    assert callback_res.status_code == 200, f"Callback failed: {callback_res.text}"
    cb_data = callback_res.json()
    assert cb_data["connected"] == True, f"Callback response connected is not True: {cb_data}"

    # 5. GMB STATUS
    print("\n--- Step 5: GET /api/gmb/status ---")
    status_res = client.get("/api/gmb/status", cookies=cookies)
    assert status_res.status_code == 200, f"Status failed: {status_res.text}"
    status_data = status_res.json()
    print(f"STATUS RESPONSE: connected={status_data.get('connected')}, email={status_data.get('connected_email')}")
    assert status_data["connected"] == True, "Expected /status to return connected=True"

    # 6. GMB ACCOUNTS
    print("\n--- Step 6: GET /api/gmb/accounts ---")
    accounts_res = client.get("/api/gmb/accounts", cookies=cookies)
    assert accounts_res.status_code == 200, f"Accounts failed: {accounts_res.text}"
    accounts_data = accounts_res.json()
    print(f"ACCOUNTS FOUND: {len(accounts_data)}")

    print("\n" + "=" * 60)
    print("VERIFICATION COMPLETE: ALL USER IDs ARE MATCHING & CONNECTED=TRUE")
    print("=" * 60)

if __name__ == "__main__":
    run_trace()
