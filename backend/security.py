import os
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from fastapi import Response

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "buzzspire-super-secret-jwt-key-2026-production")
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS_STANDARD = 7
REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict, remember_me: bool = False) -> str:
    to_encode = data.copy()
    days = REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER if remember_me else REFRESH_TOKEN_EXPIRE_DAYS_STANDARD
    expire = datetime.utcnow() + timedelta(days=days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None

def set_auth_cookies(response: Response, access_token: str, refresh_token: str, remember_me: bool = False):
    max_age_access = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    max_age_refresh = (30 if remember_me else 7) * 24 * 60 * 60
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=max_age_access,
        samesite="lax",
        secure=False, # Set to True in production with HTTPS
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=max_age_refresh,
        samesite="lax",
        secure=False,
        path="/"
    )

def clear_auth_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
