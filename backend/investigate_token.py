import httpx
from database import SessionLocal
from models import User, GoogleConnection
from security_crypto import decrypt_token
import gmb_service

def run():
    db = SessionLocal()
    target_email = "buzzspire.info@gmail.com"
    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        print(f"User {target_email} not found.")
        return
        
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == user.id).first()
    if not conn:
        print(f"No connection found.")
        return
        
    access_token = decrypt_token(conn.access_token)
    
    print("\n--- Verifying Granted Scopes ---")
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?access_token={access_token}"
        resp = httpx.get(url)
        if resp.status_code == 200:
            data = resp.json()
            print("Token Info Success:")
            scopes = data.get("scope", "")
            print(f"Granted Scopes: {scopes}")
            if "https://www.googleapis.com/auth/business.manage" in scopes:
                print("-> business.manage IS present")
            else:
                print("-> business.manage is MISSING")
        else:
            print(f"Token Info Error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
