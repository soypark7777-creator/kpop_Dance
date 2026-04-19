from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from ..extensions import db
from ..models import AvatarRender, PracticeSession, RewardItem, SessionFrame, User
from .session_service import get_demo_state, parse_session_id, serialize_session_frame


@dataclass
class DemoAvatarRenderState:
    render: dict[str, Any]
    ready_at: datetime


DEMO_AVATAR_RENDER_STORE: dict[int, DemoAvatarRenderState] = {}
DEMO_AVATAR_RENDER_ID = 1000


DEMO_AVATAR_ITEMS = [
    {
        "id": "avatar_001",
        "name": "Neon Idol",
        "type": "avatar",
        "rarity": "common",
        "thumbnail_url": "/mock/avatar/neon-idol.png",
        "description": "기본 제공 아바타",
        "is_locked": False,
        "required_score": 0,
        "required_points": 0,
        "preview_url": "/mock/avatar/neon-idol-preview.mp4",
    },
    {
        "id": "avatar_002",
        "name": "Galaxy Star",
        "type": "avatar",
        "rarity": "rare",
        "thumbnail_url": "/mock/avatar/galaxy-star.png",
        "description": "80점 이상 달성 시 해금",
        "is_locked": True,
        "required_score": 80,
        "required_points": 0,
        "preview_url": "/mock/avatar/galaxy-star-preview.mp4",
    },
    {
        "id": "avatar_003",
        "name": "Royal Stage",
        "type": "avatar",
        "rarity": "epic",
        "thumbnail_url": "/mock/avatar/royal-stage.png",
        "description": "포인트로 획득 가능한 프리미엄 아바타",
        "is_locked": True,
        "required_score": 0,
        "required_points": 2200,
        "preview_url": "/mock/avatar/royal-stage-preview.mp4",
    },
    {
        "id": "stage_001",
        "name": "Midnight Blue",
        "type": "stage",
        "rarity": "common",
        "thumbnail_url": "/mock/stage/midnight-blue.png",
        "description": "차분한 네온 스테이지",
        "is_locked": False,
        "required_score": 0,
        "required_points": 0,
        "preview_url": "/mock/stage/midnight-blue-preview.mp4",
    },
    {
        "id": "stage_002",
        "name": "Starlight Dome",
        "type": "stage",
        "rarity": "rare",
        "thumbnail_url": "/mock/stage/starlight-dome.png",
        "description": "반짝이는 별빛 돔",
        "is_locked": True,
        "required_score": 75,
        "required_points": 0,
        "preview_url": "/mock/stage/starlight-dome-preview.mp4",
    },
    {
        "id": "costume_001",
        "name": "Black Spark",
        "type": "costume",
        "rarity": "common",
        "thumbnail_url": "/mock/costume/black-spark.png",
        "description": "기본 무대 의상",
        "is_locked": False,
        "required_score": 0,
        "required_points": 0,
        "preview_url": "/mock/costume/black-spark-preview.mp4",
    },
    {
        "id": "costume_002",
        "name": "Hologram Vogue",
        "type": "costume",
        "rarity": "legendary",
        "thumbnail_url": "/mock/costume/hologram-vogue.png",
        "description": "점수와 포인트가 모두 필요한 레전더리 의상",
        "is_locked": True,
        "required_score": 85,
        "required_points": 3500,
        "preview_url": "/mock/costume/hologram-vogue-preview.mp4",
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalize_render_status(status: str) -> str:
    return {
        "pending": "pending",
        "rendering": "processing",
        "completed": "completed",
        "failed": "failed",
    }.get(status, status)


def _infer_item_lock(item: dict[str, Any], user_points: int, best_score: float) -> bool:
    required_score = float(item.get("required_score") or 0)
    required_points = int(item.get("required_points") or 0)
    if required_score and best_score < required_score:
        return True
    if required_points and user_points < required_points:
        return True
    return bool(item.get("is_locked", False))


def _serialize_demo_item(item: dict[str, Any], user_points: int, best_score: float) -> dict[str, Any]:
    return {
        "id": item["id"],
        "name": item["name"],
        "type": item["type"],
        "rarity": item["rarity"],
        "thumbnail_url": item["thumbnail_url"],
        "description": item.get("description"),
        "is_locked": _infer_item_lock(item, user_points, best_score),
        "required_score": item.get("required_score"),
        "required_points": item.get("required_points"),
        "preview_url": item.get("preview_url"),
    }


def _reward_item_to_avatar_item(item: RewardItem, user_points: int, best_score: float) -> dict[str, Any]:
    meta = item.metadata_json or {}
    required_score = meta.get("required_score")
    required_points = meta.get("required_points")
    return {
        "id": meta.get("item_id") or f"{item.item_type}_{item.id}",
        "name": item.item_name,
        "type": item.item_type,
        "rarity": meta.get("rarity", "common"),
        "thumbnail_url": meta.get("thumbnail_url", ""),
        "description": meta.get("description"),
        "is_locked": _infer_item_lock(
            {
                "is_locked": meta.get("is_locked", False),
                "required_score": required_score,
                "required_points": required_points,
            },
            user_points,
            best_score,
        ),
        "required_score": required_score,
        "required_points": required_points,
        "preview_url": meta.get("preview_url"),
    }


def get_avatar_items(item_type: str | None = None, user_points: int = 0, best_score: float = 0.0) -> list[dict[str, Any]]:
    reward_items = RewardItem.query.order_by(RewardItem.id.asc()).all()
    items = [
        _reward_item_to_avatar_item(item, user_points, best_score)
        for item in reward_items
        if item_type is None or item.item_type == item_type
    ]
    if items:
        return items

    return [
        _serialize_demo_item(item, user_points, best_score)
        for item in DEMO_AVATAR_ITEMS
        if item_type is None or item["type"] == item_type
    ]


def _build_render_payload(
    render_id: int,
    user_id: int,
    session_id: int,
    avatar_id: str,
    stage_theme_id: str,
    costume_id: str,
    status: str,
    output_url: str | None = None,
    requested_at: str | None = None,
    completed_at: str | None = None,
) -> dict[str, Any]:
    return {
        "id": render_id,
        "user_id": user_id,
        "session_id": session_id,
        "avatar_id": avatar_id,
        "stage_theme_id": stage_theme_id,
        "costume_id": costume_id,
        "render_status": _normalize_render_status(status),
        "output_url": output_url,
        "requested_at": requested_at or now_iso(),
        "completed_at": completed_at,
        "created_at": now_iso(),
    }


def _demo_render_status(render_id: int) -> dict[str, Any] | None:
    state = DEMO_AVATAR_RENDER_STORE.get(render_id)
    if state is None:
        return None

    now = datetime.now(timezone.utc)
    elapsed = (now - state.ready_at).total_seconds()
    if elapsed >= 3:
        state.render["render_status"] = "completed"
        state.render["output_url"] = f"/mock/renders/{render_id}.mp4"
        state.render["completed_at"] = now_iso()
    elif elapsed >= 1:
        state.render["render_status"] = "processing"
    else:
        state.render["render_status"] = "pending"
    return state.render


def _serialize_model_render(render: AvatarRender) -> dict[str, Any]:
    return {
        "id": render.id,
        "user_id": render.user_id,
        "session_id": render.session_id,
        "avatar_id": render.avatar_id,
        "stage_theme_id": render.stage_theme_id,
        "costume_id": render.costume_id,
        "render_status": _normalize_render_status(render.render_status),
        "output_url": render.output_url,
        "requested_at": render.requested_at.isoformat().replace("+00:00", "Z")
        if render.requested_at
        else now_iso(),
        "completed_at": render.completed_at.isoformat().replace("+00:00", "Z")
        if render.completed_at
        else None,
        "created_at": render.created_at.isoformat().replace("+00:00", "Z")
        if render.created_at
        else now_iso(),
    }


def create_avatar_render(
    session_identifier: str | int,
    avatar_id: str,
    stage_theme_id: str,
    costume_id: str,
) -> dict[str, Any]:
    session_id_str = str(session_identifier)
    demo_state = get_demo_state(session_id_str)

    if demo_state is not None:
        global DEMO_AVATAR_RENDER_ID
        DEMO_AVATAR_RENDER_ID += 1
        render_id = DEMO_AVATAR_RENDER_ID
        demo_session = demo_state.session
        payload = _build_render_payload(
            render_id,
            int(demo_session.get("user_id") or 1),
            0,
            avatar_id,
            stage_theme_id,
            costume_id,
            "pending",
        )
        DEMO_AVATAR_RENDER_STORE[render_id] = DemoAvatarRenderState(
            render=payload,
            ready_at=datetime.now(timezone.utc),
        )
        return payload

    parsed_session_id = parse_session_id(session_id_str)
    if parsed_session_id is None:
        raise ValueError("session not found")

    session = PracticeSession.query.filter_by(id=parsed_session_id).first()
    if session is None:
        raise ValueError("session not found")

    user = db.session.get(User, session.user_id)
    user_id = user.id if user else session.user_id
    render = AvatarRender(
        user_id=user_id,
        session_id=session.id,
        avatar_id=avatar_id,
        stage_theme_id=stage_theme_id,
        costume_id=costume_id,
        render_status="pending",
        output_url=None,
    )
    db.session.add(render)
    db.session.commit()
    db.session.refresh(render)
    return _serialize_model_render(render)


def get_avatar_render(render_identifier: int) -> dict[str, Any] | None:
    demo_render = _demo_render_status(render_identifier)
    if demo_render is not None:
        return demo_render

    render = db.session.get(AvatarRender, render_identifier)
    if render is None:
        return None

    started_at = _as_utc(render.requested_at) or _as_utc(render.created_at) or datetime.now(timezone.utc)
    elapsed_seconds = (datetime.now(timezone.utc) - started_at).total_seconds()
    if render.render_status in {"pending", "rendering"}:
        if elapsed_seconds >= 2:
            render.render_status = "completed"
            render.output_url = render.output_url or f"/mock/renders/{render.id}.mp4"
            render.completed_at = render.completed_at or datetime.now(timezone.utc)
        else:
            render.render_status = "rendering"
    db.session.commit()
    db.session.refresh(render)
    return _serialize_model_render(render)


def build_unity_export(session_identifier: str | int) -> dict[str, Any] | None:
    session_id_str = str(session_identifier)
    demo_state = get_demo_state(session_id_str)
    if demo_state is not None:
        return {
            "session_id": session_id_str,
            "created_at": now_iso(),
            "frames": demo_state.frames,
            "session": demo_state.session,
        }

    parsed_session_id = parse_session_id(session_id_str)
    if parsed_session_id is None:
        return None

    session = PracticeSession.query.filter_by(id=parsed_session_id).first()
    if session is None:
        return None

    frames = SessionFrame.query.filter_by(session_id=session.id).order_by(SessionFrame.frame_index.asc()).all()
    serialized_frames = [serialize_session_frame(frame) for frame in frames]
    return {
        "session_id": session_id_str,
        "created_at": now_iso(),
        "frames": serialized_frames,
        "session": {
            "id": session.id,
            "user_id": session.user_id,
            "dance_reference_id": session.dance_reference_id,
            "session_status": session.session_status,
            "total_score": float(session.total_score) if session.total_score is not None else None,
            "lowest_section_score": float(session.lowest_section_score)
            if session.lowest_section_score is not None
            else None,
        },
    }
