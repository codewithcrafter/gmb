import requests
import json
from auth import create_access_token
from database import SessionLocal
from models import User

def run():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "buzzspire.info@gmail.com").first()
    db.close()
    
    if not user:
        print("User not found")
        return
        
    token = create_access_token({"sub": user.email, "id": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Fetching /api/gmb/dashboard-data via HTTP...")
    resp = requests.get("http://localhost:8000/api/gmb/dashboard-data", headers=headers)
    print(f"Status Code: {resp.status_code}")
    print("Response JSON:")
    print(json.dumps(resp.json(), indent=2))

if __name__ == "__main__":
    run()
