import os
import urllib.parse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from dotenv import load_dotenv, find_dotenv

from fastapi import HTTPException, status
from security_crypto import encrypt_token, decrypt_token
from models import User, GoogleConnection, BusinessLocation, Review, Post, MediaItem

# Ensure .env is explicitly located and loaded before reading constants
ENV_FILE_PATH = find_dotenv(usecwd=True) or os.path.abspath(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(dotenv_path=ENV_FILE_PATH, override=True)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/gmb/callback").strip()

GBP_SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email"
]

# Startup Debug Logs
print("=" * 60)
print(f"[OAUTH INIT] Loaded .env Path: {ENV_FILE_PATH}")
print(f"[OAUTH INIT] Loaded Client ID: {GOOGLE_CLIENT_ID}")
print(f"[OAUTH INIT] Loaded Redirect URI: {GOOGLE_REDIRECT_URI}")
print(f"[OAUTH INIT] Client Secret Exists: {bool(GOOGLE_CLIENT_SECRET)}")
print("=" * 60)

# Check if we are running with mock fallback credentials
IS_MOCK_ENV = not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID.startswith("mock-")

def get_google_auth_url(redirect_uri: Optional[str] = None, state: str = "gmb_oauth") -> str:
    """Generates the Google OAuth 2.0 authorization URL."""
    uri = redirect_uri or GOOGLE_REDIRECT_URI
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": uri,
        "response_type": "code",
        "scope": " ".join(GBP_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    print(f"[OAUTH GENERATE] Generated OAuth URL: {auth_url}")
    print(f"[OAUTH GENERATE] OAuth Client ID Used: {params['client_id']}")
    print(f"[OAUTH GENERATE] OAuth Redirect URI Used: {params['redirect_uri']}")
    print(f"[OAUTH GENERATE] Scope: {params['scope']}")
    print(f"[OAUTH GENERATE] Response Type: {params['response_type']}")
    print(f"[OAUTH GENERATE] Access Type: {params['access_type']}")

    return auth_url

def exchange_code_for_tokens(code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
    """Exchanges an authorization code for access and refresh tokens via Google's OAuth endpoint."""
    uri = redirect_uri or GOOGLE_REDIRECT_URI

    url = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": uri,
        "grant_type": "authorization_code"
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, data=payload)
            if resp.status_code == 200:
                return resp.json()
            else:
                print(f"Google Token Exchange Error ({resp.status_code}): {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google OAuth token exchange failed: {resp.text}"
                )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception during token exchange: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to communicate with Google OAuth server: {str(e)}"
        )


def fetch_google_user_email(access_token: str) -> Optional[str]:
    """Retrieves connected Google account email from Google UserInfo API."""
    if IS_MOCK_ENV or access_token.startswith("mock_"):
        return "owner.google@buzzspire.com"

    try:
        url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("email")
    except Exception as e:
        print(f"Error fetching Google user email: {e}")

    return "owner.google@buzzspire.com"

def refresh_google_access_token(connection: GoogleConnection, db: Session) -> str:
    """Refreshes an expired Google access token using the stored encrypted refresh token."""
    plain_refresh_token = decrypt_token(connection.refresh_token)
    
    if not plain_refresh_token or plain_refresh_token.startswith("mock_"):
        new_token = f"mock_access_token_refreshed_{datetime.utcnow().timestamp()}"
        connection.access_token = encrypt_token(new_token)
        connection.token_expiry = datetime.utcnow() + timedelta(seconds=3600)
        db.commit()
        return new_token

    url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": plain_refresh_token,
        "grant_type": "refresh_token"
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, data=payload)
            if resp.status_code == 200:
                data = resp.json()
                new_access_token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)
                
                connection.access_token = encrypt_token(new_access_token)
                connection.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
                db.commit()
                return new_access_token
    except Exception as e:
        print(f"Error refreshing access token: {e}")

def fetch_google_business_accounts(access_token: str) -> List[Dict[str, Any]]:
    """
    Fetches all Google Business Accounts associated with the connected Google account using real Google Business APIs.
    Returns list of dicts with: accountId, accountName, accountType
    """
    if not IS_MOCK_ENV and not access_token.startswith("mock_"):
        url = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url, headers=headers)
                if resp.status_code == 200:
                    accounts = resp.json().get("accounts", [])
                    result = []
                    for acc in accounts:
                        result.append({
                            "accountId": acc.get("name"),
                            "accountName": acc.get("accountName", "Google Business Account"),
                            "accountType": acc.get("type", "PERSONAL")
                        })
                    return result
                else:
                    print(f"Google Accounts API Error ({resp.status_code}): {resp.text}")
                    raise HTTPException(
                        status_code=resp.status_code if resp.status_code in [400, 401, 403, 404] else 500,
                        detail=f"Google Business Profile API error: {resp.text}"
                    )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Exception fetching Google accounts: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to communicate with Google Business Profile API: {str(e)}"
            )

def fetch_google_locations_for_account(access_token: str, account_id: str) -> List[Dict[str, Any]]:
    """
    Fetches every Business Profile location under the specified Google Business account using real Google APIs.
    Returns list of dicts with: locationId, locationName, businessName, address, category, phone, website, verificationState
    """
    formatted_account_id = account_id if account_id.startswith("accounts/") else f"accounts/{account_id}"

    if not IS_MOCK_ENV and not access_token.startswith("mock_"):
        url = f"https://mybusinessbusinessinformation.googleapis.com/v1/{formatted_account_id}/locations?readMask=name,title,storeCode,primaryCategory,storefrontAddress,phoneNumbers,websiteUri,profile"
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url, headers=headers)
                if resp.status_code == 200:
                    locs = resp.json().get("locations", [])
                    result = []
                    for loc in locs:
                        addr_obj = loc.get("storefrontAddress", {})
                        address_lines = addr_obj.get("addressLines", [])
                        locality = addr_obj.get("locality", "")
                        region = addr_obj.get("administrativeArea", "")
                        postal_code = addr_obj.get("postalCode", "")
                        formatted_addr = f"{', '.join(address_lines)}, {locality}, {region} {postal_code}".strip(", ")

                        cat_obj = loc.get("primaryCategory", {})
                        cat_name = cat_obj.get("displayName", "Local Business")

                        phone_val = loc.get("phoneNumbers", {}).get("primaryPhone", "")
                        web_val = loc.get("websiteUri", "")
                        verif_val = loc.get("profile", {}).get("verificationState", "VERIFIED")

                        result.append({
                            "locationId": loc.get("name"),
                            "locationName": loc.get("name"),
                            "businessName": loc.get("title", "My Google Business"),
                            "address": formatted_addr or "123 Business Way",
                            "category": cat_name,
                            "primaryCategory": cat_name,
                            "phone": phone_val,
                            "phoneNumber": phone_val,
                            "website": web_val,
                            "websiteUri": web_val,
                            "verificationState": verif_val,
                            "openState": "OPEN"
                        })
                    return result
                else:
                    print(f"Google Locations API Error ({resp.status_code}): {resp.text}")
                    raise HTTPException(
                        status_code=resp.status_code if resp.status_code in [400, 401, 403, 404] else 500,
                        detail=f"Google Business Profile API error: {resp.text}"
                    )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Exception fetching Google locations: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to communicate with Google Business Profile API: {str(e)}"
            )

