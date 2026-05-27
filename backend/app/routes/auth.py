from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleUserPayload(BaseModel):
    """User info from Google's userinfo endpoint, verified by the extension."""
    google_id: str
    email: str
    name: str
    picture: Optional[str] = None


@router.post("/google")
async def google_auth(payload: GoogleUserPayload):
    """
    Creates or updates the user in MongoDB.
    The extension already verified identity via Google's userinfo API —
    this endpoint just handles persistence.
    """
    db = get_db()
    await db.users.update_one(
        {"google_id": payload.google_id},
        {"$set": {
            "google_id": payload.google_id,
            "email":     payload.email,
            "name":      payload.name,
            "picture":   payload.picture,
        }},
        upsert=True,
    )
    return {
        "google_id": payload.google_id,
        "email":     payload.email,
        "name":      payload.name,
        "picture":   payload.picture,
    }


@router.get("/me/{google_id}")
async def get_me(google_id: str):
    """Returns the stored user by google_id. Called on extension load to rehydrate session."""
    db   = get_db()
    user = await db.users.find_one({"google_id": google_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
