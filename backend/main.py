from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from agents import review_agent
from auth import router as auth_router
from gmb import router as gmb_router
from social import router as social_router

app = FastAPI(
    title="BuzzSpire Local AI API",
    description=(
        "Backend API for the BuzzSpire Local AI SaaS Platform.\n\n"
        "**Authentication**: Most endpoints require a valid JWT. "
        "Use POST `/api/auth/login` to get your `access_token`, then click "
        "**Authorize** above and enter `Bearer <your_access_token>`."
    ),
    version="1.0.0"
)

# CORS config allowing credentials for HttpOnly cookies
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth & GMB Routers
app.include_router(auth_router)
app.include_router(gmb_router)
app.include_router(social_router)


def custom_openapi():
    """
    Override the default OpenAPI schema to add a global BearerAuth security scheme.
    This enables the Swagger UI 'Authorize' button to accept JWT Bearer tokens,
    so authenticated endpoints (GMB + Social) can be tested directly from /docs.
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Register the HTTPBearer security scheme
    openapi_schema.setdefault("components", {})
    openapi_schema["components"].setdefault("securitySchemes", {})
    openapi_schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": (
            "JWT Bearer token. Obtain a token by calling POST /api/auth/login "
            "and copying the `access_token` from the response body."
        ),
    }

    # Apply BearerAuth globally to all operations
    for path_item in openapi_schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict):
                operation.setdefault("security", [{"BearerAuth": []}])

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
