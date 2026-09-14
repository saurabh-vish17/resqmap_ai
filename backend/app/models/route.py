"""Route model — dispatched resource routes to incidents."""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Foreign keys
    incident_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("incidents.id"), nullable=False, index=True
    )
    resource_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("resources.id"), nullable=False, index=True
    )

    # Route info
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=0)
    route_geojson: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING"
    )  # PENDING | DISPATCHED | EN_ROUTE | ARRIVED | COMPLETED

    # Timestamps
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    incident: Mapped["Incident"] = relationship(back_populates="routes")
    resource: Mapped["Resource"] = relationship(back_populates="routes")

    def __repr__(self) -> str:
        return f"<Route {self.resource_id[:8]} → {self.incident_id[:8]} [{self.status}]>"
