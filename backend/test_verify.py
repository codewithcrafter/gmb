import json
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
import gmb

def run():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "buzzspire.info@gmail.com").first()
        if not user:
            print("User not found.")
            return

        print("--- verify-real-data ---")
        try:
            verify_res = gmb.verify_real_data(db=db, current_user=user)
            print(json.dumps(verify_res, indent=2))
        except Exception as e:
            print(f"Error in verify_real_data: {e}")

        print("\n--- dashboard-data ---")
        try:
            dashboard_res = gmb.get_dashboard_data(db=db, current_user=user)
            print(json.dumps(dashboard_res, indent=2))
        except Exception as e:
            print(f"Error in dashboard-data: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    run()
