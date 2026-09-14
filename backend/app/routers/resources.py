"""Resources router — CRUD for rescue teams, hospitals, etc."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.resource import Resource
from ..schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse
from ..services.auth import require_role
from ..services.clustering import haversine_distance
from ..models.user import User

router = APIRouter(prefix="/api/resources", tags=["Resources"])


@router.get("/", response_model=list[ResourceResponse])
def list_resources(
    type: str | None = Query(None, description="Filter by resource type"),
    availability: str | None = Query(None, description="Filter by availability"),
    db: Session = Depends(get_db),
):
    """List all resources with optional filters."""
    query = db.query(Resource)
    if type:
        query = query.filter(Resource.type == type)
    if availability:
        query = query.filter(Resource.availability == availability.upper())
    return query.order_by(Resource.resource_code).all()


@router.get("/nearest/search", response_model=list[ResourceResponse])
def get_nearest_resources(
    lat: float = Query(..., description="Latitude of the origin point"),
    lon: float = Query(..., description="Longitude of the origin point"),
    type: str | None = Query(None, description="Optional type filter (Ambulance, Fire Station, etc.)"),
    limit: int = Query(5, description="Number of nearest resources to return"),
    db: Session = Depends(get_db)
):
    """Phase 8: Find the nearest AVAILABLE resources to a GPS coordinate."""
    query = db.query(Resource).filter(Resource.availability == "AVAILABLE")
    if type:
        query = query.filter(Resource.type == type)
    
    # Load all available into memory to perform Haversine sort (Since pure SQLite lacks PostGIS)
    resources = query.all()
    
    for res in resources:
        # We manually attach distance_km to the model instance; the schema will pick it up
        res.distance_km = haversine_distance(lat, lon, res.latitude, res.longitude)
        
    resources.sort(key=lambda r: getattr(r, "distance_km", 0))
    return resources[:limit]


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(resource_id: str, db: Session = Depends(get_db)):
    """Get a single resource."""
    resource = db.query(Resource).filter(
        (Resource.id == resource_id) | (Resource.resource_code == resource_id)
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    payload: ResourceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Create a new resource (admin only)."""
    existing = db.query(Resource).filter(Resource.resource_code == payload.resource_code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Resource code already exists")

    resource = Resource(**payload.model_dump())
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.patch("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: str,
    payload: ResourceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("operator", "admin")),
):
    """Update resource availability/capacity (operator/admin)."""
    resource = db.query(Resource).filter(
        (Resource.id == resource_id) | (Resource.resource_code == resource_id)
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(resource, key, val)
    db.commit()
    db.refresh(resource)
    return resource
