from datetime import datetime, timezone

from flask import Blueprint, request
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import PracticeSession, User
from ..services.demo_data import DEMO_RECENT_SESSIONS, DEMO_USER
from ..utils.response import success_response


bp = Blueprint("users", __name__)


def _parse_dt(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return str(value)


def _rank_from_points(points: int) -> str:
    if points >= 5000:
        return "legend"
    if points >= 3000:
        return "star"
    if points >= 1500:
        return "performer"
    if points >= 500:
        return "dancer"
    return "rookie"


def _streak_from_sessions(user_id: int) -> int:
    # The schema does not store streaks directly, so we derive a lightweight value.
    active_days = (
        db.session.query(func.date(PracticeSession.started_at))
        .filter(PracticeSession.user_id == user_id)
        .filter(PracticeSession.session_status == "completed")
        .distinct()
        .count()
    )
    return int(active_days or 0)


def _serialize_user(user: User) -> dict:
    points = int(user.points or 0)
    return {
        "id": user.id,
        "email": user.email,
        "nickname": user.nickname,
        "avatar_id": user.avatar_id,
        "points": points,
        "is_admin": bool(getattr(user, "is_admin", False)),
        "status": user.status,
        "rank": _rank_from_points(points),
        "streak_days": _streak_from_sessions(user.id),
        "created_at": _parse_dt(user.created_at),
    }


def _fallback_user() -> dict:
    return {
        **DEMO_USER,
        "created_at": "2024-11-01T00:00:00Z",
    }


def _serialize_session(session: PracticeSession) -> dict:
    dance = getattr(session, "dance_reference", None)
    dance_reference = None
    if dance is not None:
        dance_reference = {
            "id": dance.id,
            "title": dance.title,
            "artist_name": dance.artist_name,
            "difficulty": dance.difficulty,
            "duration_seconds": dance.duration_seconds,
            "thumbnail_url": dance.thumbnail_url,
            "preview_video_url": dance.preview_video_url,
            "reference_json_path": dance.reference_json_path,
            "created_at": _parse_dt(dance.created_at),
        }

    return {
        "id": session.id,
        "user_id": session.user_id,
        "dance_reference_id": session.dance_reference_id,
        "dance_reference": dance_reference,
        "started_at": _parse_dt(session.started_at),
        "ended_at": _parse_dt(session.ended_at),
        "total_score": float(session.total_score) if session.total_score is not None else None,
        "lowest_section_score": float(session.lowest_section_score)
        if session.lowest_section_score is not None
        else None,
        "unlock_avatar_render": bool(session.unlock_avatar_render),
        "session_status": {
            "active": "in_progress",
            "completed": "completed",
            "abandoned": "aborted",
        }.get(session.session_status, session.session_status),
        "created_at": _parse_dt(session.created_at),
    }


@bp.get("/users/me")
def get_me():
    user = User.query.order_by(User.id.asc()).first()
    if user is None:
        return success_response(data=_fallback_user())
    return success_response(data=_serialize_user(user))


@bp.get("/users/me/sessions")
def get_recent_sessions():
    limit = request.args.get("limit", default=10, type=int)
    user = User.query.order_by(User.id.asc()).first()
    if user is None:
        return success_response(data=DEMO_RECENT_SESSIONS[:limit])

    sessions = (
        PracticeSession.query.filter_by(user_id=user.id)
        .options(selectinload(PracticeSession.dance_reference))
        .order_by(PracticeSession.started_at.desc(), PracticeSession.id.desc())
        .limit(limit)
        .all()
    )
    if not sessions:
        return success_response(data=[])
    return success_response(data=[_serialize_session(session) for session in sessions])
