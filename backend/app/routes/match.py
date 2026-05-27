from fastapi import APIRouter
from app.db import get_db
from app.models.question import MatchRequest, MatchResponse

router = APIRouter(prefix="/match", tags=["match"])

THRESHOLD_AUTO   = 0.85
THRESHOLD_REVIEW = 0.70


@router.post("", response_model=MatchResponse)
async def match_question(payload: MatchRequest):
    """
    Given a field label found on a job application page, finds the closest
    question the user has answered before.

    Returns the question_id — the extension uses this to look up the
    answer from chrome.storage.local. The actual answer never touches this server.

    TODO: Replace stub word-overlap scoring with Gemini cosine similarity.
    """
    db        = get_db()
    questions = await db.questions.find({"user_id": payload.user_id}).to_list(length=1000)

    if not questions:
        return MatchResponse(matched=False)

    # ── Stub matching (word overlap) ─────────────────────────────────────────
    # Will be replaced with Gemini embedding cosine similarity
    q_lower    = payload.question.lower()
    best       = None
    best_score = 0.0

    for saved in questions:
        s_words = set(saved["question"].lower().split())
        q_words = set(q_lower.split())
        if not q_words or not s_words:
            continue
        score = len(q_words & s_words) / len(q_words | s_words)
        if score > best_score:
            best_score = score
            best       = saved

    if best is None or best_score < 0.3:
        return MatchResponse(matched=False)

    return MatchResponse(
        matched=True,
        question_id=best["question_id"],
        confidence=round(best_score, 3),
        matched_question=best["question"],
    )
