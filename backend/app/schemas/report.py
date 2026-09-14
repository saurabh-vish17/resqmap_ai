"""Pydantic schemas for Report."""

from pydantic import BaseModel
from datetime import datetime


class ReportBase(BaseModel):
    description: str | None = None
    latitude: float
    longitude: float


class ReportCreate(ReportBase):
    pass


class ReportResponse(ReportBase):
    id: str
    incident_id: str | None = None
    user_id: str
    image_url: str | None = None
    image_confidence: float
    predicted_type: str | None = None
    timestamp: datetime

    model_config = {"from_attributes": True}
