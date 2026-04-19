from sqlalchemy import func

from ..extensions import db
from .base import BaseModel, TimestampMixin


class AvatarRender(TimestampMixin, BaseModel):
    __tablename__ = "avatar_renders"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    user_id = db.Column(
        db.BigInteger().with_variant(db.Integer, "sqlite"),
        db.ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id = db.Column(
        db.BigInteger().with_variant(db.Integer, "sqlite"),
        db.ForeignKey("practice_sessions.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    avatar_id = db.Column(db.String(50), nullable=True)
    stage_theme_id = db.Column(db.String(50), nullable=True)
    costume_id = db.Column(db.String(50), nullable=True)
    render_status = db.Column(
        db.Enum("pending", "rendering", "completed", "failed", name="render_status"),
        nullable=False,
        default="pending",
        index=True,
    )
    output_url = db.Column(db.String(500), nullable=True)
    requested_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    completed_at = db.Column(db.DateTime, nullable=True)
