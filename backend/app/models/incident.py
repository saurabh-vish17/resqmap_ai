"""Incident model — verified, clustered disaster events."""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    event_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )  # e.g. F102, FR201, L301
    disaster_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # FLOOD | FIRE | LANDSLIDE
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Location
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    area_km2: Mapped[float] = mapped_column(Float, default=0.0)

    # AI Assessment
    confidence: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    severity: Mapped[str] = mapped_column(
        String(20), nullable=False, default="LOW"
    )  # LOW | MODERATE | HIGH | CRITICAL
    priority_score: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    ai_explanation: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="ACTIVE", index=True
    )  # ACTIVE | RESPONSE_INITIATED | UNDER_CONTROL | RESOLVED

    # Aggregated stats
    report_count: Mapped[int] = mapped_column(Integer, default=0)
    people_affected: Mapped[int] = mapped_column(Integer, default=0)
    event_cluster_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Timestamps
    first_report_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    latest_report_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    reports: Mapped[list["Report"]] = relationship(back_populates="incident")
    routes: Mapped[list["Route"]] = relationship(back_populates="incident")

    def __repr__(self) -> str:
        return f"<Incident #{self.event_code} {self.disaster_type} [{self.severity}]>"
