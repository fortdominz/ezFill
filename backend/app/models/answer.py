from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Answer(BaseModel):
    """One saved answer in a user's profile."""
    question: str                        # e.g. "Are you authorized to work in the US?"
    answer: str                          # e.g. "Yes"
    embedding: Optional[List[float]] = None  # Gemini vector — added when computed
    scope: str = "profile"              # "profile" | "one-time"

class AnswerUpdate(BaseModel):
    """Payload for updating a single answer."""
    question: str
    answer: str
    scope: str = "profile"             # whether to save to profile or just use once

class MatchRequest(BaseModel):
    """Payload the extension sends when it finds a field on the page."""
    user_id: str
    question: str                       # The label/question text found on the page

class MatchResponse(BaseModel):
    """What the backend returns after matching."""
    matched: bool
    answer: Optional[str] = None
    confidence: Optional[float] = None  # cosine similarity score
    matched_question: Optional[str] = None  # the stored question it matched to
