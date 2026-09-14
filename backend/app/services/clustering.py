"""Event/Duplicate Clustering Engine — Phase 6.

Simulates DBSCAN + NLP Similarity logic to group citizen chatter (Reports)
into unified emergency events (Incidents), or create new Incidents dynamically.
"""

import math
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from ..models.report import Report
from ..models.incident import Incident
from .severity import calculate_severity

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two GPS coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _text_similarity(desc1: str, desc2: str) -> float:
    """Mock TF-IDF/Embedding similarity calculation based on shared keywords."""
    pos_1 = set(desc1.lower().split()) if desc1 else set()
    pos_2 = set(desc2.lower().split()) if desc2 else set()
        
    if not pos_1 and not pos_2:
        return 0.0
    common = pos_1.intersection(pos_2)
    return len(common) / max(len(pos_1), len(pos_2), 1)

def cluster_report_dbscan(report: Report, db: Session) -> Optional[str]:
    """
    Groups reports.
    1. Checks for existing Incident. (Core grouping)
    2. If none, checks for nearby orphaned Reports. If threshold met (minPts), 
       generates a brand new Incident dynamically.
    3. Triggers Phase 5 Severity engine upon any state change.
    """
    if not report.predicted_type:
        return None
        
    CLUSTER_RADIUS_KM = 3.0
    TIME_DECAY_HOURS = 24.0
    
    # --- PHASE A: Existing Incident (Cluster Membership) ---
    candidates = db.query(Incident).filter(
        Incident.disaster_type == report.predicted_type,
        Incident.status.in_(["ACTIVE", "RESPONSE_INITIATED"])
    ).all()

    best_incident = None
    best_score = -1.0 # 0.0 to 1.0 match score

    for inc in candidates:
        dist = haversine_distance(report.latitude, report.longitude, inc.latitude, inc.longitude)
        
        # Must be within geographical radius
        if dist > CLUSTER_RADIUS_KM:
            continue
            
        # Context Similarity (Mocking embeddings)
        txt_sim = _text_similarity(report.description, inc.description)
        
        # Spatial-Context Score
        match_score = (1 - (dist / CLUSTER_RADIUS_KM)) * 0.6 + (txt_sim * 0.4)
        
        if match_score > best_score:
            best_score = match_score
            best_incident = inc

    # Sub-Phase A: Core Match routing
    if best_incident and best_score > 0.3: # Threshold 
        # Update Incident Stats via Phase 5
        best_incident.report_count = (best_incident.report_count or 0) + 1
        best_incident.latest_report_at = datetime.now(timezone.utc)
        
        tot, cat, expl = calculate_severity(
            best_incident.disaster_type,
            (best_incident.description or "") + " " + (report.description or ""),
            best_incident.latitude,
            best_incident.longitude,
            best_incident.report_count,
            max(report.image_confidence or 0.0, best_incident.ai_explanation.get("confidence", 0) / 100 if best_incident.ai_explanation else 0.0)
        )
        best_incident.priority_score = tot
        best_incident.severity = cat
        best_incident.ai_explanation = expl
        return best_incident.id
        
    # --- PHASE B: DBSCAN MinPts Thresholding (New Incident Creation) ---
    # Find orphaned reports of the exact same type within 1.5km
    orphans = db.query(Report).filter(
        Report.incident_id == None,
        Report.predicted_type == report.predicted_type,
        Report.id != report.id
    ).order_by(Report.timestamp.desc()).all()
    
    nearby_orphans = []
    for orphan in orphans:
        if haversine_distance(report.latitude, report.longitude, orphan.latitude, orphan.longitude) <= 1.5:
            nearby_orphans.append(orphan)
    
    # DBSCAN MinPts Check (e.g. at least 1 other report, meaning 2 total points)
    if len(nearby_orphans) >= 1:
        # We have a NEW Cluster event! 
        # Generate new Incident mapping to core location
        new_inc = Incident(
            title=f"Unverified {report.predicted_type} Event",
            description=report.description or "Aggregated reports detailing an emergent situation.",
            disaster_type=report.predicted_type,
            status="ACTIVE",
            severity="LOW",
            priority_score=10,
            latitude=report.latitude,
            longitude=report.longitude,
            report_count=1 + len(nearby_orphans),
            first_report_at=nearby_orphans[-1].timestamp if nearby_orphans else datetime.now(timezone.utc), # Earliest report
            latest_report_at=datetime.now(timezone.utc),
            ai_explanation={}
        )
        db.add(new_inc)
        db.flush() # Yield temporary ID
        
        # Link all matched DB orphans to newest Incident
        for orphan in nearby_orphans:
            orphan.incident_id = new_inc.id
            
        # Post-Calculate unified severity based on newfound size
        tot, cat, expl = calculate_severity(
            new_inc.disaster_type,
            new_inc.description,
            new_inc.latitude,
            new_inc.longitude,
            new_inc.report_count, 
            report.image_confidence or 0.0
        )
        new_inc.priority_score = tot
        new_inc.severity = cat
        new_inc.ai_explanation = expl
        
        return new_inc.id

    # --- PHASE C: Noise / Anomaly ---
    # Not enough points to cluster yet, remains singular unlinked Report
    return None
