from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, GoogleConnection, GoogleBusinessAccount, SelectedBusinessLocation
from auth import get_current_user, get_optional_current_user
from security_crypto import encrypt_token, decrypt_token
import gmb_service

router = APIRouter(prefix="/api/gmb", tags=["Google Business Profile - Milestone 2"])

class CallbackRequest(BaseModel):
    code: str

class SelectLocationRequest(BaseModel):
    account_id: str
    location_id: str
    location_name: Optional[str] = None
    address: Optional[str] = None
    primary_category: Optional[str] = None

class CreatePostRequest(BaseModel):
    summary: str
    topic_type: str = "STANDARD"
    call_to_action: Optional[dict] = None
    media_url: Optional[str] = None
    scheduled_time: Optional[str] = None

class UpdatePostRequest(BaseModel):
    summary: str
    topic_type: str = "STANDARD"
    call_to_action: Optional[dict] = None
    media_url: Optional[str] = None
    scheduled_time: Optional[str] = None

@router.get("/connect")
def connect_google_oauth(
    redirect_uri: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/gmb/connect
    Starts the Google OAuth 2.0 flow by generating the authorization URL.
    Returns auth URL or redirects.
    """
    print(f"CONNECT USER ID: {current_user.id}")
    auth_url = gmb_service.get_google_auth_url(redirect_uri=redirect_uri)
    return {"auth_url": auth_url}


@router.get("/callback")
def handle_oauth_callback_get(
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    GET /api/gmb/callback
    Exchanges code for tokens, retrieves Google email, encrypts tokens,
    links to user in database, and redirects back to dashboard.
    """
    if state == "sso_login":
        return _process_sso_login(code, db)

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    print(f"[OAUTH GET CALLBACK] Executing for current_user.id={current_user.id}")
    return _process_oauth_callback(code, db, current_user)

@router.post("/callback")
def handle_oauth_callback_post(
    req: CallbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    POST /api/gmb/callback (Frontend JSON fetch support)
    Exchanges code for tokens, retrieves Google email, encrypts tokens,
    links to user in database, and returns JSON payload.
    """
    print(f"[OAUTH POST CALLBACK] Executing for current_user.id={current_user.id}")
    result = _process_oauth_callback(req.code, db, current_user, redirect=False)
    return result

def _process_sso_login(code: str, db: Session):
    import httpx
    from auth import set_auth_cookies
    from security import create_access_token, create_refresh_token
    
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authorization code is missing.")

    # 1. Exchange code for tokens
    try:
        tokens = gmb_service.exchange_code_for_tokens(code)
    except Exception as e:
        print(f"[SSO LOGIN] Token exchange failed: {e}")
        raise HTTPException(status_code=400, detail="Google authentication failed.")

    access_token = tokens.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to retrieve access token.")
    
    # 2. Get user info
    email = None
    full_name = None
    avatar_url = None
    google_id = None
    
    try:
        url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                email = data.get("email")
                full_name = data.get("name")
                avatar_url = data.get("picture")
                google_id = data.get("sub")
    except Exception as e:
        print(f"[SSO LOGIN] Error fetching Google user info: {e}")
        raise HTTPException(status_code=400, detail="Failed to fetch user info from Google.")

    if not email:
        raise HTTPException(status_code=400, detail="Google account did not provide an email.")
        
    # 3. Find or create user
    user = db.query(User).filter(
        (User.google_id == google_id) | (User.email == email.lower())
    ).first()
    
    if user:
        updated = False
        if not user.google_id and google_id:
            user.google_id = google_id
            updated = True
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
            updated = True
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            updated = True
        if updated:
            db.commit()
            db.refresh(user)
    else:
        user = User(
            email=email.lower(),
            google_id=google_id,
            full_name=full_name or email.split("@")[0].capitalize(),
            avatar_url=avatar_url,
            hashed_password=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # 4. Generate JWT
    jwt_access_token = create_access_token({"sub": user.id})
    jwt_refresh_token = create_refresh_token({"sub": user.id}, remember_me=True)
    
    # 5. Set cookies and redirect
    import os
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    response = RedirectResponse(url=f"{frontend_url}/dashboard")
    set_auth_cookies(response, jwt_access_token, jwt_refresh_token, remember_me=True)
    return response


class ReviewGenerateRequest(BaseModel):
    review_text: str
    star_rating: int = 5
    reviewer_name: str = "Customer"
    business_name: str = "Our Business"

@router.post("/reviews/{review_id}/generate-reply")
def generate_ai_reply(
    review_id: str,
    request: ReviewGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Just need to check user exists, which Depends(get_current_user) does.
    from agents import review_agent
    try:
        state = review_agent.invoke({
            "review_text": request.review_text,
            "star_rating": request.star_rating,
            "reviewer_name": request.reviewer_name,
            "business_name": request.business_name,
            "tone": "Professional"
        })
        return {
            "success": True,
            "sentiment": state["sentiment"],
            "reply": state["reply_draft"]
        }
    except RuntimeError as e:
        if str(e) == "AI_NOT_CONFIGURED":
            return {"success": False, "error": "AI reply generation is unavailable because GOOGLE_API_KEY is not configured."}
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": str(e)}

class ReviewReplyRequest(BaseModel):
    reply_text: str

@router.post("/reviews/{review_id}/reply")
def reply_to_review(
    review_id: str,
    request: ReviewReplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn or not conn.access_token:
        raise HTTPException(status_code=401, detail="No Google account connected.")
    
    sel_rec = db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == current_user.id).first()
    if not sel_rec:
        raise HTTPException(status_code=400, detail="No location selected.")
        
    access_token = decrypt_token(conn.access_token)
    res = gmb_service.reply_to_google_review(
        access_token, sel_rec.account_id, sel_rec.location_id, review_id, request.reply_text
    )
    if res.get("status") == "error":
        raise HTTPException(status_code=res.get("http_status", 500), detail=res.get("message"))
    return res

class CreatePostRequest(BaseModel):
    summary: str
    call_to_action: Optional[dict] = None

@router.post("/posts/create")
def create_post(
    request: CreatePostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn or not conn.access_token:
        raise HTTPException(status_code=401, detail="No Google account connected.")
    
    sel_rec = db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == current_user.id).first()
    if not sel_rec:
        raise HTTPException(status_code=400, detail="No location selected.")
        
    access_token = decrypt_token(conn.access_token)
    res = gmb_service.create_google_post(
        access_token, sel_rec.account_id, sel_rec.location_id, request.summary, request.call_to_action
    )
    if res.get("status") == "error":
        raise HTTPException(status_code=res.get("http_status", 500), detail=res.get("message"))
    return res

def _process_oauth_callback(code: str, db: Session, current_user: User, redirect: bool = True):
    import os
    from database import DATABASE_URL, engine

    db_path = os.path.abspath("buzzspire.db") if "sqlite" in str(engine.url) else str(engine.url)
    print(f"[OAUTH CALLBACK ENTRY] user_id={current_user.id}, email={current_user.email}")
    print(f"[OAUTH CALLBACK DB] DATABASE_URL={DATABASE_URL}, engine.url={engine.url}, abs_path={db_path}, cwd={os.getcwd()}")

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code is missing."
        )

    # 1. Exchange code for tokens (with code reuse safety guard)
    try:
        tokens = gmb_service.exchange_code_for_tokens(code)
    except Exception as e:
        print(f"[OAUTH CALLBACK ERROR] Code exchange exception ({e}) for user_id={current_user.id}")
        if redirect:
            return RedirectResponse(url="http://localhost:3000/dashboard?status=error&error=exchange_failed")
        raise HTTPException(status_code=400, detail="Google OAuth token exchange failed.")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)

    scopes = tokens.get("scope", "")
    print(f"[OAUTH] Granted scopes: {scopes}")

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to retrieve access token from Google."
        )

    if "https://www.googleapis.com/auth/business.manage" not in scopes:
        print("[OAUTH CALLBACK WARNING] Required 'business.manage' scope is missing.")
        if redirect:
            return RedirectResponse(url="http://localhost:3000/dashboard?status=error&error=missing_scopes")
        raise HTTPException(status_code=403, detail="Required Google Business Profile permissions were not granted.")

    # 2. Retrieve connected Google email
    google_email = gmb_service.fetch_google_user_email(access_token)

    # 3. Encrypt access & refresh tokens
    encrypted_access = encrypt_token(access_token)
    encrypted_refresh = encrypt_token(refresh_token) if refresh_token else None
    token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)

    print(f"[BEFORE COMMIT] user_id={current_user.id}, google_email={google_email}, access_token_exists={bool(encrypted_access)}, refresh_token_exists={bool(encrypted_refresh)}, token_expiry={token_expiry}")

    # 4. Upsert connection in database
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn:
        conn = GoogleConnection(
            user_id=current_user.id,
            google_email=google_email,
            access_token=encrypted_access,
            refresh_token=encrypted_refresh,
            token_expiry=token_expiry
        )
        db.add(conn)
    else:
        conn.google_email = google_email
        conn.access_token = encrypted_access
        if encrypted_refresh:
            conn.refresh_token = encrypted_refresh
        conn.token_expiry = token_expiry

    db.commit()
    db.refresh(conn)

    # 5. Immediate re-query verification after commit
    conn_verify = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    
    print(f"CALLBACK USER ID: {current_user.id}")
    print(f"GOOGLE EMAIL: {google_email}")
    print(f"TOKEN SAVED: {bool(encrypted_access)}")
    print(f"DATABASE COMMIT SUCCESS: True")
    print(f"ROW EXISTS AFTER COMMIT: {bool(conn_verify)}")

    if redirect:
        return RedirectResponse(url="http://localhost:3000/dashboard?status=connected")

    return {
        "connected": True,
        "connected_email": conn.google_email,
        "connectedEmail": conn.google_email,
        "expires_at": conn.token_expiry.isoformat() if conn.token_expiry else None,
        "expiresAt": conn.token_expiry.isoformat() if conn.token_expiry else None,
        "message": "Google Business account connected successfully."
    }

@router.get("/status")
def get_gmb_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/gmb/status
    Returns Google Business Profile connection status for the authenticated user.
    Requires no parameters.
    """
    import os
    from database import DATABASE_URL, engine
    db_path = os.path.abspath("buzzspire.db") if "sqlite" in str(engine.url) else str(engine.url)

    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    
    print(f"STATUS USER ID: {current_user.id}")
    print(f"DATABASE RECORD FOUND: {bool(conn)}")
    print(f"GOOGLE EMAIL: {conn.google_email if conn else None}")
    print(f"CONNECTED: {bool(conn and conn.access_token)}")


    if not conn or not conn.access_token:
        return {
            "connected": False,
            "connected_email": None,
            "connectedEmail": None,
            "expires_at": None,
            "expiresAt": None,
            "account_count": 0,
            "selected_location": None
        }

    # Auto token refresh check
    if conn.token_expiry and conn.token_expiry < datetime.utcnow():
        gmb_service.refresh_google_access_token(conn, db)

    # Fetch account count
    acc_count = db.query(GoogleBusinessAccount).filter(GoogleBusinessAccount.user_id == current_user.id).count()

    # Fetch selected location
    sel_loc = db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == current_user.id).first()

    selected_loc_dict = None
    if sel_loc:
        selected_loc_dict = {
            "id": sel_loc.id,
            "user_id": sel_loc.user_id,
            "account_id": sel_loc.account_id,
            "location_id": sel_loc.location_id,
            "location_name": sel_loc.location_name,
            "address": sel_loc.address,
            "primary_category": sel_loc.primary_category,
            "verification_state": sel_loc.verification_state
        }

    email_val = conn.google_email
    expiry_val = conn.token_expiry.isoformat() if conn.token_expiry else None

    return {
        "connected": True,
        "connected_email": email_val,
        "connectedEmail": email_val,
        "expires_at": expiry_val,
        "expiresAt": expiry_val,
        "account_count": acc_count,
        "selected_location": selected_loc_dict
    }


@router.get("/accounts")
def get_google_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/gmb/accounts
    Fetch all Google Business Accounts associated with connected Google account.
    Returns: [{ accountId, accountName, accountType }]
    """
    print(f"ACCOUNTS USER ID: {current_user.id}")
    print(f"[ACCOUNTS ENDPOINT] current_user.id={current_user.id}, email={current_user.email}")
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    print(f"[ACCOUNTS ENDPOINT DB QUERY] user_id={current_user.id}, conn_found={bool(conn)}")

    if not conn or not conn.access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Business Profile is not connected."
        )

    access_token = decrypt_token(conn.access_token)
    if conn.token_expiry and conn.token_expiry < datetime.utcnow():
        access_token = gmb_service.refresh_google_access_token(conn, db)

    accounts = gmb_service.fetch_google_business_accounts(access_token)

    for acc in accounts:
        acc_rec = db.query(GoogleBusinessAccount).filter(
            GoogleBusinessAccount.user_id == current_user.id,
            GoogleBusinessAccount.google_account_id == acc["accountId"]
        ).first()
        if not acc_rec:
            acc_rec = GoogleBusinessAccount(
                user_id=current_user.id,
                google_account_id=acc["accountId"],
                account_name=acc["accountName"],
                account_type=acc.get("accountType", "PERSONAL")
            )
            db.add(acc_rec)
        else:
            acc_rec.account_name = acc["accountName"]
            acc_rec.account_type = acc.get("accountType", "PERSONAL")
    db.commit()

    return accounts


@router.get("/accounts/{account_id:path}/locations")

def get_account_locations(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    """
    GET /api/gmb/accounts/{accountId}/locations
    Fetch all Business Profile locations under the selected account.
    Returns:
    [{ locationId, locationName, businessName, address, category, phone, website, verificationState }]
    """

    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn or not conn.access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Business Profile is not connected."
        )

    access_token = decrypt_token(conn.access_token)
    if conn.token_expiry and conn.token_expiry < datetime.utcnow():
        access_token = gmb_service.refresh_google_access_token(conn, db)

    locations = gmb_service.fetch_google_locations_for_account(access_token, account_id)
    return locations


@router.post("/select-location")
def select_business_location(
    req: SelectLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    POST /api/gmb/select-location
    Saves the selected location for the logged-in user.
    Persists: user_id, account_id, location_id, location_name
    """
    sel_rec = db.query(SelectedBusinessLocation).filter(
        SelectedBusinessLocation.user_id == current_user.id
    ).first()

    if not sel_rec:
        sel_rec = SelectedBusinessLocation(
            user_id=current_user.id,
            account_id=req.account_id,
            location_id=req.location_id,
            location_name=req.location_name or req.location_id,
            address=req.address,
            primary_category=req.primary_category,
            verification_state="VERIFIED"
        )
        db.add(sel_rec)
    else:
        sel_rec.account_id = req.account_id
        sel_rec.location_id = req.location_id
        sel_rec.location_name = req.location_name or req.location_id
        if req.address:
            sel_rec.address = req.address
        if req.primary_category:
            sel_rec.primary_category = req.primary_category

    db.commit()
    db.refresh(sel_rec)

    return {
        "status": "success",
        "message": "Business location selected successfully.",
        "selected": {
            "id": sel_rec.id,
            "user_id": sel_rec.user_id,
            "account_id": sel_rec.account_id,
            "location_id": sel_rec.location_id,
            "location_name": sel_rec.location_name,
            "address": sel_rec.address,
            "primary_category": sel_rec.primary_category,
            "verification_state": sel_rec.verification_state
        }
    }


@router.get("/current-location")
def get_current_business_location(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/gmb/current-location
    Returns the user's currently selected location.
    """
    sel_rec = db.query(SelectedBusinessLocation).filter(
        SelectedBusinessLocation.user_id == current_user.id
    ).first()

    if not sel_rec:
        return {"selected": None}

    return {
        "selected": {
            "id": sel_rec.id,
            "user_id": sel_rec.user_id,
            "account_id": sel_rec.account_id,
            "location_id": sel_rec.location_id,
            "location_name": sel_rec.location_name,
            "address": sel_rec.address,
            "primary_category": sel_rec.primary_category,
            "verification_state": sel_rec.verification_state,
            "updated_at": sel_rec.updated_at.isoformat() if sel_rec.updated_at else None
        }
    }


@router.post("/disconnect")
def disconnect_google_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    POST /api/gmb/disconnect
    Disconnects Google account and clears stored tokens and selections.
    """
    db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).delete()
    db.query(GoogleBusinessAccount).filter(GoogleBusinessAccount.user_id == current_user.id).delete()
    db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == current_user.id).delete()
    db.commit()

    return {
        "status": "disconnected",
        "message": "Google Business account disconnected successfully."
    }

@router.get("/dashboard-data")
def get_dashboard_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sel_rec = db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == current_user.id).first()
    if not sel_rec:
        return {"status": "NOT_AUTHORIZED", "detail": "No location selected."}

    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn or not conn.access_token:
        return {"status": "NOT_AUTHORIZED", "detail": "No Google account connected."}

    access_token = decrypt_token(conn.access_token)
    if conn.token_expiry and conn.token_expiry < datetime.utcnow():
        try:
            access_token = gmb_service.refresh_google_access_token(conn, db)
        except Exception as e:
            return {"status": "API_ERROR", "detail": f"Failed to refresh token: {e}"}

    reviews_data = gmb_service.fetch_real_reviews(access_token, sel_rec.account_id, sel_rec.location_id)
    performance_data = gmb_service.fetch_real_performance(access_token, sel_rec.location_id)
    posts_data = gmb_service.fetch_real_posts(access_token, sel_rec.account_id, sel_rec.location_id)

    # Visibility score calculation
    visibility = {"status": "Visibility data unavailable", "score": None}
    if performance_data.get("status") == "CONNECTED" and performance_data.get("metrics"):
        # Simple calculated visibility logic based on available impressions
        total_impressions = 0
        try:
            metrics_list = performance_data["metrics"].get("multiDailyMetricTimeSeries", [])
            for wrapper in metrics_list:
                for ts in wrapper.get("dailyMetricTimeSeries", []):
                    for dp in ts.get("timeSeries", {}).get("datedValues", []):
                        total_impressions += int(dp.get("value", 0))
            if total_impressions > 0:
                # We normalize it out of an expected baseline (e.g. 5000 impressions a month)
                score = min(round((total_impressions / 5000) * 100), 100)
                visibility = {"status": "Calculated Visibility", "score": f"{score}%"}
        except:
            pass

    return {
        "status": "CONNECTED",
        "businessName": sel_rec.location_name,
        "locationCount": 1,
        "reviews": reviews_data,
        "performance": performance_data,
        "posts": posts_data,
        "visibility": visibility,
        "rank": {"status": "Rank data unavailable", "position": None}
    }


@router.get("/verify-real-data")
def verify_real_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Development-only endpoint to audit and verify real Google API responses"""
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn:
        raise HTTPException(status_code=400, detail="No Google account connected.")
        
    access_token = decrypt_token(conn.access_token)
    if conn.token_expiry and conn.token_expiry < datetime.utcnow():
        access_token = gmb_service.refresh_google_access_token(conn, db)

    report = {
        "authenticated_google_email": conn.google_email,
        "google_account": {},
        "locations": [],
        "reviews": {},
        "performance": {},
        "posts": {}
    }
    
    # 1. Fetch Accounts
    try:
        accounts = gmb_service.fetch_google_business_accounts(access_token)
        if accounts:
            report["google_account"] = accounts[0]
    except Exception as e:
        report["google_account"] = {"error": str(e)}

    # 2. Fetch Locations
    if report["google_account"].get("accountId"):
        try:
            locations = gmb_service.fetch_google_locations_for_account(access_token, report["google_account"]["accountId"])
            report["locations"] = locations
        except Exception as e:
            report["locations"] = [{"error": str(e)}]
            
    # Fetch data for the first location to populate the rest of the report
    if report["locations"] and "locationId" in report["locations"][0]:
        loc = report["locations"][0]
        acc_id = report["google_account"]["accountId"]
        
        # Reviews
        report["reviews"] = gmb_service.fetch_real_reviews(access_token, acc_id, loc["locationId"])
        # Performance
        report["performance"] = gmb_service.fetch_real_performance(access_token, loc["locationId"])
        # Posts
        report["posts"] = gmb_service.fetch_real_posts(access_token, acc_id, loc["locationId"])

    return report

@router.post("/posts/create")
def create_post(
    req: CreatePostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sel_rec = db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == current_user.id).first()
    if not sel_rec:
        raise HTTPException(status_code=400, detail="No business location selected.")

    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn or not conn.access_token:
        raise HTTPException(status_code=400, detail="Google account not connected.")

    access_token = decrypt_token(conn.access_token)
    if conn.token_expiry and conn.token_expiry < datetime.utcnow():
        try:
            access_token = gmb_service.refresh_google_access_token(conn, db)
        except Exception as e:
            raise HTTPException(status_code=401, detail="Failed to refresh access token.")

    result = gmb_service.create_google_post(
        access_token=access_token,
        account_id=sel_rec.account_id,
        location_id=sel_rec.location_id,
        summary=req.summary,
        topic_type=req.topic_type,
        call_to_action=req.call_to_action,
        media_url=req.media_url,
        scheduled_time=req.scheduled_time
    )

    if result.get("status") != "SUCCESS":
        raise HTTPException(status_code=result.get("http_status", 500), detail=result.get("message", "Unknown error"))

    return result

@router.patch("/posts/{post_id}")
def update_post(
    post_id: str,
    req: UpdatePostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sel_rec = db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == current_user.id).first()
    if not sel_rec:
        raise HTTPException(status_code=400, detail="No business location selected.")

    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn or not conn.access_token:
        raise HTTPException(status_code=400, detail="Google account not connected.")

    access_token = decrypt_token(conn.access_token)
    if conn.token_expiry and conn.token_expiry < datetime.utcnow():
        try:
            access_token = gmb_service.refresh_google_access_token(conn, db)
        except Exception as e:
            raise HTTPException(status_code=401, detail="Failed to refresh access token.")

    result = gmb_service.update_google_post(
        access_token=access_token,
        account_id=sel_rec.account_id,
        location_id=sel_rec.location_id,
        post_id=post_id,
        summary=req.summary,
        topic_type=req.topic_type,
        call_to_action=req.call_to_action,
        media_url=req.media_url,
        scheduled_time=req.scheduled_time
    )

    if result.get("status") != "SUCCESS":
        raise HTTPException(status_code=result.get("http_status", 500), detail=result.get("message", "Unknown error"))

    return result


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sel_rec = db.query(SelectedBusinessLocation).filter(SelectedBusinessLocation.user_id == current_user.id).first()
    if not sel_rec:
        raise HTTPException(status_code=400, detail="No business location selected.")

    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn or not conn.access_token:
        raise HTTPException(status_code=400, detail="Google account not connected.")

    access_token = decrypt_token(conn.access_token)
    if conn.token_expiry and conn.token_expiry < datetime.utcnow():
        try:
            access_token = gmb_service.refresh_google_access_token(conn, db)
        except Exception as e:
            raise HTTPException(status_code=401, detail="Failed to refresh access token.")

    result = gmb_service.delete_google_post(
        access_token=access_token,
        account_id=sel_rec.account_id,
        location_id=sel_rec.location_id,
        post_id=post_id
    )

    if result.get("status") != "SUCCESS":
        raise HTTPException(status_code=result.get("http_status", 500), detail=result.get("message", "Unknown error"))

    return result
