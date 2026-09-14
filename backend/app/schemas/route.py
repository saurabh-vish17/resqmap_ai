"""Pydantic schemas for Route (dispatch)."""

from pydantic import BaseModel
from datetime import datetime


class RouteBase(BaseModel):
    incident_id: str
    resource_id: str


class RouteCreate(RouteBase):
    pass


class RouteResponse(RouteBase):
    id: str
    distance_km: float
    estimated_minutes: int
    route_geojson: dict | None = None
    status: str
    dispatched_at: datetime | None = None
    arrived_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
