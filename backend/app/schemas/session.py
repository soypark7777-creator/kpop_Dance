from __future__ import annotations

from pydantic import BaseModel


class StartSessionRequest(BaseModel):
    dance_reference_id: int
    user_id: int | None = None


class EndSessionRequest(BaseModel):
    session_id: str

