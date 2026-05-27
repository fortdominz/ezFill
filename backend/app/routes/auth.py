import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

class GoogleTokenPayload(BaseModel):
    token: str  # ID token from Google OAuth


@router.post("/google")
async def google_auth(payload: GoogleTokenPayload):
    """
    Verifies a Google ID token from the Chrome extension.
    Creates or retrieves the user in MongoDB.
    Returns user info for the extension to store locally.
    """
    try:
        info = id_token.verify_oauth2_token(
            payload.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    google_id = info["sub"]
    email     = info["email"]
    name      = info.get("name", "")
    picture   = info.get("picture", "")

    db = get_db()

    # Upsert user — create on first login, do nothing if they already exist
    await db.users.update_one(
        {"google_id": google_id},
        {"$setOnInsert": {
            "google_id": google_id,
            "email": email,
            "name": name,
            "picture": picture,
        }},
        upsert=True,
    )

    return {
        "google_id": google_id,
        "email": email,
        "name": name,
        "picture": picture,
    }


@router.get("/me/{google_id}")
async def get_me(google_id: str):
    """Returns user record by google_id. Called on extension load to rehydrate session."""
    db   = get_db()
    user = await db.users.find_one({"google_id": google_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
