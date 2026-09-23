from fastapi.testclient import TestClient
from main import app
from database import engine, Base

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_auth_and_gmb_connect_flow():
    print("=== Testing Auth and GMB Connect Flow ===")

    # 1. Login user
    email = "auth_test_user@buzzspire.com"
    signup_res = client.post("/api/auth/signup", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Auth Test User"
    })
    print("1. Signup Status:", signup_res.status_code)

    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    print("2. Login Status:", login_res.status_code)
    assert login_res.status_code == 200
    cookies = login_res.cookies
    print("   Cookies returned:", cookies.keys())
    assert "access_token" in cookies

    # 2. Test GET /api/auth/me with cookies
    me_res = client.get("/api/auth/me", cookies=cookies)
    print("3. GET /api/auth/me Status:", me_res.status_code)
    assert me_res.status_code == 200
    user_data = me_res.json()
    print("   User Email:", user_data["email"])
    assert user_data["email"] == email

    # 3. Test GET /api/gmb/connect with cookies
    connect_res = client.get("/api/gmb/connect", cookies=cookies)
    print("4. GET /api/gmb/connect Status:", connect_res.status_code)
    assert connect_res.status_code == 200
    connect_data = connect_res.json()
    print("   Auth URL returned:", connect_data.get("auth_url"))
    assert "auth_url" in connect_data

    # 4. Test GET /api/gmb/status with cookies
    status_res = client.get("/api/gmb/status", cookies=cookies)
    print("5. GET /api/gmb/status Status:", status_res.status_code)
    assert status_res.status_code == 200

    print("\nSUCCESS: All authentication and GMB connect endpoints verified!")

if __name__ == "__main__":
    test_auth_and_gmb_connect_flow()
