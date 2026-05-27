from pydantic import BaseModel
from typing import Optional, List


class QuestionIn(BaseModel):
    """Sent by extension when a new field is encountered."""
    user_id:  str
    question: str   # The label text from the page


class QuestionOut(BaseModel):
    """Returned after saving/finding a question."""
    question_id: str
    question:    str


class MatchRequest(BaseModel):
    user_id:  str
    question: str   # Field label found on page


class MatchResponse(BaseModel):
    matched:          bool
    question_id:      Optional[str]   = None  # Key for local answer lookup
    confidence:       Optional[float] = None
    matched_question: Optional[str]   = None  # For display in review phase
