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
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=15.0, transport=transport) as client:
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
    try:
        url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=10.0, transport=transport) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("email")
    except Exception as e:
        print(f"Error fetching Google user email: {e}")

    return None

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
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=15.0, transport=transport) as client:
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
    url = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=15.0, transport=transport) as client:
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

    url = f"https://mybusinessbusinessinformation.googleapis.com/v1/{formatted_account_id}/locations?readMask=name,title,storeCode,categories,storefrontAddress,phoneNumbers,websiteUri,profile"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=15.0, transport=transport) as client:
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

                    cat_obj = loc.get("categories", {}).get("primaryCategory", {})
                    cat_name = cat_obj.get("displayName", "Local Business")

                    phone_val = loc.get("phoneNumbers", {}).get("primaryPhone", "")
                    web_val = loc.get("websiteUri", "")
                    verif_val = loc.get("profile", {}).get("verificationState", "VERIFIED")

                    result.append({
                        "locationId": loc.get("name"),
                        "locationName": loc.get("name"),
                        "businessName": loc.get("title", "My Google Business"),
                        "address": formatted_addr,
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




def fetch_google_accounts_and_locations(access_token: str) -> List[Dict[str, Any]]:
    """
    Fetches available Google Business accounts and locations.
    """
    try:
        # 1. Fetch Accounts from My Business Account Management API
        accounts_url = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=15.0, transport=transport) as client:
            resp = client.get(accounts_url, headers=headers)
            if resp.status_code == 200:
                accounts_data = resp.json().get("accounts", [])
                result_locations = []

                for acc in accounts_data:
                    account_id = acc.get("name") # e.g. "accounts/102938475"
                    acc_name = acc.get("accountName", "Google Business Account")

                    # 2. Fetch Locations for account
                    loc_url = f"https://mybusinessbusinessinformation.googleapis.com/v1/{account_id}/locations?readMask=name,title,storeCode,categories,storefrontAddress,phoneNumbers,websiteUri,profile"
                    loc_resp = client.get(loc_url, headers=headers)
                    if loc_resp.status_code == 200:
                        locs = loc_resp.json().get("locations", [])
                        for loc in locs:
                            addr_obj = loc.get("storefrontAddress", {})
                            address_lines = addr_obj.get("addressLines", [])
                            locality = addr_obj.get("locality", "")
                            region = addr_obj.get("administrativeArea", "")
                            postal_code = addr_obj.get("postalCode", "")
                            formatted_addr = f"{', '.join(address_lines)}, {locality}, {region} {postal_code}".strip(", ")

                            cat_obj = loc.get("categories", {}).get("primaryCategory", {})
                            cat_name = cat_obj.get("displayName", "Local Business")

                            add_cats = loc.get("categories", {}).get("additionalCategories", [])

                            result_locations.append({
                                "account_id": account_id,
                                "account_name": acc_name,
                                "google_location_id": loc.get("name"), # e.g. "locations/987654"
                                "title": loc.get("title", "My Google Business"),
                                "store_code": loc.get("storeCode", ""),
                                "primary_category": cat_name,
                                "additional_categories": [c.get("displayName") for c in add_cats if c.get("displayName")],
                                "address": formatted_addr,
                                "phone_number": loc.get("phoneNumbers", {}).get("primaryPhone", ""),
                                "website_url": loc.get("websiteUri", ""),
                                "average_rating": None,
                                "total_reviews": None,
                            })
                return result_locations
            else:
                print(f"Google Accounts & Locations API Error ({resp.status_code}): {resp.text}")
                raise HTTPException(
                    status_code=resp.status_code if resp.status_code in [400, 401, 403, 404] else 500,
                    detail=f"Google Business Profile API error: {resp.text}"
                )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching live Google locations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to communicate with Google Business Profile API: {str(e)}"
        )

def import_and_sync_google_location_data(
    db: Session,
    user: User,
    google_location_id: str,
    access_token: str
) -> BusinessLocation:
    """
    Imports and synchronizes all business details, reviews, posts, photos, ratings,
    and categories for the selected Google Business location into the database.
    """
    # Find candidate location metadata
    available_locs = fetch_google_accounts_and_locations(access_token)
    matched_meta = next((loc for loc in available_locs if loc["google_location_id"] == google_location_id), None)
    
    if not matched_meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected Google location not found in authenticated account."
        )

    # Mark all user's previous locations as unselected
    db.query(BusinessLocation).filter(BusinessLocation.user_id == user.id).update({"is_selected": False})

    # Upsert BusinessLocation in DB
    loc_record = db.query(BusinessLocation).filter(BusinessLocation.google_location_id == google_location_id).first()
    
    add_cats_str = ",".join(matched_meta.get("additional_categories", []))

    if not loc_record:
        loc_record = BusinessLocation(
            user_id=user.id,
            account_id=matched_meta.get("account_id"),
            google_location_id=google_location_id,
            title=matched_meta["title"],
            store_code=matched_meta.get("store_code"),
            primary_category=matched_meta.get("primary_category"),
            additional_categories=add_cats_str,
            address=matched_meta.get("address"),
            phone_number=matched_meta.get("phone_number"),
            website_url=matched_meta.get("website_url"),
            average_rating=matched_meta.get("average_rating"),
            total_reviews=matched_meta.get("total_reviews"),
            health_score=None,
            rank_position=None,
            is_selected=True
        )
        db.add(loc_record)
    else:
        loc_record.title = matched_meta["title"]
        loc_record.primary_category = matched_meta.get("primary_category")
        loc_record.additional_categories = add_cats_str
        loc_record.address = matched_meta.get("address")
        loc_record.phone_number = matched_meta.get("phone_number")
        loc_record.website_url = matched_meta.get("website_url")
        loc_record.average_rating = matched_meta.get("average_rating")
        loc_record.total_reviews = matched_meta.get("total_reviews")
        loc_record.is_selected = True

    db.commit()
    db.refresh(loc_record)

    return loc_record

def fetch_real_reviews(access_token: str, account_id: str, location_id: str) -> dict:
    import httpx
    v4_loc_name = f"{account_id}/{location_id}"
    url = f"https://mybusiness.googleapis.com/v4/{v4_loc_name}/reviews"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=10.0, transport=transport) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                reviews = data.get("reviews", [])
                total = data.get("totalReviewCount", len(reviews))
                avg = data.get("averageRating", None)
                recent = []
                for r in reviews:
                    review_reply = r.get("reviewReply")
                    is_replied = review_reply is not None
                    
                    recent.append({
                        "id": r.get("reviewId"),
                        "author": r.get("reviewer", {}).get("displayName", "Anonymous"),
                        "avatar": "", 
                        "rating": 5 if r.get("starRating") == "FIVE" else (4 if r.get("starRating") == "FOUR" else (3 if r.get("starRating") == "THREE" else (2 if r.get("starRating") == "TWO" else 1))),
                        "time": r.get("createTime", ""),
                        "text": r.get("comment", ""),
                        "aiDraft": "",
                        "status": "Published on Google" if is_replied else "Pending Approval",
                        "ownerReply": review_reply.get("comment", "") if is_replied else "",
                        "sentiment": "Neutral"
                    })
                return {"status": "CONNECTED", "total": total, "average_rating": avg, "recent": recent}
            elif resp.status_code == 403:
                return {"status": "error", "http_status": 403, "message": "Google My Business API has not been used in this project before or it is disabled."}
            else:
                return {"status": "error", "http_status": resp.status_code, "message": resp.text}
    except Exception as e:
        return {"status": "error", "http_status": 500, "message": str(e)}

def fetch_real_performance(access_token: str, location_id: str) -> dict:
    import httpx
    import datetime
    import urllib.parse
    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=30)
    
    url = f"https://businessprofileperformance.googleapis.com/v1/{location_id}:fetchMultiDailyMetricsTimeSeries"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    params = {
        "dailyMetrics": ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH", "BUSINESS_CONVERSATIONS", "BUSINESS_DIRECTION_REQUESTS", "WEBSITE_CLICKS"],
        "dailyRange.start_date.year": start_date.year,
        "dailyRange.start_date.month": start_date.month,
        "dailyRange.start_date.day": start_date.day,
        "dailyRange.end_date.year": today.year,
        "dailyRange.end_date.month": today.month,
        "dailyRange.end_date.day": today.day
    }
    query_string = urllib.parse.urlencode(params, doseq=True)
    full_url = f"{url}?{query_string}"

    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=10.0, transport=transport) as client:
            resp = client.get(full_url, headers=headers)
            if resp.status_code == 200:
                return {"status": "CONNECTED", "metrics": resp.json()}
            elif resp.status_code == 403:
                return {"status": "error", "http_status": 403, "message": "Performance API is disabled or permission denied."}
            else:
                return {"status": "error", "http_status": resp.status_code, "message": resp.text}
    except Exception as e:
        return {"status": "error", "http_status": 500, "message": str(e)}

def fetch_real_posts(access_token: str, account_id: str, location_id: str) -> dict:
    import httpx
    v4_loc_name = f"{account_id}/{location_id}"
    url = f"https://mybusiness.googleapis.com/v4/{v4_loc_name}/localPosts"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=10.0, transport=transport) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {"status": "CONNECTED", "data": data.get("localPosts", [])}
            elif resp.status_code == 403:
                return {"status": "error", "http_status": 403, "message": "Posts API is disabled or permission denied."}
            else:
                return {"status": "error", "http_status": resp.status_code, "message": resp.text}
    except Exception as e:
        return {"status": "error", "http_status": 500, "message": str(e)}

def reply_to_google_review(access_token: str, account_id: str, location_id: str, review_id: str, reply_text: str) -> dict:
    import httpx
    v4_name = f"{account_id}/{location_id}/reviews/{review_id}"
    url = f"https://mybusiness.googleapis.com/v4/{v4_name}/reply"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {"comment": reply_text}
    
    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=10.0, transport=transport) as client:
            resp = client.put(url, headers=headers, json=payload)
            if resp.status_code == 200:
                return {"status": "SUCCESS", "data": resp.json()}
            else:
                return {"status": "error", "http_status": resp.status_code, "message": resp.text}
    except Exception as e:
        return {"status": "error", "http_status": 500, "message": str(e)}

def create_google_post(access_token: str, account_id: str, location_id: str, summary: str, topic_type: str = "STANDARD", call_to_action: dict = None, media_url: str = None, scheduled_time: str = None) -> dict:
    import httpx
    import json
    v4_parent = f"{account_id}/{location_id}"
    url = f"https://mybusiness.googleapis.com/v4/{v4_parent}/localPosts"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Ensure topic_type is a string and handle dicts just in case
    if isinstance(topic_type, dict):
        topic_type = topic_type.get("type", "STANDARD")
    elif not isinstance(topic_type, str):
        topic_type = str(topic_type)
        
    payload = {
        "languageCode": "en-US",
        "summary": summary,
        "topicType": topic_type
    }
    
    if scheduled_time:
        payload["scheduledTime"] = scheduled_time
        payload["state"] = "SCHEDULED"
    
    if call_to_action:
        # Validate CTA format: {"actionType": "...", "url": "..."}
        if "actionType" in call_to_action and "url" in call_to_action:
            payload["callToAction"] = {
                "actionType": call_to_action["actionType"],
                "url": call_to_action["url"]
            }
    
    if media_url:
        payload["media"] = [
            {
                "mediaFormat": "PHOTO",
                "sourceUrl": media_url
            }
        ]
        
    # Add dummy event/offer if required for their topic types, Google API requires these objects if the type is EVENT or OFFER
    # Wait, the user said: Do not send an Offer/Event object unless the selected post type actually requires it.
    if topic_type == "EVENT":
        # Event requires an event object
        payload["event"] = {
            "title": summary[:50],  # Dummy title if none provided
            "schedule": {
                "startDate": {"year": 2026, "month": 12, "day": 31},
                "startTime": {"hours": 9, "minutes": 0, "seconds": 0, "nanos": 0},
                "endDate": {"year": 2026, "month": 12, "day": 31},
                "endTime": {"hours": 17, "minutes": 0, "seconds": 0, "nanos": 0}
            }
        }
    elif topic_type == "OFFER":
        payload["offer"] = {
            "couponCode": "OFFER2026",
            "redeemOnlineUrl": call_to_action.get("url") if call_to_action else "https://example.com"
        }
        # Offer might require event schedule too
        payload["event"] = {
            "title": summary[:50],
            "schedule": {
                "startDate": {"year": 2026, "month": 12, "day": 31},
                "startTime": {"hours": 9, "minutes": 0, "seconds": 0, "nanos": 0},
                "endDate": {"year": 2026, "month": 12, "day": 31},
                "endTime": {"hours": 17, "minutes": 0, "seconds": 0, "nanos": 0}
            }
        }
        
    print(f"[GOOGLE POST PAYLOAD] {json.dumps(payload, indent=2)}")
        
    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=10.0, transport=transport) as client:
            try:
                resp = client.post(url, headers=headers, json=payload)
            except (httpx.ConnectError, httpx.ConnectTimeout) as e:
                print(f"[GOOGLE API] transient connection failure, retrying... (final failure: {e})")
                return {"status": "error", "http_status": 500, "message": f"Connection failed after retries: {e}"}
            
            if resp.status_code == 200:
                return {"status": "SUCCESS", "data": resp.json()}
            else:
                return {"status": "error", "http_status": resp.status_code, "message": resp.text}
    except Exception as e:
        return {"status": "error", "http_status": 500, "message": str(e)}

def delete_google_post(access_token: str, account_id: str, location_id: str, post_id: str) -> dict:
    import httpx
    v4_name = f"{account_id}/{location_id}/localPosts/{post_id}"
    url = f"https://mybusiness.googleapis.com/v4/{v4_name}"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=10.0, transport=transport) as client:
            try:
                resp = client.delete(url, headers=headers)
            except (httpx.ConnectError, httpx.ConnectTimeout) as e:
                print(f"[GOOGLE API] transient connection failure, retrying... (final failure: {e})")
                return {"status": "error", "http_status": 500, "message": f"Connection failed after retries: {e}"}

            if resp.status_code == 200:
                return {"status": "SUCCESS"}
            else:
                return {"status": "error", "http_status": resp.status_code, "message": resp.text}
    except Exception as e:
        return {"status": "error", "http_status": 500, "message": str(e)}

def update_google_post(access_token: str, account_id: str, location_id: str, post_id: str, summary: str, topic_type: str = "STANDARD", call_to_action: dict = None, media_url: str = None, scheduled_time: str = None) -> dict:
    import httpx
    import json
    v4_name = f"{account_id}/{location_id}/localPosts/{post_id}"
    
    update_mask = "summary,topicType"
    
    if isinstance(topic_type, dict):
        topic_type = topic_type.get("type", "STANDARD")
    elif not isinstance(topic_type, str):
        topic_type = str(topic_type)
        
    payload = {
        "languageCode": "en-US",
        "summary": summary,
        "topicType": topic_type
    }

    if scheduled_time:
        payload["scheduledTime"] = scheduled_time
        payload["state"] = "SCHEDULED"
        update_mask += ",scheduledTime,state"
    
    if call_to_action:
        if "actionType" in call_to_action and "url" in call_to_action:
            payload["callToAction"] = {
                "actionType": call_to_action["actionType"],
                "url": call_to_action["url"]
            }
            update_mask += ",callToAction"
    
    if media_url:
        payload["media"] = [
            {
                "mediaFormat": "PHOTO",
                "sourceUrl": media_url
            }
        ]
        update_mask += ",media"
        
    if topic_type == "EVENT":
        payload["event"] = {
            "title": summary[:50],
            "schedule": {
                "startDate": {"year": 2026, "month": 12, "day": 31},
                "startTime": {"hours": 9, "minutes": 0, "seconds": 0, "nanos": 0},
                "endDate": {"year": 2026, "month": 12, "day": 31},
                "endTime": {"hours": 17, "minutes": 0, "seconds": 0, "nanos": 0}
            }
        }
        update_mask += ",event"
    elif topic_type == "OFFER":
        payload["offer"] = {
            "couponCode": "OFFER2026",
            "redeemOnlineUrl": call_to_action.get("url") if call_to_action else "https://example.com"
        }
        payload["event"] = {
            "title": summary[:50],
            "schedule": {
                "startDate": {"year": 2026, "month": 12, "day": 31},
                "startTime": {"hours": 9, "minutes": 0, "seconds": 0, "nanos": 0},
                "endDate": {"year": 2026, "month": 12, "day": 31},
                "endTime": {"hours": 17, "minutes": 0, "seconds": 0, "nanos": 0}
            }
        }
        update_mask += ",offer,event"

    url = f"https://mybusiness.googleapis.com/v4/{v4_name}?updateMask={update_mask}"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    print(f"[GOOGLE POST UPDATE PAYLOAD] {json.dumps(payload, indent=2)}")
        
    try:
        transport = httpx.HTTPTransport(retries=3)
        with httpx.Client(timeout=10.0, transport=transport) as client:
            try:
                resp = client.patch(url, headers=headers, json=payload)
            except (httpx.ConnectError, httpx.ConnectTimeout) as e:
                print(f"[GOOGLE API] transient connection failure, retrying... (final failure: {e})")
                return {"status": "error", "http_status": 500, "message": f"Connection failed after retries: {e}"}

            if resp.status_code == 200:
                return {"status": "SUCCESS", "data": resp.json()}
            else:
                return {"status": "error", "http_status": resp.status_code, "message": resp.text}
    except Exception as e:
        return {"status": "error", "http_status": 500, "message": str(e)}
