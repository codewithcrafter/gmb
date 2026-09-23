import json
from datetime import datetime
from database import SessionLocal
from models import User, GoogleConnection, GoogleBusinessAccount, SelectedBusinessLocation
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
        print(f"No GoogleConnection for {target_email}.")
        return
        
    print(f"Using conn for user: {conn.user_id}, Email: {conn.google_email}")
    try:
        access_token = decrypt_token(conn.access_token)
        print(f"Token Expiry: {conn.token_expiry}, Current Time: {datetime.utcnow()}")
        
        # Force refresh if needed
        if conn.token_expiry and conn.token_expiry < datetime.utcnow():
            print("Token expired. Refreshing...")
            access_token = gmb_service.refresh_google_access_token(conn, db)
            print("Token refreshed successfully.")
    except Exception as e:
        print(f"Error decrypting or refreshing token: {e}")
        return

    print("\n--- Testing gmb_service.fetch_google_business_accounts ---")
    try:
        accounts = gmb_service.fetch_google_business_accounts(access_token)
        print(json.dumps(accounts, indent=2))
        
        if accounts and 'accountId' in accounts[0]:
            acc_id = accounts[0]['accountId']
            print(f"\n--- Testing fetch_google_locations_for_account({acc_id}) ---")
            locations = gmb_service.fetch_google_locations_for_account(access_token, acc_id)
            print(json.dumps(locations, indent=2))
            
            # Let's get the selected location from DB
            sel_loc = db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == user.id).first()
            if sel_loc:
                loc_id = sel_loc.location_id
                acc_id_db = sel_loc.account_id
                
                print(f"\n--- Testing fetch_real_performance({loc_id}) ---")
                try:
                    perf = gmb_service.fetch_real_performance(access_token, loc_id)
                    print(json.dumps(perf, indent=2))
                except Exception as e:
                    print(f"Error perf: {e}")

                print(f"\n--- Testing fetch_real_reviews({acc_id_db}, {loc_id}) ---")
                try:
                    reviews = gmb_service.fetch_real_reviews(access_token, acc_id_db, loc_id)
                    print(json.dumps(reviews, indent=2))
                except Exception as e:
                    print(f"Error reviews: {e}")
                    
    except Exception as e:
        print(f"Top level API error: {e}")

if __name__ == "__main__":
    run()
