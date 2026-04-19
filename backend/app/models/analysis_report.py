from ..extensions import db
from .base import BaseModel, TimestampMixin


class AnalysisReport(TimestampMixin, BaseModel):
    __tablename__ = "analysis_reports"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    session_id = db.Column(
        db.BigInteger().with_variant(db.Integer, "sqlite"),
        db.ForeignKey("practice_sessions.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        unique=True,
    )
    weakest_section = db.Column(db.String(100), nullable=True)
    most_wrong_joints = db.Column(db.JSON, nullable=True)
    average_angle_error = db.Column(db.Numeric(6, 3), nullable=True)
    report_json = db.Column(db.JSON, nullable=True)
