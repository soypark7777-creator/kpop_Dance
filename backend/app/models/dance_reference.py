from ..extensions import db
from .base import BaseModel, TimestampMixin


class DanceReference(TimestampMixin, BaseModel):
    __tablename__ = "dance_references"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    artist_name = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(
        db.Enum("easy", "normal", "hard", "expert", name="difficulty_level"),
        nullable=False,
        default="normal",
        index=True,
    )
    duration_seconds = db.Column(db.Integer, nullable=False, default=0)
    thumbnail_url = db.Column(db.String(500), nullable=True)
    reference_json_path = db.Column(db.String(500), nullable=False)
    preview_video_url = db.Column(db.String(500), nullable=True)

    sessions = db.relationship("PracticeSession", backref="dance_reference", lazy="select")
