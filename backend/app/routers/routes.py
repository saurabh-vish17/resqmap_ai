"""Routes router — dispatch tracking."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.route import Route
from ..schemas.route import RouteResponse
from ..services.auth import require_role
from ..models.user import User

router = APIRouter(prefix="/api/routes", tags=["Routes"])


@router.get("/", response_model=list[RouteResponse])
def list_routes(
    incident_id: str | None = None,
    resource_id: str | None = None,
    db: Session = Depends(get_db),
):
    """List dispatch routes with optional filters."""
    query = db.query(Route)
    if incident_id:
        query = query.filter(Route.incident_id == incident_id)
    if resource_id:
        query = query.filter(Route.resource_id == resource_id)
    return query.order_by(Route.created_at.desc()).all()


@router.patch("/{route_id}/status")
def update_route_status(
    route_id: str,
    new_status: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("operator", "admin")),
):
    """Update route status (EN_ROUTE, ARRIVED, COMPLETED)."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    valid = ["PENDING", "DISPATCHED", "EN_ROUTE", "ARRIVED", "COMPLETED"]
    if new_status.upper() not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")

    route.status = new_status.upper()

    if new_status.upper() == "ARRIVED":
        from datetime import datetime, timezone
        route.arrived_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(route)
    return {"message": f"Route status updated to {route.status}", "route_id": route.id}
