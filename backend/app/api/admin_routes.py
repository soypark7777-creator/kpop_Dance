from __future__ import annotations

from datetime import datetime

from flask import Blueprint, request
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import AnalysisReport, AvatarRender, DanceReference, PracticeSession, RewardItem, User
from ..services.video_upload_service import list_video_uploads
from ..services.security_service import rate_limit, require_auth
from ..utils.response import error_response, success_response


bp = Blueprint("admin", __name__)


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "nickname": user.nickname,
        "avatar_id": user.avatar_id,
        "points": int(user.points or 0),
        "is_admin": bool(getattr(user, "is_admin", False)),
        "status": user.status,
        "created_at": user.created_at.isoformat().replace("+00:00", "Z") if user.created_at else None,
    }


def _serialize_session(session: PracticeSession) -> dict:
    report = AnalysisReport.query.filter_by(session_id=session.id).first()
    report_json = report.report_json if report and isinstance(report.report_json, dict) else {}
    most_wrong_joints = report_json.get("most_wrong_joints") if isinstance(report_json.get("most_wrong_joints"), list) else []
    motion_similarity = report_json.get("motion_similarity")
    average_angle_error = report_json.get("average_angle_error")
    return {
        "id": session.id,
        "user_id": session.user_id,
        "dance_reference_id": session.dance_reference_id,
        "started_at": session.started_at.isoformat().replace("+00:00", "Z") if session.started_at else None,
        "ended_at": session.ended_at.isoformat().replace("+00:00", "Z") if session.ended_at else None,
        "total_score": float(session.total_score) if session.total_score is not None else None,
        "lowest_section_score": float(session.lowest_section_score) if session.lowest_section_score is not None else None,
        "unlock_avatar_render": bool(session.unlock_avatar_render),
        "session_status": session.session_status,
        "motion_similarity": float(motion_similarity) if motion_similarity is not None else None,
        "average_angle_error": float(average_angle_error) if average_angle_error is not None else None,
        "unstable_joint_count": len(most_wrong_joints),
        "most_wrong_joints": most_wrong_joints,
        "created_at": session.created_at.isoformat().replace("+00:00", "Z") if session.created_at else None,
    }


def _serialize_render(render: AvatarRender) -> dict:
    return {
        "id": render.id,
        "user_id": render.user_id,
        "session_id": render.session_id,
        "avatar_id": render.avatar_id,
        "stage_theme_id": render.stage_theme_id,
        "costume_id": render.costume_id,
        "render_status": render.render_status,
        "output_url": render.output_url,
        "requested_at": render.requested_at.isoformat().replace("+00:00", "Z") if render.requested_at else None,
        "completed_at": render.completed_at.isoformat().replace("+00:00", "Z") if render.completed_at else None,
        "created_at": render.created_at.isoformat().replace("+00:00", "Z") if render.created_at else None,
    }


def _serialize_reward(item: RewardItem) -> dict:
    return {
        "id": item.id,
        "item_type": item.item_type,
        "item_name": item.item_name,
        "price_points": item.price_points,
        "is_premium": bool(item.is_premium),
        "metadata_json": item.metadata_json or {},
        "created_at": item.created_at.isoformat().replace("+00:00", "Z") if item.created_at else None,
    }


def _parse_datetime(value: object):
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


@bp.get("/admin/dashboard")
@rate_limit("admin_dashboard", limit=30, window_seconds=60)
@require_auth(admin=True)
def dashboard():
    user_count = db.session.query(func.count(User.id)).scalar() or 0
    admin_count = db.session.query(func.count(User.id)).filter(User.is_admin.is_(True)).scalar() or 0
    session_count = db.session.query(func.count(PracticeSession.id)).scalar() or 0
    completed_sessions = (
        db.session.query(func.count(PracticeSession.id))
        .filter(PracticeSession.session_status == "completed")
        .scalar()
        or 0
    )
    render_count = db.session.query(func.count(AvatarRender.id)).scalar() or 0
    report_count = db.session.query(func.count(AnalysisReport.id)).scalar() or 0
    reward_count = db.session.query(func.count(RewardItem.id)).scalar() or 0
    dance_count = db.session.query(func.count(DanceReference.id)).scalar() or 0

    recent_sessions = (
        PracticeSession.query.options(selectinload(PracticeSession.dance_reference))
        .order_by(PracticeSession.started_at.desc())
        .limit(5)
        .all()
    )
    top_dances = (
        db.session.query(
            DanceReference.id,
            DanceReference.title,
            func.count(PracticeSession.id).label("session_count"),
        )
        .join(PracticeSession, PracticeSession.dance_reference_id == DanceReference.id)
        .group_by(DanceReference.id)
        .order_by(func.count(PracticeSession.id).desc(), DanceReference.id.asc())
        .limit(5)
        .all()
    )

    return success_response(
        data={
            "counts": {
                "users": int(user_count),
                "admins": int(admin_count),
                "sessions": int(session_count),
                "completed_sessions": int(completed_sessions),
                "reports": int(report_count),
                "renders": int(render_count),
                "rewards": int(reward_count),
                "dance_references": int(dance_count),
            },
            "recent_sessions": [_serialize_session(session) for session in recent_sessions],
            "top_dances": [
                {
                    "id": row.id,
                    "title": row.title,
                    "session_count": int(row.session_count or 0),
                }
                for row in top_dances
            ],
        }
    )


@bp.get("/admin/users")
@rate_limit("admin_users", limit=60, window_seconds=60)
@require_auth(admin=True)
def list_users():
    users = User.query.order_by(User.id.desc()).all()
    return success_response(data=[_serialize_user(user) for user in users])


@bp.patch("/admin/users/<int:user_id>")
@rate_limit("admin_user_update", limit=30, window_seconds=60)
@require_auth(admin=True)
def update_user(user_id: int):
    payload = request.get_json(silent=True) or {}
    user = db.session.get(User, user_id)
    if user is None:
        return error_response("user not found", status_code=404, code="USER_NOT_FOUND")

    allowed_status = {"active", "inactive", "suspended"}
    if "status" in payload:
        status = payload["status"]
        if status not in allowed_status:
            return error_response("invalid status", status_code=400, code="INVALID_REQUEST")
        user.status = status
    if "is_admin" in payload:
        user.is_admin = bool(payload["is_admin"])
    if "points" in payload:
        try:
            user.points = max(0, int(payload["points"]))
        except (TypeError, ValueError):
            return error_response("points must be a number", status_code=400, code="INVALID_REQUEST")
    if "nickname" in payload and payload["nickname"]:
        user.nickname = str(payload["nickname"]).strip()

    db.session.commit()
    db.session.refresh(user)
    return success_response(data=_serialize_user(user), message="user updated")


@bp.get("/admin/sessions")
@rate_limit("admin_sessions", limit=60, window_seconds=60)
@require_auth(admin=True)
def list_sessions():
    status = request.args.get("status")
    min_score = request.args.get("min_score", type=float)
    max_error = request.args.get("max_error", type=float)
    unstable_joint = request.args.get("unstable_joint")
    unstable_joint_query = unstable_joint.strip().lower() if unstable_joint else ""
    query = PracticeSession.query.options(selectinload(PracticeSession.dance_reference))
    if status:
        query = query.filter(PracticeSession.session_status == status)
    sessions = query.order_by(PracticeSession.started_at.desc()).limit(100).all()
    payload = []
    for session in sessions:
        serialized = _serialize_session(session)
        if min_score is not None and (serialized.get("total_score") is None or float(serialized["total_score"]) < min_score):
            continue
        if max_error is not None and (serialized.get("average_angle_error") is None or float(serialized["average_angle_error"]) > max_error):
            continue
        if unstable_joint_query and not any(
            unstable_joint_query in str(joint).lower() for joint in (serialized.get("most_wrong_joints") or [])
        ):
            continue
        payload.append(serialized)
    return success_response(data=payload)


@bp.patch("/admin/sessions/<int:session_id>")
@rate_limit("admin_session_update", limit=30, window_seconds=60)
@require_auth(admin=True)
def update_session(session_id: int):
    payload = request.get_json(silent=True) or {}
    session = db.session.get(PracticeSession, session_id)
    if session is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    allowed_status = {"active", "completed", "abandoned"}
    if "session_status" in payload:
        status = payload["session_status"]
        if status not in allowed_status:
            return error_response("invalid session status", status_code=400, code="INVALID_REQUEST")
        session.session_status = status

    if "started_at" in payload:
        started_at = _parse_datetime(payload["started_at"])
        if started_at is None:
            return error_response("started_at must be an ISO datetime", status_code=400, code="INVALID_REQUEST")
        session.started_at = started_at

    if "ended_at" in payload:
        ended_at = _parse_datetime(payload["ended_at"])
        if ended_at is None and payload["ended_at"] not in (None, ""):
            return error_response("ended_at must be an ISO datetime", status_code=400, code="INVALID_REQUEST")
        session.ended_at = ended_at

    if "total_score" in payload:
        try:
            session.total_score = float(payload["total_score"])
        except (TypeError, ValueError):
            return error_response("total_score must be a number", status_code=400, code="INVALID_REQUEST")

    if "lowest_section_score" in payload:
        try:
            session.lowest_section_score = float(payload["lowest_section_score"])
        except (TypeError, ValueError):
            return error_response("lowest_section_score must be a number", status_code=400, code="INVALID_REQUEST")

    if "unlock_avatar_render" in payload:
        session.unlock_avatar_render = bool(payload["unlock_avatar_render"])

    db.session.commit()
    db.session.refresh(session)
    return success_response(data=_serialize_session(session), message="session updated")


@bp.get("/admin/renders")
@rate_limit("admin_renders", limit=60, window_seconds=60)
@require_auth(admin=True)
def list_renders():
    renders = AvatarRender.query.order_by(AvatarRender.created_at.desc()).limit(100).all()
    return success_response(data=[_serialize_render(render) for render in renders])


@bp.get("/admin/rewards")
@rate_limit("admin_rewards", limit=60, window_seconds=60)
@require_auth(admin=True)
def list_rewards():
    rewards = RewardItem.query.order_by(RewardItem.id.asc()).all()
    return success_response(data=[_serialize_reward(item) for item in rewards])


@bp.get("/admin/uploads")
@rate_limit("admin_uploads", limit=60, window_seconds=60)
@require_auth(admin=True)
def list_uploads():
    status = request.args.get("status")
    query = (request.args.get("query") or "").strip().lower()
    analysis_ready = request.args.get("analysis_ready")
    min_score = request.args.get("min_score", type=float)
    uploads = list_video_uploads()

    payload = []
    for upload in uploads:
        upload_status = str(upload.get("status") or "")
        if status and upload_status != status:
            continue
        if analysis_ready in {"true", "false"}:
            desired = analysis_ready == "true"
            if bool(upload.get("analysis_ready")) != desired:
                continue
        if min_score is not None:
            report = upload.get("analysis_report") or {}
            report_score = report.get("total_score")
            if report_score is None or float(report_score) < min_score:
                continue
        if query:
            haystack = " ".join(
                str(value)
                for value in [
                    upload.get("id"),
                    upload.get("original_filename"),
                    upload.get("message"),
                    upload.get("analysis_source"),
                    upload.get("report_url"),
                ]
                if value is not None
            ).lower()
            if query not in haystack:
                continue
        payload.append(upload)

    return success_response(data=payload)
