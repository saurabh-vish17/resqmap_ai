"""Resource model — rescue teams, hospitals, shelters, fire stations."""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    resource_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )  # e.g. R-07, H-03, FS-04, S-02
    type: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )  # Rescue Team | Hospital | Shelter | Fire Station
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Location
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Status & capacity
    availability: Mapped[str] = mapped_column(
        String(20), nullable=False, default="AVAILABLE"
    )  # AVAILABLE | BUSY | DISPATCHED | OFFLINE
    capacity: Mapped[int] = mapped_column(Integer, default=0)
    contact: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    routes: Mapped[list["Route"]] = relationship(back_populates="resource")

    def __repr__(self) -> str:
        return f"<Resource {self.resource_code} [{self.availability}]>"
