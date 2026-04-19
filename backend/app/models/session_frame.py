from sqlalchemy import func

from ..extensions import db
from .base import BaseModel, TimestampMixin


class SessionFrame(TimestampMixin, BaseModel):
    __tablename__ = "session_frames"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    session_id = db.Column(
        db.BigInteger().with_variant(db.Integer, "sqlite"),
        db.ForeignKey("practice_sessions.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    frame_index = db.Column(db.Integer, nullable=False)
    timestamp_seconds = db.Column(db.Numeric(10, 3), nullable=False)
    pose_json = db.Column(db.JSON, nullable=True)
    score = db.Column(db.Numeric(5, 2), nullable=True)
