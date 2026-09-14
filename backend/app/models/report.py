"""Report model — individual citizen disaster reports."""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Foreign keys
    incident_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("incidents.id"), nullable=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )

    # Report content
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Location
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # AI outputs
    image_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    predicted_type: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Timestamp
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    incident: Mapped["Incident | None"] = relationship(back_populates="reports")
    user: Mapped["User"] = relationship(back_populates="reports")

    def __repr__(self) -> str:
        return f"<Report {self.id[:8]} by {self.user_id[:8]}>"
