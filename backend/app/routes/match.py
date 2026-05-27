from fastapi import APIRouter
from app.db import get_db
from app.models.answer import MatchRequest, MatchResponse

router = APIRouter(prefix="/match", tags=["match"])

# Similarity thresholds (tunable)
THRESHOLD_AUTO   = 0.85   # Fill silently
THRESHOLD_REVIEW = 0.70   # Flag in review phase


@router.post("", response_model=MatchResponse)
async def match_question(payload: MatchRequest):
    """
    Given a question found on a job application page,
    find the closest saved answer in the user's profile using embeddings.

    TODO: Gemini embedding computation not wired yet.
          Currently falls back to basic string containment check for testing.
    """
    db      = get_db()
    answers = await db.answers.find({"user_id": payload.user_id}).to_list(length=500)

    if not answers:
        return MatchResponse(matched=False)

    # ── Stub matching (string containment) ───────────────────────────────────
    # Replace this block with Gemini cosine similarity once embeddings are set up
    question_lower = payload.question.lower()
    best_match     = None
    best_score     = 0.0

    for saved in answers:
        saved_q = saved["question"].lower()
        # Simple overlap score — word intersection / union
        q_words = set(question_lower.split())
        s_words = set(saved_q.split())
        if not q_words or not s_words:
            continue
        score = len(q_words & s_words) / len(q_words | s_words)
        if score > best_score:
            best_score = score
            best_match = saved

    if best_match is None or best_score < 0.3:
        return MatchResponse(matched=False)

    # Map stub score to thresholds (will be real cosine similarity after Gemini)
    return MatchResponse(
        matched=True,
        answer=best_match["answer"],
        confidence=round(best_score, 3),
        matched_question=best_match["question"],
    )
