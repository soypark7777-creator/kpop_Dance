from datetime import datetime, timezone

from flask import Blueprint

from ..utils.response import success_response


bp = Blueprint("health", __name__)


@bp.get("/health")
def health_check():
    data = {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return success_response(data=data)

