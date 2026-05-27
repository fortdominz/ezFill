import uuid
from fastapi import APIRouter
from app.db import get_db
from app.models.question import QuestionIn, QuestionOut

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("", response_model=QuestionOut)
async def save_question(payload: QuestionIn):
    """
    Called when a new field label is encountered on a job application.
    Stores the question text (NOT the answer — that stays local on device).
    Returns a stable question_id the extension uses as a key in chrome.storage.local.

    If this exact question was seen before for this user, returns the existing record.
    """
    db = get_db()

    # Check if we already have this exact question for this user
    existing = await db.questions.find_one({
        "user_id":  payload.user_id,
        "question": payload.question,
    })
    if existing:
        return QuestionOut(question_id=existing["question_id"], question=existing["question"])

    # New question — assign a stable ID and store it
    question_id = f"q_{uuid.uuid4().hex[:12]}"
    await db.questions.insert_one({
        "question_id": question_id,
        "user_id":     payload.user_id,
        "question":    payload.question,
        "embedding":   None,   # TODO: compute Gemini embedding here
    })

    return QuestionOut(question_id=question_id, question=payload.question)


@router.get("/{user_id}")
async def get_questions(user_id: str):
    """Returns all question records for a user (question text only, no answers)."""
    db        = get_db()
    questions = await db.questions.find(
        {"user_id": user_id},
        {"_id": 0, "embedding": 0}
    ).to_list(length=1000)
    return {"user_id": user_id, "questions": questions}


@router.delete("/{user_id}")
async def delete_user_questions(user_id: str):
    """
    Deletes all question records for a user.
    Called when user requests full data deletion.
    Their answers are already local — they clear those by clicking 'Delete my data'.
    """
    db     = get_db()
    result = await db.questions.delete_many({"user_id": user_id})
    return {"deleted": result.deleted_count}
