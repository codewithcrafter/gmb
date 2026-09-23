import json
from database import SessionLocal
from models import User, SelectedBusinessLocation
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token

def run():
    db = SessionLocal()
    target_email = "buzzspire.info@gmail.com"
    user = db.query(User).filter(User.email == target_email).first()
    
    token = create_access_token({"sub": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}
    
    client = TestClient(app)
    
    print("\n--- Testing GET /api/gmb/dashboard-data ---")
    resp = client.get("/api/gmb/dashboard-data", headers=headers)
    print(f"Status Code: {resp.status_code}")
    print(json.dumps(resp.json(), indent=2))
    
    print("\n--- Testing GET /api/gmb/accounts ---")
    resp_acc = client.get("/api/gmb/accounts", headers=headers)
    print(f"Status Code: {resp_acc.status_code}")
    print(json.dumps(resp_acc.json(), indent=2))
    
    print("\n--- Testing GET /api/gmb/status ---")
    resp_stat = client.get("/api/gmb/status", headers=headers)
    print(f"Status Code: {resp_stat.status_code}")
    print(json.dumps(resp_stat.json(), indent=2))
    
    db.close()

if __name__ == "__main__":
    run()
