from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app
from database import engine, Base, SessionLocal
from models import GoogleConnection

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_milestone1_oauth_connection():
    print("=== Testing Milestone 1: Google OAuth Connection ===")

    # 1. Signup / Login User
    test_email = f"m1_owner_{int(datetime.utcnow().timestamp())}@buzzspire.com"
    signup_res = client.post("/api/auth/signup", json={
        "email": test_email,
        "password": "Password123!",
        "full_name": "Milestone 1 Owner"
    })
    print("1. Signup Status:", signup_res.status_code)

    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "Password123!"
    })
    print("2. Login Status:", login_res.status_code)
    assert login_res.status_code == 200


    # 3. GET /api/gmb/connect
    connect_res = client.get("/api/gmb/connect")
    print("3. GET /api/gmb/connect Status:", connect_res.status_code)
    assert connect_res.status_code == 200
    auth_data = connect_res.json()
    assert "auth_url" in auth_data
    print("   Auth URL:", auth_data["auth_url"])

    # 4. GET /api/gmb/status before connection
    status_before = client.get("/api/gmb/status")
    print("4. GET /api/gmb/status (Before Connection):", status_before.json())
    assert status_before.status_code == 200
    assert status_before.json()["connected"] == False

    # 5. Callback code exchange & token storage
    callback_res = client.post("/api/gmb/callback", json={
        "code": "mock_code_milestone1_99"
    })
    print("5. Callback Status:", callback_res.status_code)
    assert callback_res.status_code == 200
    cb_data = callback_res.json()
    print("   Callback Data:", cb_data)
    assert cb_data["connected"] == True
    assert "connectedEmail" in cb_data

    # 6. GET /api/gmb/status after connection
    status_after = client.get("/api/gmb/status")
    print("6. GET /api/gmb/status (After Connection):", status_after.json())
    assert status_after.status_code == 200
    st_data = status_after.json()
    assert st_data["connected"] == True
    assert st_data["connectedEmail"] is not None
    assert st_data["expiresAt"] is not None

    # 7. Test DB encryption verification
    db = SessionLocal()
    conn = db.query(GoogleConnection).first()
    print("7. DB Verification:")
    print("   - ID:", conn.id)
    print("   - Google Email:", conn.google_email)
    print("   - Encrypted Access Token (stored encrypted):", conn.access_token[:30] + "...")
    print("   - Encrypted Refresh Token (stored encrypted):", conn.refresh_token[:30] + "...")
    print("   - Token Expiry:", conn.token_expiry)
    assert conn.access_token != "mock_access_token"
    db.close()

    print("\nSUCCESS: Milestone 1 Google OAuth Connection completely verified!")

if __name__ == "__main__":
    test_milestone1_oauth_connection()
