"""Pydantic schemas for Resource."""

from pydantic import BaseModel
from datetime import datetime


class ResourceBase(BaseModel):
    type: str
    name: str
    latitude: float
    longitude: float
    availability: str = "AVAILABLE"
    capacity: int = 0
    contact: str | None = None


class ResourceCreate(ResourceBase):
    resource_code: str


class ResourceUpdate(BaseModel):
    availability: str | None = None
    capacity: int | None = None
    contact: str | None = None


class ResourceResponse(ResourceBase):
    id: str
    resource_code: str
    created_at: datetime
    updated_at: datetime
    distance_km: float | None = None

    model_config = {"from_attributes": True}
