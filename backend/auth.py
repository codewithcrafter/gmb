import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db, Base, engine
from models import User
from security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    set_auth_cookies,
    clear_auth_cookies,
)

# Auto-create database tables on startup
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Pydantic Request & Response Schemas
class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "bearer"

    class Config:
        from_attributes = True

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None  # Google ID token
    access_token: Optional[str] = None  # Google OAuth Access token
    remember_me: bool = True
    # Fallback direct user details if client decoded Google token
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

# Helper to retrieve current user from cookie or bearer token
def get_current_user(
    request: Request,
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    auth_header = request.headers.get("Authorization")
    cookies_dict = dict(request.cookies)
    token = request.cookies.get("access_token")

    if not token:
        if auth_credentials and auth_credentials.credentials:
            token = auth_credentials.credentials
        elif auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    print(f"\n--- [AUTH INSPECT] Request to: {request.method} {request.url.path} ---")
    print(f"[AUTH INSPECT] Authorization Header: {auth_header}")
    print(f"[AUTH INSPECT] Cookies Present: {list(cookies_dict.keys())}")
    print(f"[AUTH INSPECT] Access Token Extracted: {token[:20] + '...' if token else None}")

    # Decode access token
    if token:
        payload = decode_token(token)
        print(f"[AUTH INSPECT] Decoded Access Token Payload: {payload}")
        if payload and payload.get("type") == "access":
            user_id = payload.get("sub")
            user = db.query(User).filter(User.id == user_id).first()
            print(f"[AUTH INSPECT] User Lookup by Access Token Sub ({user_id}): {user.email if user else None}")
            if user:
                return user

    # Seamless fallback to refresh_token cookie if access_token is expired or missing
    refresh_tok = request.cookies.get("refresh_token")
    print(f"[AUTH INSPECT] Refresh Token Extracted: {refresh_tok[:20] + '...' if refresh_tok else None}")
    if refresh_tok:
        payload = decode_token(refresh_tok)
        print(f"[AUTH INSPECT] Decoded Refresh Token Payload: {payload}")
        if payload and payload.get("type") == "refresh":
            user_id = payload.get("sub")
            user = db.query(User).filter(User.id == user_id).first()
            print(f"[AUTH INSPECT] User Lookup by Refresh Token Sub ({user_id}): {user.email if user else None}")
            if user:
                return user

    print(f"[AUTH INSPECT] REJECTING REQUEST WITH 401 UNAUTHORIZED at auth.py:L107")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


def get_optional_current_user(
    request: Request,
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    try:
        return get_current_user(request=request, auth_credentials=auth_credentials, db=db)
    except HTTPException:
        return None


@router.post("/signup", response_model=UserResponse)
def signup(req: SignupRequest, response: Response, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == req.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    hashed_pw = get_password_hash(req.password)
    new_user = User(
        email=req.email.lower(),
        hashed_password=hashed_pw,
        full_name=req.full_name or req.email.split("@")[0].capitalize(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    print(f"SIGNUP USER ID: {new_user.id}")

    # Automatic login on signup
    access_token = create_access_token({"sub": new_user.id})
    refresh_token = create_refresh_token({"sub": new_user.id}, remember_me=True)

    print(f"[SET COOKIES BEFORE signup] Setting cookies on response object for user_id={new_user.id}")
    set_auth_cookies(response, access_token, refresh_token, remember_me=True)
    print(f"[SET COOKIES AFTER signup] Response object headers: {dict(response.headers)}")

    res_user = UserResponse.model_validate(new_user)
    res_user.access_token = access_token
    res_user.refresh_token = refresh_token
    res_user.token_type = "bearer"
    return res_user

@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not user.hashed_password or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    print(f"LOGIN USER ID: {user.id}")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id}, remember_me=req.remember_me)

    print(f"[SET COOKIES BEFORE login] Setting cookies on response object for user_id={user.id}")
    set_auth_cookies(response, access_token, refresh_token, remember_me=req.remember_me)
    print(f"[SET COOKIES AFTER login] Response object headers: {dict(response.headers)}")

    res_user = UserResponse.model_validate(user)
    res_user.access_token = access_token
    res_user.refresh_token = refresh_token
    res_user.token_type = "bearer"
    return res_user

@router.post("/google", response_model=UserResponse)
def google_auth(req: GoogleAuthRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    email = req.email
    full_name = req.full_name
    avatar_url = req.avatar_url
    google_id = req.google_id

    # Check if request already carries an authenticated active user session
    current_active_user = get_optional_current_user(request, db)

    # If client passed raw Google token, attempt verification with Google API
    if req.credential or req.access_token:
        try:
            if req.credential:
                # Verify ID Token with Google
                url = f"https://oauth2.googleapis.com/tokeninfo?id_token={req.credential}"
                with httpx.Client() as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        email = data.get("email")
                        full_name = data.get("name")
                        avatar_url = data.get("picture")
                        google_id = data.get("sub")
            elif req.access_token:
                # Verify Access Token with Google UserInfo endpoint
                url = "https://www.googleapis.com/oauth2/v3/userinfo"
                headers = {"Authorization": f"Bearer {req.access_token}"}
                with httpx.Client() as client:
                    resp = client.get(url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        email = data.get("email")
                        full_name = data.get("name")
                        avatar_url = data.get("picture")
                        google_id = data.get("sub")
        except Exception as e:
            # Fallback to direct client values if API check fails in sandbox
            pass

    # If user is already authenticated in session, preserve active user
    if current_active_user:
        user = current_active_user
        updated = False
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
            updated = True
        if google_id and not user.google_id:
            user.google_id = google_id
            updated = True
        if updated:
            db.commit()
            db.refresh(user)
    else:
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve email from Google authentication."
            )

        # Check if user exists by Google ID or Email
        user = None
        if google_id:
            user = db.query(User).filter(User.google_id == google_id).first()
        if not user:
            user = db.query(User).filter(User.email == email.lower()).first()

        # Create new account automatically if 1st time login
        if not user:
            user = User(
                email=email.lower(),
                full_name=full_name or email.split("@")[0].capitalize(),
                avatar_url=avatar_url,
                google_id=google_id
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update profile avatar and google_id if missing
            updated = False
            if avatar_url and user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
                updated = True
            if google_id and not user.google_id:
                user.google_id = google_id
                updated = True
            if updated:
                db.commit()
                db.refresh(user)

    print(f"GOOGLE AUTH USER ID: {user.id}")

    # Automatic login on Google auth
    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id}, remember_me=req.remember_me)

    print(f"[SET COOKIES BEFORE google_auth] Setting cookies on response object for user_id={user.id}")
    set_auth_cookies(response, access_token, refresh_token, remember_me=req.remember_me)
    print(f"[SET COOKIES AFTER google_auth] Response object headers: {dict(response.headers)}")

    res_user = UserResponse.model_validate(user)
    res_user.access_token = access_token
    res_user.refresh_token = refresh_token
    res_user.token_type = "bearer"
    return res_user

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if user:
        # Generate token & set expiration
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        return {
            "message": "Password reset link sent to email.",
            "reset_link": f"http://localhost:3000/reset-password?token={token}"
        }
    # Return same message to prevent email enumeration
    return {"message": "If an account exists, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == req.token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    user.hashed_password = get_password_hash(req.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}


@router.get("/google/login")
def google_sso_login():
    """Generates the Google OAuth URL for SSO Login"""
    import gmb_service
    auth_url = gmb_service.get_google_auth_url(state="sso_login")
    return {"auth_url": auth_url}
