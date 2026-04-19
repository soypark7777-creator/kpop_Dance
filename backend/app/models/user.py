from ..extensions import db
from .base import BaseModel, TimestampMixin


class User(TimestampMixin, BaseModel):
    __tablename__ = "users"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    nickname = db.Column(db.String(50), nullable=False, index=True)
    avatar_id = db.Column(db.String(50), nullable=True)
    points = db.Column(db.Integer, nullable=False, default=0)
    is_admin = db.Column(db.Boolean, nullable=False, default=False, index=True)
    status = db.Column(
        db.Enum("active", "inactive", "suspended", name="user_status"),
        nullable=False,
        default="active",
        index=True,
    )

    sessions = db.relationship("PracticeSession", backref="user", lazy="select")
