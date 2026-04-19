from __future__ import annotations

from ..models import PracticeSession, SessionFrame


def list_recent_sessions(user_id: int | None = None, limit: int = 10):
    query = PracticeSession.query
    if user_id is not None:
        query = query.filter_by(user_id=user_id)
    return query.order_by(PracticeSession.started_at.desc(), PracticeSession.id.desc()).limit(limit).all()


def get_session_by_id(session_id: int) -> PracticeSession | None:
    return PracticeSession.query.filter_by(id=session_id).first()


def list_session_frames(session_id: int):
    return SessionFrame.query.filter_by(session_id=session_id).order_by(SessionFrame.frame_index.asc()).all()

