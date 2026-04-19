from datetime import datetime, timezone

from flask import Blueprint, request
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import DanceReference, PracticeSession, SessionFrame, User
from ..services.analysis_service import serialize_analysis_report, upsert_analysis_report
from ..services.session_service import create_demo_session, finalize_demo_session, get_demo_state, isoformat, parse_session_id, serialize_dance, serialize_session, serialize_session_frame
from ..utils.response import error_response, success_response


bp = Blueprint("session", __name__)


def _pick_user(user_id: int | None) -> User | None:
    if user_id is not None:
        return db.session.get(User, user_id)
    return User.query.order_by(User.id.asc()).first()


def _pick_dance(dance_reference_id: int) -> DanceReference | None:
    return db.session.get(DanceReference, dance_reference_id)


@bp.post("/session/start")
def start_session():
    payload = request.get_json(silent=True) or {}
    dance_reference_id = payload.get("dance_reference_id")
    if dance_reference_id is None:
        return error_response("dance_reference_id is required", status_code=400, code="INVALID_REQUEST")

    try:
        dance_reference_id = int(dance_reference_id)
    except (TypeError, ValueError):
        return error_response("dance_reference_id must be a number", status_code=400, code="INVALID_REQUEST")

    user_id = payload.get("user_id")
    if user_id is not None:
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return error_response("user_id must be a number", status_code=400, code="INVALID_REQUEST")

    user = _pick_user(user_id)
    dance = _pick_dance(dance_reference_id)
    if user is None or dance is None:
        demo_session = create_demo_session(dance_reference_id)
        return success_response(
            data={
                "session_id": demo_session["id"],
                "dance_reference": demo_session["dance_reference"],
                "ws_url": f"http://127.0.0.1:5000/api/stream/live?session_id={demo_session['id']}",
                "started_at": demo_session["started_at"],
            },
            message="session started",
        )

    session = PracticeSession(
        user_id=user.id,
        dance_reference_id=dance.id,
        started_at=datetime.now(timezone.utc),
        session_status="active",
        unlock_avatar_render=False,
    )
    db.session.add(session)
    db.session.commit()

    session.dance_reference = dance
    return success_response(
        data={
            "session_id": str(session.id),
            "dance_reference": serialize_dance(dance),
            "ws_url": f"http://127.0.0.1:5000/api/stream/live?session_id={session.id}",
            "started_at": isoformat(session.started_at),
        },
        message="session started",
    )


@bp.post("/session/end")
def end_session():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    if session_id is None:
        return error_response("session_id is required", status_code=400, code="INVALID_REQUEST")

    session_id_str = str(session_id)
    parsed_session_id = parse_session_id(session_id_str)

    demo_state = get_demo_state(session_id_str)
    if demo_state is not None:
        final_state = finalize_demo_session(session_id_str)
        if final_state is None:
            return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")
        return success_response(
            data={
                "session": final_state.session,
                "report": final_state.report,
                "unlock_avatar_render": final_state.session["unlock_avatar_render"],
            },
            message="session ended",
        )

    if parsed_session_id is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    session = db.session.get(PracticeSession, parsed_session_id)
    if session is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    frames = (
        SessionFrame.query.filter_by(session_id=session.id)
        .order_by(SessionFrame.frame_index.asc())
        .all()
    )
    report = upsert_analysis_report(session, frames)
    session.session_status = "completed"
    session.ended_at = datetime.now(timezone.utc)
    db.session.commit()

    db.session.refresh(session)
    db.session.refresh(report)
    return success_response(
        data={
            "session": serialize_session(session),
            "report": serialize_analysis_report(report),
            "unlock_avatar_render": bool(session.unlock_avatar_render),
        },
        message="session ended",
    )


@bp.get("/session/<session_id>")
def get_session(session_id: str):
    demo_state = get_demo_state(session_id)
    if demo_state is not None:
        return success_response(data=demo_state.session)

    parsed_session_id = parse_session_id(session_id)
    if parsed_session_id is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    session = (
        PracticeSession.query.filter_by(id=parsed_session_id)
        .options(selectinload(PracticeSession.dance_reference))
        .first()
    )
    if session is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")
    return success_response(data=serialize_session(session))


@bp.get("/session/<session_id>/frames")
def get_session_frames(session_id: str):
    demo_state = get_demo_state(session_id)
    if demo_state is not None:
        return success_response(data=demo_state.frames)

    parsed_session_id = parse_session_id(session_id)
    if parsed_session_id is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    session_exists = db.session.get(PracticeSession, parsed_session_id)
    if session_exists is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    frames = (
        SessionFrame.query.filter_by(session_id=parsed_session_id)
        .order_by(SessionFrame.frame_index.asc())
        .all()
    )
    return success_response(data=[serialize_session_frame(frame) for frame in frames])
