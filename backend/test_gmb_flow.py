from fastapi.testclient import TestClient
from main import app
from database import engine, Base

# Ensure all tables created
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_full_gmb_integration_flow():
    # 1. Signup user
    signup_res = client.post("/api/auth/signup", json={
        "email": "owner_gmb_test@buzzspire.com",
        "password": "Password123!",
        "full_name": "Dr. Sarah Owner"
    })
    print("1. Signup response status:", signup_res.status_code)
    assert signup_res.status_code in [200, 400]

    # Login to get cookies
    login_res = client.post("/api/auth/login", json={
        "email": "owner_gmb_test@buzzspire.com",
        "password": "Password123!"
    })
    print("2. Login response status:", login_res.status_code)
    assert login_res.status_code == 200

    # 3. Get OAuth URL
    auth_url_res = client.get("/api/gmb/auth-url")
    print("3. Auth URL status:", auth_url_res.status_code, "URL:", auth_url_res.json())
    assert auth_url_res.status_code == 200
    assert "auth_url" in auth_url_res.json()

    # 4. Callback with code
    callback_res = client.post("/api/gmb/callback", json={
        "code": "mock_code_test_12345"
    })
    print("4. Callback status:", callback_res.status_code)
    assert callback_res.status_code == 200
    cb_data = callback_res.json()
    assert cb_data["status"] == "connected"
    assert len(cb_data["available_locations"]) > 0

    target_loc = cb_data["available_locations"][0]["google_location_id"]

    # 5. Fetch available locations
    accounts_res = client.get("/api/gmb/accounts")
    print("5. Accounts status:", accounts_res.status_code)
    assert accounts_res.status_code == 200

    # 6. Select location & trigger sync
    select_res = client.post("/api/gmb/select-location", json={
        "google_location_id": target_loc
    })
    print("6. Select location status:", select_res.status_code, select_res.json().get("message"))
    assert select_res.status_code == 200

    # 7. Check GMB Status
    status_res = client.get("/api/gmb/status")
    print("7. GMB Status:", status_res.json())
    assert status_res.status_code == 200
    assert status_res.json()["connected"] == True
    assert status_res.json()["selected_location"] is not None

    # 8. Fetch Dashboard Live Data
    dash_res = client.get("/api/gmb/dashboard/data")
    print("8. Dashboard Data status:", dash_res.status_code)
    assert dash_res.status_code == 200

    dash_data = dash_res.json()
    print("   - Connected:", dash_data["connected"])
    print("   - Location Title:", dash_data["location"]["title"])
    print("   - Rating:", dash_data["metrics"]["average_rating"])
    print("   - Reviews Count:", len(dash_data["reviews"]))
    print("   - Posts Count:", len(dash_data["posts"]))

    print("\nSUCCESS: All GMB backend endpoints & database operations verified successfully!")

if __name__ == "__main__":
    test_full_gmb_integration_flow()
