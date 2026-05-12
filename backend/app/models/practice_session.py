from sqlalchemy import func

from ..extensions import db
from .base import BaseModel, TimestampMixin


class PracticeSession(TimestampMixin, BaseModel):
    __tablename__ = "practice_sessions"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    session_uuid = db.Column(db.String(36), nullable=False, unique=True, index=True)
    user_id = db.Column(
        db.BigInteger().with_variant(db.Integer, "sqlite"),
        db.ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    dance_reference_id = db.Column(
        db.BigInteger().with_variant(db.Integer, "sqlite"),
        db.ForeignKey("dance_references.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    started_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    ended_at = db.Column(db.DateTime, nullable=True)
    total_score = db.Column(db.Numeric(5, 2), nullable=True)
    lowest_section_score = db.Column(db.Numeric(5, 2), nullable=True)
    unlock_avatar_render = db.Column(db.Boolean, nullable=False, default=False)
    session_status = db.Column(
        db.Enum("active", "completed", "abandoned", name="session_status"),
        nullable=False,
        default="active",
        index=True,
    )
    
