from datetime import datetime, timezone
from typing import Any

from flask import jsonify


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def success_response(data: Any = None, message: str = "ok", status_code: int = 200):
    return (
        jsonify(
            {
                "success": True,
                "data": {} if data is None else data,
                "message": message,
                "timestamp": utc_timestamp(),
            }
        ),
        status_code,
    )


def error_response(message: str, status_code: int = 400, code: str | None = None):
    error_code = code or "ERROR"
    payload = {
        "success": False,
        "error": message,
        "code": error_code,
        "status": status_code,
        "message": message,
        "timestamp": utc_timestamp(),
    }
    return jsonify(payload), status_code

