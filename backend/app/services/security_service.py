from __future__ import annotations

import base64
import functools
import hashlib
import hmac
import json
import time
from typing import Any, Callable

from flask import current_app, g, request

from ..utils.response import error_response

_RATE_LIMIT_BUCKETS: dict[str, list[float]] = {}


class SecurityError(Exception):
    pass


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def _sign(payload: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def issue_access_token(claims: dict[str, Any], ttl_minutes: int | None = None) -> str:
    ttl_minutes = ttl_minutes or int(current_app.config["JWT_TTL_MINUTES"])
    now = int(time.time())
    payload = {
        **claims,
        "iat": now,
        "exp": now + (ttl_minutes * 60),
    }
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    body = _b64encode(raw)
    signature = _sign(raw, current_app.config["SECRET_KEY"])
    return f"{body}.{signature}"


def verify_access_token(token: str) -> dict[str, Any]:
    try:
        body, signature = token.split(".", 1)
        raw = _b64decode(body)
        expected = _sign(raw, current_app.config["SECRET_KEY"])
        if not hmac.compare_digest(signature, expected):
            raise SecurityError("invalid token signature")
        payload = json.loads(raw.decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise SecurityError("token expired")
        return payload
    except ValueError as exc:
        raise SecurityError("invalid token format") from exc
    except json.JSONDecodeError as exc:
        raise SecurityError("invalid token payload") from exc


def get_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()
    return None


def auth_claims_from_user(user) -> dict[str, Any]:
    return {
        "sub": str(user.id),
        "email": user.email,
        "nickname": user.nickname,
        "is_admin": bool(getattr(user, "is_admin", False)),
    }


def require_auth(admin: bool = False):
    def decorator(view: Callable):
        @functools.wraps(view)
        def wrapper(*args, **kwargs):
            token = get_bearer_token()
            if not token:
                raise SecurityError("missing bearer token")
            claims = verify_access_token(token)
            if admin and not bool(claims.get("is_admin")):
                raise SecurityError("admin access required")
            g.auth_claims = claims
            return view(*args, **kwargs)

        return wrapper

    return decorator


def rate_limit(bucket_name: str | None = None, limit: int | None = None, window_seconds: int | None = None):
    def decorator(view: Callable):
        @functools.wraps(view)
        def wrapper(*args, **kwargs):
            max_requests = limit or int(current_app.config["RATE_LIMIT_MAX_REQUESTS"])
            window = window_seconds or int(current_app.config["RATE_LIMIT_WINDOW_SECONDS"])
            key = bucket_name or request.endpoint or view.__name__
            ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
            bucket_key = f"{key}:{ip}"
            now = time.time()
            bucket = [ts for ts in _RATE_LIMIT_BUCKETS.get(bucket_key, []) if now - ts < window]
            if len(bucket) >= max_requests:
                return error_response("rate limit exceeded", status_code=429, code="RATE_LIMITED")
            bucket.append(now)
            _RATE_LIMIT_BUCKETS[bucket_key] = bucket
            return view(*args, **kwargs)

        return wrapper

    return decorator


def current_identity() -> dict[str, Any] | None:
    claims = getattr(g, "auth_claims", None)
    return claims if isinstance(claims, dict) else None
