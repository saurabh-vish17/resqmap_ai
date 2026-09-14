"""Reports router — citizen report submission (Phase 3).

Supports:
- Authenticated users (citizen / operator / admin)
- Guest submissions via optional Bearer token
- Naive spatial clustering into existing incidents (stub for Phase 6)
- Disaster type hints from description keywords
"""

import os
import math
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.report import Report
from ..models.incident import Incident
from ..models.user import User
from ..schemas.report import ReportResponse
from ..services.auth import get_current_user
from ..services.ai import analyze_image
from ..services.clustering import cluster_report_dbscan
from ..config import get_settings

router = APIRouter(prefix="/api/reports", tags=["Reports"])
settings = get_settings()

# Optional OAuth2 scheme — does NOT raise 401 if token missing
_optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _get_optional_user(
    token: Optional[str] = Depends(_optional_oauth2),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return current user or None (guest allowed)."""
    if not token:
        return None
    try:
        from jose import jwt, JWTError
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two GPS points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _keyword_type_hint(description: str) -> Optional[str]:
    """Naive keyword-based disaster type detection from description text."""
    if not description:
        return None
    desc = description.lower()
    if any(w in desc for w in ["flood", "water", "rain", "waterlog", "submerge", "inundation"]):
        return "FLOOD"
    if any(w in desc for w in ["fire", "flame", "burn", "smoke", "blaze", "inferno"]):
        return "FIRE"
    if any(w in desc for w in ["landslide", "mud", "debris", "slope", "collapse", "rockfall"]):
        return "LANDSLIDE"
    return None


# ─── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ReportResponse])
def list_reports(
    incident_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """List reports with optional filters."""
    query = db.query(Report)
    if incident_id:
        query = query.filter(Report.incident_id == incident_id)
    if user_id:
        query = query.filter(Report.user_id == user_id)
    return query.order_by(Report.timestamp.desc()).limit(limit).all()


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    description: Optional[str] = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    disaster_type_hint: Optional[str] = Form(None, description="Optional: FLOOD | FIRE | LANDSLIDE"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(_get_optional_user),
):
    """
    Submit a citizen disaster report. Auth optional — guests get a guest user ID.
    - Saves image to uploads/
    - Attempts keyword-based type classification from description
    - Clusters report into nearest matching incident within 2 km
    """
    # Resolve user_id (guest fallback)
    if user:
        user_id = user.id
    else:
        # Guest submissions: use a system guest marker
        guest = db.query(User).filter(User.email == "guest@resqmap.ai").first()
        if not guest:
            guest = User(
                name="Guest Citizen",
                email="guest@resqmap.ai",
                password_hash="GUEST_NO_LOGIN",
                role="citizen",
            )
            db.add(guest)
            db.flush()
        user_id = guest.id

    # Save uploaded image
    image_url = None
    image_confidence = 0.0
    predicted_type = disaster_type_hint

    if image and image.filename:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        content = await image.read()

        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

        with open(filepath, "wb") as f:
            f.write(content)
        image_url = f"/uploads/{filename}"

        # Phase 4: Run YOLO classification stub
        ai_predicted_type, ai_confidence = analyze_image(filepath, hint=disaster_type_hint)
        if ai_predicted_type != "UNKNOWN":
            predicted_type = ai_predicted_type
            image_confidence = ai_confidence

    # Determine predicted disaster type fallback
    if not predicted_type and description:
        predicted_type = _keyword_type_hint(description)

    report = Report(
        user_id=user_id,
        description=description,
        latitude=latitude,
        longitude=longitude,
        image_url=image_url,
        image_confidence=image_confidence,
        predicted_type=predicted_type,
    )

    db.add(report)
    db.flush() # Ensure report has an ID for DBSCAN exclusion

    # Phase 6: DBSCAN Event Clustering
    incident_id = cluster_report_dbscan(report, db)
    if incident_id:
        report.incident_id = incident_id

    db.commit()
    db.refresh(report)
    return report


@router.get("/mine", response_model=list[ReportResponse])
def my_reports(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get current user's own reports (requires auth)."""
    return (
        db.query(Report)
        .filter(Report.user_id == user.id)
        .order_by(Report.timestamp.desc())
        .limit(limit)
        .all()
    )


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    """Get a single report by ID."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
