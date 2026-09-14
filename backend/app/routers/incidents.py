"""Incidents router — CRUD + filtering + stats."""

import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from ..database import get_db
from ..models.incident import Incident
from ..models.resource import Resource
from ..schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    IncidentWithResources,
    NearestResource,
)
from ..services.auth import get_current_user, require_role
from ..services.routing import get_optimal_route
from ..models.user import User

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


def _haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two GPS points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.get("/", response_model=list[IncidentResponse])
def list_incidents(
    severity: str | None = Query(None, description="Filter by severity"),
    disaster_type: str | None = Query(None, description="Filter by type"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
):
    """List all incidents with optional filters."""
    query = db.query(Incident)
    if severity:
        query = query.filter(Incident.severity == severity.upper())
    if disaster_type:
        query = query.filter(Incident.disaster_type == disaster_type.upper())
    if status_filter:
        query = query.filter(Incident.status == status_filter.upper())
    return query.order_by(Incident.priority_score.desc()).all()


@router.get("/stats")
def incident_stats(db: Session = Depends(get_db)):
    """Get summary stats for the dashboard header."""
    total = db.query(Incident).count()
    by_severity = {}
    for sev in ["CRITICAL", "HIGH", "MODERATE", "LOW"]:
        by_severity[sev] = db.query(Incident).filter(Incident.severity == sev).count()
    by_type = {}
    for t in ["FLOOD", "FIRE", "LANDSLIDE"]:
        by_type[t] = db.query(Incident).filter(Incident.disaster_type == t).count()
    return {
        "total": total,
        "by_severity": by_severity,
        "by_type": by_type,
    }


@router.get("/{incident_id}", response_model=IncidentWithResources)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """Get a single incident with nearest resources."""
    incident = db.query(Incident).filter(
        (Incident.id == incident_id) | (Incident.event_code == incident_id)
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Find nearest available resources
    resources = db.query(Resource).all()
    nearest_candidates = []
    
    # 1. Broad spatial sweep with Haversine to get top 15 closest structurally
    for res in resources:
        dist = _haversine(
            incident.latitude, incident.longitude,
            res.latitude, res.longitude,
        )
        nearest_candidates.append((dist, res))
        
    nearest_candidates.sort(key=lambda x: (0 if x[1].availability == "AVAILABLE" else 1, x[0]))
    top_5 = nearest_candidates[:5]
    
    # 2. Phase 9: Detailed OSRM routing for top 5 candidates
    nearest = []
    for rough_dist, res in top_5:
        # Call public OSRM for accurate street routing and geometry
        route_data = get_optimal_route(
            start_lat=res.latitude, start_lon=res.longitude, 
            end_lat=incident.latitude, end_lon=incident.longitude
        )
        
        # Fallback to Haversine if OSRM fails
        final_dist = route_data["distance_km"] if route_data["distance_km"] is not None else round(rough_dist, 1)
        final_eta = route_data["eta_minutes"] if route_data["eta_minutes"] is not None else max(1, int(rough_dist / 0.5 * 1.5))
        
        nearest.append(NearestResource(
            id=res.resource_code,
            type=res.type,
            name=res.name,
            distance=final_dist,
            eta=final_eta,
            status=res.availability,
            capacity=res.capacity,
            route_geometry=route_data["geometry"]
        ))
        
    # Re-sort natively by actual drive-time distance just in case street layouts skewed haversine
    nearest.sort(key=lambda r: (0 if r.status == "AVAILABLE" else 1, r.distance))

    nearest.sort(key=lambda r: (0 if r.status == "AVAILABLE" else 1, r.distance))
    nearest = nearest[:5]  # Top 5

    resp = IncidentWithResources.model_validate(incident)
    resp.nearest_resources = nearest
    return resp


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("operator", "admin")),
):
    """Create a new incident (operator/admin only)."""
    # Generate event code
    type_prefix = {"FLOOD": "F", "FIRE": "FR", "LANDSLIDE": "L"}.get(
        payload.disaster_type.upper(), "X"
    )
    count = db.query(Incident).filter(
        Incident.disaster_type == payload.disaster_type.upper()
    ).count()
    event_code = f"{type_prefix}{100 + count + 1}"

    incident = Incident(
        event_code=event_code,
        disaster_type=payload.disaster_type.upper(),
        title=payload.title,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        area_km2=payload.area_km2,
        severity="LOW",
        priority_score=0,
        status="ACTIVE",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("operator", "admin")),
):
    """Update incident fields (operator/admin only)."""
    incident = db.query(Incident).filter(
        (Incident.id == incident_id) | (Incident.event_code == incident_id)
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(incident, key, val)

    db.commit()
    db.refresh(incident)
    return incident


@router.post("/{incident_id}/dispatch")
def dispatch_resource(
    incident_id: str,
    resource_code: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("operator", "admin")),
):
    """Dispatch a resource to an incident."""
    incident = db.query(Incident).filter(
        (Incident.id == incident_id) | (Incident.event_code == incident_id)
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    resource = db.query(Resource).filter(Resource.resource_code == resource_code).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.availability != "AVAILABLE":
        raise HTTPException(status_code=400, detail=f"Resource is {resource.availability}")

    # Update resource status
    resource.availability = "DISPATCHED"

    # Update incident status
    if incident.status == "ACTIVE":
        incident.status = "RESPONSE_INITIATED"

    # Create route record
    from ..models.route import Route
    from datetime import datetime, timezone

    dist = _haversine(incident.latitude, incident.longitude, resource.latitude, resource.longitude)
    eta = max(1, int(dist / 0.5 * 1.5))

    route = Route(
        incident_id=incident.id,
        resource_id=resource.id,
        distance_km=round(dist, 1),
        estimated_minutes=eta,
        status="DISPATCHED",
        dispatched_at=datetime.now(timezone.utc),
    )
    db.add(route)
    db.commit()

    return {
        "message": f"Resource {resource_code} dispatched to incident {incident.event_code}",
        "distance_km": round(dist, 1),
        "eta_minutes": eta,
        "incident_status": incident.status,
        "resource_status": resource.availability,
    }
