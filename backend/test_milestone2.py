from datetime import datetime
from fastapi.testclient import TestClient
from main import app
from database import engine, Base, SessionLocal
from models import GoogleBusinessAccount, SelectedBusinessLocation

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_milestone2_accounts_and_locations():
    print("=== Testing Milestone 2: Accounts & Location Management ===")

    # 1. Signup and login
    email = f"m2_owner_{int(datetime.utcnow().timestamp())}@buzzspire.com"
    client.post("/api/auth/signup", json={"email": email, "password": "Password123!", "full_name": "Milestone 2 Owner"})
    login_res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    assert login_res.status_code == 200

    # 2. Connect OAuth token
    cb_res = client.post("/api/gmb/callback", json={"code": "mock_code_m2"})
    assert cb_res.status_code == 200
    print("2. Connected OAuth:", cb_res.json()["connected"])

    # 3. GET /api/gmb/accounts
    acc_res = client.get("/api/gmb/accounts")
    print("3. GET /api/gmb/accounts Status:", acc_res.status_code)
    assert acc_res.status_code == 200
    accounts = acc_res.json()
    print("   Accounts found:", len(accounts))
    assert len(accounts) >= 1
    acc_id = accounts[0]["accountId"]
    print("   First Account ID:", acc_id)

    # 4. GET /api/gmb/accounts/{accountId}/locations
    loc_res = client.get(f"/api/gmb/accounts/{acc_id}/locations")
    print("4. GET /api/gmb/accounts/{accountId}/locations Status:", loc_res.status_code)
    assert loc_res.status_code == 200
    locations = loc_res.json()
    print("   Locations found:", len(locations))
    assert len(locations) >= 1
    loc_id = locations[0]["locationId"]
    loc_name = locations[0]["businessName"]

    # 5. POST /api/gmb/select-location
    sel_res = client.post("/api/gmb/select-location", json={
        "account_id": acc_id,
        "location_id": loc_id,
        "location_name": loc_name,
        "address": locations[0]["address"],
        "primary_category": locations[0]["primaryCategory"]
    })
    print("5. POST /api/gmb/select-location Status:", sel_res.status_code)
    assert sel_res.status_code == 200
    sel_data = sel_res.json()
    assert sel_data["status"] == "success"
    assert sel_data["selected"]["location_id"] == loc_id

    # 6. GET /api/gmb/current-location
    curr_res = client.get("/api/gmb/current-location")
    print("6. GET /api/gmb/current-location Status:", curr_res.status_code)
    assert curr_res.status_code == 200
    curr_data = curr_res.json()
    assert curr_data["selected"] is not None
    assert curr_data["selected"]["location_id"] == loc_id

    # 7. POST /api/gmb/disconnect
    disc_res = client.post("/api/gmb/disconnect")
    print("7. POST /api/gmb/disconnect Status:", disc_res.status_code)
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "disconnected"

    # Verify disconnect clears current-location
    curr_res_after = client.get("/api/gmb/current-location")
    assert curr_res_after.json()["selected"] is None

    print("\nSUCCESS: Milestone 2 Backend Accounts & Locations completely verified!")

if __name__ == "__main__":
    test_milestone2_accounts_and_locations()
