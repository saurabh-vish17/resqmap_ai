"""Pydantic schemas for Incident."""

from pydantic import BaseModel
from datetime import datetime


class SeverityFactor(BaseModel):
    factor: str
    score: int
    detail: str


class AIExplanation(BaseModel):
    disasterType: str
    confidence: float
    imageEvidence: str
    textEvidence: str
    locationEvidence: str
    corroboration: str
    severityBreakdown: list[SeverityFactor]


class NearestResource(BaseModel):
    id: str
    type: str
    name: str
    distance: float
    eta: int
    status: str
    capacity: int
    route_geometry: dict | None = None


class IncidentBase(BaseModel):
    disaster_type: str
    title: str
    description: str | None = None
    latitude: float
    longitude: float
    area_km2: float = 0.0


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    priority_score: int | None = None
    status: str | None = None
    people_affected: int | None = None


class IncidentResponse(IncidentBase):
    id: str
    event_code: str
    confidence: float
    severity: str
    priority_score: int
    status: str
    report_count: int
    people_affected: int
    event_cluster_id: str | None = None
    ai_explanation: dict | None = None
    first_report_at: datetime | None = None
    latest_report_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IncidentWithResources(IncidentResponse):
    nearest_resources: list[NearestResource] = []
