from fastapi import APIRouter, HTTPException
from app.db import get_db
from app.models.answer import Answer, AnswerUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/{user_id}")
async def get_profile(user_id: str):
    """Returns all saved answers for a user."""
    db      = get_db()
    answers = await db.answers.find(
        {"user_id": user_id},
        {"_id": 0, "embedding": 0}   # Don't send the embedding vector to the extension
    ).to_list(length=500)
    return {"user_id": user_id, "answers": answers}


@router.post("/{user_id}/answer")
async def save_answer(user_id: str, payload: AnswerUpdate):
    """
    Saves or updates a single answer in the user's profile.
    If scope is 'one-time', the answer is returned but not saved.
    """
    if payload.scope == "one-time":
        return {"saved": False, "message": "One-time answer, not saved to profile"}

    db = get_db()
    await db.answers.update_one(
        {"user_id": user_id, "question": payload.question},
        {"$set": {
            "user_id":  user_id,
            "question": payload.question,
            "answer":   payload.answer,
            "scope":    payload.scope,
            "embedding": None,         # Will be computed by /match when needed
        }},
        upsert=True,
    )
    return {"saved": True, "question": payload.question, "answer": payload.answer}


@router.delete("/{user_id}/answer")
async def delete_answer(user_id: str, question: str):
    """Removes a specific answer from the user's profile."""
    db     = get_db()
    result = await db.answers.delete_one({"user_id": user_id, "question": question})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Answer not found")
    return {"deleted": True, "question": question}
