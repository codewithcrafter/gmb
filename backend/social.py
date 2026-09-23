import os
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from urllib.parse import urlencode

from database import get_db
from models import User, SocialAccount, OAuthState
from auth import get_current_user
import uuid

router = APIRouter(prefix="/api/social", tags=["Social Media"])

META_APP_ID = os.getenv("META_APP_ID")
META_APP_SECRET = os.getenv("META_APP_SECRET")
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
SOCIAL_REDIRECT_URI = os.getenv("SOCIAL_REDIRECT_URI", "http://localhost:8000/api/social/callback")

@router.get("/accounts")
def get_social_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(SocialAccount).filter(SocialAccount.user_id == current_user.id).all()
    return {
        "status": "success",
        "accounts": [
            {
                "id": a.id,
                "platform": a.platform,
                "account_name": a.account_name,
                "username": a.username,
                "connected": a.connected
            } for a in accounts
        ]
    }

@router.get("/{platform}/connect")
def connect_platform(platform: str, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = f"{platform}_{uuid.uuid4()}"
    
    # Store the state server-side so callback can validate it
    oauth_state = OAuthState(
        state=state,
        user_id=current_user.id,
        platform=platform
    )
    db.add(oauth_state)
    db.commit()
    
    if platform == "facebook" or platform == "instagram":
        if not META_APP_ID:
            raise HTTPException(status_code=500, detail="META_APP_ID not configured")
        
        url = "https://www.facebook.com/v19.0/dialog/oauth"
        params = {
            "client_id": META_APP_ID,
            "redirect_uri": SOCIAL_REDIRECT_URI,
            "state": state,
            "scope": "pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish"
        }
        return {"url": f"{url}?{urlencode(params)}"}
        
    elif platform == "linkedin":
        if not LINKEDIN_CLIENT_ID:
            raise HTTPException(status_code=500, detail="LINKEDIN_CLIENT_ID not configured")
            
        url = "https://www.linkedin.com/oauth/v2/authorization"
        params = {
            "response_type": "code",
            "client_id": LINKEDIN_CLIENT_ID,
            "redirect_uri": SOCIAL_REDIRECT_URI,
            "state": state,
            "scope": "r_organization_social w_organization_social openid profile email"
        }
        return {"url": f"{url}?{urlencode(params)}"}
    
    raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

@router.get("/callback")
def social_oauth_callback(code: str, state: str, request: Request, db: Session = Depends(get_db)):
    # Validate the state and retrieve the associated user and platform
    oauth_state = db.query(OAuthState).filter(OAuthState.state == state).first()
    if not oauth_state:
        return RedirectResponse(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/social?error=invalid_state")
        
    platform = oauth_state.platform
    user_id = oauth_state.user_id
    
    # Delete the state to prevent reuse
    db.delete(oauth_state)
    db.commit()
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/social?error=user_not_found")
        
    try:
        if platform in ["facebook", "instagram"]:
            # 1. Exchange code for user access token
            token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
            with httpx.Client(timeout=15.0) as client:
                res = client.get(token_url, params={
                    "client_id": META_APP_ID,
                    "redirect_uri": SOCIAL_REDIRECT_URI,
                    "client_secret": META_APP_SECRET,
                    "code": code
                })
                res.raise_for_status()
                token_data = res.json()
                user_access_token = token_data.get("access_token")
                
                # 2. Upgrade to long-lived token
                upgrade_res = client.get(token_url, params={
                    "grant_type": "fb_exchange_token",
                    "client_id": META_APP_ID,
                    "client_secret": META_APP_SECRET,
                    "fb_exchange_token": user_access_token
                })
                long_lived_token = upgrade_res.json().get("access_token", user_access_token)
                
                # 3. Get Pages
                pages_res = client.get("https://graph.facebook.com/v19.0/me/accounts", params={
                    "access_token": long_lived_token
                })
                pages_data = pages_res.json()
                pages = pages_data.get("data", [])
                
                if not pages:
                    return RedirectResponse(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/social?error=no_facebook_pages_found")
                    
                target_page = next((p for p in pages if "BuzzSpire Media" in p.get("name", "")), pages[0])
                page_token = target_page.get("access_token")
                page_id = target_page.get("id")
                page_name = target_page.get("name")
                
                # Save FB Page
                fb_account = db.query(SocialAccount).filter_by(user_id=user.id, platform="facebook").first()
                if not fb_account:
                    fb_account = SocialAccount(user_id=user.id, platform="facebook")
                    db.add(fb_account)
                fb_account.platform_account_id = page_id
                fb_account.account_name = page_name
                fb_account.access_token = page_token
                fb_account.connected = True
                
                # 4. Check for Instagram Business Account
                ig_res = client.get(f"https://graph.facebook.com/v19.0/{page_id}?fields=instagram_business_account", params={
                    "access_token": page_token
                })
                ig_data = ig_res.json()
                if "instagram_business_account" in ig_data:
                    ig_id = ig_data["instagram_business_account"]["id"]
                    
                    ig_info_res = client.get(f"https://graph.facebook.com/v19.0/{ig_id}?fields=username,name", params={
                        "access_token": page_token
                    })
                    ig_info = ig_info_res.json()
                    
                    ig_account = db.query(SocialAccount).filter_by(user_id=user.id, platform="instagram").first()
                    if not ig_account:
                        ig_account = SocialAccount(user_id=user.id, platform="instagram")
                        db.add(ig_account)
                    ig_account.platform_account_id = ig_id
                    ig_account.account_name = ig_info.get("name", page_name)
                    ig_account.username = f"@{ig_info.get('username', 'buzzspiremedia')}"
                    ig_account.access_token = page_token
                    ig_account.connected = True
                
                db.commit()
                return RedirectResponse(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/social?success=meta_connected")

        elif platform == "linkedin":
            token_url = "https://www.linkedin.com/oauth/v2/accessToken"
            with httpx.Client(timeout=15.0) as client:
                res = client.post(token_url, data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": SOCIAL_REDIRECT_URI,
                    "client_id": LINKEDIN_CLIENT_ID,
                    "client_secret": LINKEDIN_CLIENT_SECRET
                }, headers={"Content-Type": "application/x-www-form-urlencoded"})
                res.raise_for_status()
                token_data = res.json()
                access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 0)
                
                orgs_url = "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&state=APPROVED"
                orgs_res = client.get(orgs_url, headers={"Authorization": f"Bearer {access_token}"})
                orgs_res.raise_for_status()
                orgs_data = orgs_res.json()
                elements = orgs_data.get("elements", [])
                
                if not elements:
                    return RedirectResponse(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/social?error=no_linkedin_organizations_found")
                    
                target_org_urn = elements[0].get("organization") 
                
                org_account = db.query(SocialAccount).filter_by(user_id=user.id, platform="linkedin").first()
                if not org_account:
                    org_account = SocialAccount(user_id=user.id, platform="linkedin")
                    db.add(org_account)
                    
                org_account.platform_account_id = target_org_urn
                org_account.account_name = "BuzzSpire Media PVT LTD"
                org_account.access_token = access_token
                org_account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                org_account.connected = True
                
                db.commit()
                return RedirectResponse(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/social?success=linkedin_connected")

    except Exception as e:
        print(f"OAuth Error: {e}")
        return RedirectResponse(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/social?error=oauth_failed")

@router.post("/{platform}/disconnect")
def disconnect_platform(platform: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(SocialAccount).filter_by(user_id=current_user.id, platform=platform).first()
    if account:
        db.delete(account)
        db.commit()
    return {"status": "success"}

from pydantic import BaseModel
class CreateSocialPostRequest(BaseModel):
    platforms: list[str]
    content: str

@router.post("/posts/create")
def create_social_post(request: CreateSocialPostRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = {}
    
    for platform in request.platforms:
        account = db.query(SocialAccount).filter_by(user_id=current_user.id, platform=platform).first()
        if not account or not account.connected:
            results[platform] = {"status": "Failed", "error": "Account not connected"}
            continue
            
        try:
            with httpx.Client(timeout=15.0) as client:
                if platform == "facebook":
                    url = f"https://graph.facebook.com/v19.0/{account.platform_account_id}/feed"
                    res = client.post(url, data={
                        "message": request.content,
                        "access_token": account.access_token
                    })
                    res_data = res.json()
                    if res.status_code == 200:
                        results[platform] = {"status": "Published", "id": res_data.get("id")}
                    else:
                        results[platform] = {"status": "Failed", "error": res_data.get("error", {}).get("message", "Unknown error")}
                        
                elif platform == "instagram":
                    # Step 1: Create Media container (Text-only is not supported by IG Graph API without image)
                    # For this MVP, if no media is provided, we fail gracefully. IG REQUIRES an image or video.
                    results[platform] = {"status": "Failed", "error": "Instagram requires media to publish"}
                    
                elif platform == "linkedin":
                    # First, verify organization authorization before publishing
                    org_roles_url = f"https://api.linkedin.com/v2/organizationAcls?q=organization&organization={account.platform_account_id}"
                    roles_res = client.get(org_roles_url, headers={
                        "Authorization": f"Bearer {account.access_token}"
                    })
                    if roles_res.status_code != 200:
                        results[platform] = {"status": "Failed", "error": f"Failed to verify organization roles: {roles_res.text}"}
                        continue
                        
                    roles_data = roles_res.json()
                    is_authorized = False
                    for element in roles_data.get("elements", []):
                        if element.get("state") == "APPROVED":
                            is_authorized = True
                            break
                            
                    if not is_authorized:
                        results[platform] = {"status": "Failed", "error": "User does not have approved posting roles for this organization."}
                        continue

                    # Now publish using the REST Posts API
                    url = "https://api.linkedin.com/rest/posts"
                    payload = {
                        "author": account.platform_account_id,
                        "commentary": request.content,
                        "visibility": "PUBLIC",
                        "distribution": {
                            "feedDistribution": "MAIN_FEED",
                            "targetEntities": [],
                            "thirdPartyDistributionChannels": []
                        },
                        "lifecycleState": "PUBLISHED",
                        "isReshareDisabledByAuthor": False
                    }
                    res = client.post(url, headers={
                        "Authorization": f"Bearer {account.access_token}",
                        "X-Restli-Protocol-Version": "2.0.0",
                        "LinkedIn-Version": "202401",
                        "Content-Type": "application/json"
                    }, json=payload)
                    if res.status_code == 201:
                        results[platform] = {"status": "Published", "id": res.headers.get("x-restli-id")}
                    else:
                        results[platform] = {"status": "Failed", "error": res.text}
        except Exception as e:
            results[platform] = {"status": "Failed", "error": str(e)}
            
    return {"status": "completed", "results": results}

@router.get("/posts")
def get_social_posts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(SocialAccount).filter_by(user_id=current_user.id, connected=True).all()
    posts = []
    
    with httpx.Client(timeout=15.0) as client:
        for account in accounts:
            try:
                if account.platform == "facebook":
                    url = f"https://graph.facebook.com/v19.0/{account.platform_account_id}/posts?fields=id,message,created_time,permalink_url"
                    res = client.get(url, params={"access_token": account.access_token})
                    if res.status_code == 200:
                        for p in res.json().get("data", []):
                            posts.append({
                                "platform": "facebook",
                                "id": p.get("id"),
                                "content": p.get("message", ""),
                                "published_date": p.get("created_time"),
                                "url": p.get("permalink_url")
                            })
                elif account.platform == "instagram":
                    url = f"https://graph.facebook.com/v19.0/{account.platform_account_id}/media?fields=id,caption,media_url,timestamp,permalink"
                    res = client.get(url, params={"access_token": account.access_token})
                    if res.status_code == 200:
                        for p in res.json().get("data", []):
                            posts.append({
                                "platform": "instagram",
                                "id": p.get("id"),
                                "content": p.get("caption", ""),
                                "media": p.get("media_url"),
                                "published_date": p.get("timestamp"),
                                "url": p.get("permalink")
                            })
                elif account.platform == "linkedin":
                    # Use the rest/posts API as requested by user
                    url = f"https://api.linkedin.com/rest/posts?author={account.platform_account_id}&q=author&count=10"
                    res = client.get(url, headers={
                        "Authorization": f"Bearer {account.access_token}",
                        "LinkedIn-Version": "202401"
                    })
                    if res.status_code == 200:
                        for p in res.json().get("elements", []):
                            # Extremely simplified parse for LinkedIn's complex JSON
                            posts.append({
                                "platform": "linkedin",
                                "id": p.get("id"),
                                "content": p.get("commentary", ""), # Might need deeper parsing
                                "published_date": p.get("createdAt", 0),
                                "url": f"https://www.linkedin.com/feed/update/{p.get('id')}"
                            })
            except Exception as e:
                print(f"Error fetching {account.platform} posts: {e}")
                
    # Sort posts by date descending
    # Not perfectly sorting heterogeneous date formats here yet, but just appending
    return {"status": "success", "posts": posts}
