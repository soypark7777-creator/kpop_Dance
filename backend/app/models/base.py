from sqlalchemy import DateTime, func

from ..extensions import db


class BaseModel(db.Model):
    __abstract__ = True


class TimestampMixin:
    created_at = db.Column(DateTime, nullable=False, server_default=func.now())
    updated_at = db.Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        server_onupdate=func.now(),
    )
