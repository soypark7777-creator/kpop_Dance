from __future__ import annotations

from flask import Blueprint, current_app, request
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from ..models import PracticeSession, User
from ..services.demo_data import DEMO_ADMIN
from ..services.security_service import auth_claims_from_user, current_identity, issue_access_token, rate_limit, require_auth
from ..utils.response import error_response, success_response


bp = Blueprint("auth", __name__)


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
    completed_count = (
        db.session.query(func.count(func.distinct(func.date(PracticeSession.started_at))))
        .filter(PracticeSession.user_id == user_id)
        .filter(PracticeSession.session_status == "completed")
    )
    return int(completed_count.scalar() or 0)


def _serialize_user(user: User) -> dict:
    points = int(user.points or 0)
    return {
        "id": user.id,
        "email": user.email,
        "nickname": user.nickname,
        "avatar_id": user.avatar_id or "starter_avatar",
        "points": points,
        "is_admin": bool(getattr(user, "is_admin", False)),
        "status": user.status,
        "rank": _rank_from_points(points),
        "streak_days": _streak_from_sessions(user.id),
        "created_at": user.created_at.isoformat().replace("+00:00", "Z") if user.created_at else None,
    }


def _identity_to_user(claims: dict | None) -> dict:
    claims = claims or {}
    user_id = claims.get("sub")
    if user_id is not None:
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            user_id = None

    if user_id is not None:
        user = User.query.filter_by(id=user_id).first()
        if user is not None:
            return _serialize_user(user)

    if claims.get("is_admin"):
        return DEMO_ADMIN

    return {
        "id": 0,
        "email": claims.get("email") or "",
        "nickname": claims.get("nickname") or "",
        "avatar_id": "starter_avatar",
        "points": 0,
        "is_admin": False,
        "status": "active",
        "rank": "rookie",
        "streak_days": 0,
        "created_at": None,
    }


@bp.post("/auth/login")
@rate_limit("auth_login", limit=5, window_seconds=60)
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return error_response("email and password are required", status_code=400, code="INVALID_REQUEST")

    user = User.query.filter(db.func.lower(User.email) == email).first()
    if user is None:
        bootstrap_email = current_app.config["ADMIN_BOOTSTRAP_EMAIL"].strip().lower()
        bootstrap_password = current_app.config["ADMIN_BOOTSTRAP_PASSWORD"]
        if email == bootstrap_email and password == bootstrap_password:
            token = issue_access_token(DEMO_ADMIN)
            return success_response(
                data={
                    "access_token": token,
                    "token_type": "Bearer",
                    "user": DEMO_ADMIN,
                },
                message="login ok",
            )
        return error_response("invalid credentials", status_code=401, code="INVALID_CREDENTIALS")

    if not check_password_hash(user.password_hash, password):
        return error_response("invalid credentials", status_code=401, code="INVALID_CREDENTIALS")

    if user.status != "active":
        return error_response("user is not active", status_code=403, code="ACCOUNT_DISABLED")

    claims = auth_claims_from_user(user)
    token = issue_access_token(claims)
    return success_response(
        data={
            "access_token": token,
            "token_type": "Bearer",
            "user": _serialize_user(user),
        },
        message="login ok",
    )


@bp.post("/auth/register")
@rate_limit("auth_register", limit=5, window_seconds=60)
def register():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    password_confirm = payload.get("password_confirm")
    nickname = (payload.get("nickname") or "").strip()
    avatar_id = (payload.get("avatar_id") or "starter_avatar").strip()

    if not email or not password or not nickname:
        return error_response(
            "email, password and nickname are required",
            status_code=400,
            code="INVALID_REQUEST",
        )

    if len(password) < 8:
        return error_response("password must be at least 8 characters", status_code=400, code="WEAK_PASSWORD")

    if password_confirm is not None and password_confirm != password:
        return error_response("password confirmation does not match", status_code=400, code="PASSWORD_MISMATCH")

    bootstrap_email = current_app.config["ADMIN_BOOTSTRAP_EMAIL"].strip().lower()
    if email == bootstrap_email:
        return error_response("this email is reserved", status_code=409, code="EMAIL_RESERVED")

    if User.query.filter(db.func.lower(User.email) == email).first() is not None:
        return error_response("email already exists", status_code=409, code="EMAIL_EXISTS")

    if User.query.filter(db.func.lower(User.nickname) == nickname.lower()).first() is not None:
        return error_response("nickname already exists", status_code=409, code="NICKNAME_EXISTS")

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        nickname=nickname,
        avatar_id=avatar_id or "starter_avatar",
        points=0,
        is_admin=False,
        status="active",
    )
    db.session.add(user)
    db.session.commit()

    claims = auth_claims_from_user(user)
    token = issue_access_token(claims)
    return success_response(
        data={
            "access_token": token,
            "token_type": "Bearer",
            "user": _serialize_user(user),
        },
        message="register ok",
        status_code=201,
    )


@bp.get("/auth/me")
@require_auth()
def me():
    claims = current_identity() or {}
    return success_response(data=_identity_to_user(claims))
