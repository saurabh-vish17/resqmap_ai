"""Seed the database with demo data matching the React frontend mock data."""

import sys
import os

# Add parent dir to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.incident import Incident
from app.models.resource import Resource
from app.services.auth import hash_password


def seed():
    init_db()
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).count() > 0:
        print("⚠️  Database already seeded. Skipping.")
        db.close()
        return

    print("🌱 Seeding database...")

    # ── Users ──────────────────────────────────────────────────
    users = [
        User(
            name="Admin",
            email="admin@resqmap.ai",
            password_hash=hash_password("admin123"),
            role="admin",
            contact="+91-9999999999",
        ),
        User(
            name="Operator One",
            email="operator@resqmap.ai",
            password_hash=hash_password("operator123"),
            role="operator",
            contact="+91-8888888888",
        ),
        User(
            name="Citizen Demo",
            email="citizen@resqmap.ai",
            password_hash=hash_password("citizen123"),
            role="citizen",
            contact="+91-7777777777",
        ),
    ]
    db.add_all(users)
    db.flush()
    print(f"   ✅ {len(users)} users created")

    # ── Resources ──────────────────────────────────────────────
    resources = [
        Resource(resource_code="R-03", type="Rescue Team", name="Rescue Unit R-03", latitude=18.9650, longitude=72.8100, availability="AVAILABLE", capacity=10, contact="+91-1111111111"),
        Resource(resource_code="R-07", type="Rescue Team", name="Rescue Unit R-07", latitude=19.1350, longitude=72.8350, availability="AVAILABLE", capacity=12, contact="+91-1111111112"),
        Resource(resource_code="R-12", type="Rescue Team", name="Rescue Unit R-12", latitude=19.0550, longitude=72.8700, availability="DISPATCHED", capacity=8, contact="+91-1111111113"),
        Resource(resource_code="FS-04", type="Fire Station", name="Bandra Fire Station", latitude=19.0500, longitude=72.8350, availability="AVAILABLE", capacity=4, contact="+91-2222222221"),
        Resource(resource_code="FS-09", type="Fire Station", name="Goregaon Fire Station", latitude=19.1550, longitude=72.8600, availability="AVAILABLE", capacity=3, contact="+91-2222222222"),
        Resource(resource_code="H-01", type="Hospital", name="Lilavati Hospital", latitude=19.0510, longitude=72.8280, availability="AVAILABLE", capacity=200, contact="+91-3333333331"),
        Resource(resource_code="H-03", type="Hospital", name="Holy Spirit Hospital", latitude=19.1080, longitude=72.8380, availability="AVAILABLE", capacity=120, contact="+91-3333333332"),
        Resource(resource_code="H-07", type="Hospital", name="Sion Hospital", latitude=19.0400, longitude=72.8650, availability="AVAILABLE", capacity=300, contact="+91-3333333333"),
        Resource(resource_code="S-02", type="Shelter", name="Community Hall Andheri", latitude=19.1150, longitude=72.8550, availability="AVAILABLE", capacity=200, contact="+91-4444444441"),
        Resource(resource_code="S-05", type="Shelter", name="School Building Dadar", latitude=19.0200, longitude=72.8450, availability="AVAILABLE", capacity=150, contact="+91-4444444442"),
    ]
    db.add_all(resources)
    db.flush()
    print(f"   ✅ {len(resources)} resources created")

    # ── Incidents ──────────────────────────────────────────────
    incidents_data = [
        {
            "event_code": "F102",
            "disaster_type": "FLOOD",
            "title": "Severe Flooding — Andheri Subway",
            "description": "Major flooding reported at Andheri Subway. Water level rising rapidly. Multiple vehicles submerged. Pedestrians stranded.",
            "latitude": 19.1197, "longitude": 72.8464, "area_km2": 1.4,
            "confidence": 94.0, "severity": "CRITICAL", "priority_score": 91,
            "status": "ACTIVE", "report_count": 23, "people_affected": 180,
            "ai_explanation": {
                "disasterType": "FLOOD", "confidence": 94,
                "imageEvidence": "Water level appears high — road completely submerged",
                "textEvidence": "Citizen description indicates people are stranded",
                "locationEvidence": "Location is near a residential area with high density",
                "corroboration": "23 similar reports within 1.4 km²",
                "severityBreakdown": [
                    {"factor": "Image Severity", "score": 25, "detail": "High water coverage detected"},
                    {"factor": "Report Density", "score": 22, "detail": "23 reports within 1.4 km²"},
                    {"factor": "People at Risk", "score": 20, "detail": "~180 people in affected zone"},
                    {"factor": "Infrastructure Risk", "score": 14, "detail": "Major subway junction blocked"},
                    {"factor": "Location Vulnerability", "score": 10, "detail": "High-density residential area"},
                ],
            },
        },
        {
            "event_code": "F103",
            "disaster_type": "FLOOD",
            "title": "Road Flooding — Sion Circle",
            "description": "Significant water logging at Sion Circle. Traffic completely halted. Water entering ground floor shops.",
            "latitude": 19.0425, "longitude": 72.8617, "area_km2": 0.8,
            "confidence": 88.0, "severity": "HIGH", "priority_score": 72,
            "status": "RESPONSE_INITIATED", "report_count": 15, "people_affected": 95,
            "ai_explanation": {
                "disasterType": "FLOOD", "confidence": 88,
                "imageEvidence": "Moderate water accumulation on major road junction",
                "textEvidence": "Reports of water entering commercial establishments",
                "locationEvidence": "Busy commercial area with hospital nearby",
                "corroboration": "15 reports within 0.8 km²",
                "severityBreakdown": [
                    {"factor": "Image Severity", "score": 20, "detail": "Moderate water coverage"},
                    {"factor": "Report Density", "score": 18, "detail": "15 reports within 0.8 km²"},
                    {"factor": "People at Risk", "score": 15, "detail": "~95 people in affected zone"},
                    {"factor": "Infrastructure Risk", "score": 12, "detail": "Major traffic junction"},
                    {"factor": "Location Vulnerability", "score": 7, "detail": "Commercial area"},
                ],
            },
        },
        {
            "event_code": "FR201",
            "disaster_type": "FIRE",
            "title": "Building Fire — Bandra West",
            "description": "Fire reported in a 4-story residential building in Bandra West. Heavy smoke visible. Residents evacuating.",
            "latitude": 19.0596, "longitude": 72.8295, "area_km2": 0.3,
            "confidence": 96.0, "severity": "CRITICAL", "priority_score": 88,
            "status": "ACTIVE", "report_count": 12, "people_affected": 45,
            "ai_explanation": {
                "disasterType": "FIRE", "confidence": 96,
                "imageEvidence": "Active flames and heavy smoke clearly visible",
                "textEvidence": "Residents report fire spreading to adjacent floors",
                "locationEvidence": "Dense residential area with narrow access roads",
                "corroboration": "12 reports from the immediate vicinity",
                "severityBreakdown": [
                    {"factor": "Image Severity", "score": 28, "detail": "Active flames with heavy smoke"},
                    {"factor": "Report Density", "score": 16, "detail": "12 reports in 0.3 km²"},
                    {"factor": "People at Risk", "score": 22, "detail": "~45 residents in building"},
                    {"factor": "Infrastructure Risk", "score": 15, "detail": "4-story residential building"},
                    {"factor": "Location Vulnerability", "score": 7, "detail": "Narrow access roads"},
                ],
            },
        },
        {
            "event_code": "FR202",
            "disaster_type": "FIRE",
            "title": "Warehouse Fire — Goregaon",
            "description": "Fire in an industrial warehouse. Chemicals may be involved. Workers have evacuated.",
            "latitude": 19.1663, "longitude": 72.8491, "area_km2": 0.5,
            "confidence": 91.0, "severity": "HIGH", "priority_score": 65,
            "status": "RESPONSE_INITIATED", "report_count": 8, "people_affected": 20,
            "ai_explanation": {
                "disasterType": "FIRE", "confidence": 91,
                "imageEvidence": "Large fire with colored smoke indicating chemical involvement",
                "textEvidence": "Workers report chemical storage in the warehouse",
                "locationEvidence": "Industrial zone, lower residential density",
                "corroboration": "8 reports within 0.5 km²",
                "severityBreakdown": [
                    {"factor": "Image Severity", "score": 22, "detail": "Large fire with chemical smoke"},
                    {"factor": "Report Density", "score": 12, "detail": "8 reports"},
                    {"factor": "People at Risk", "score": 10, "detail": "~20 workers"},
                    {"factor": "Infrastructure Risk", "score": 14, "detail": "Chemical warehouse"},
                    {"factor": "Location Vulnerability", "score": 7, "detail": "Industrial area"},
                ],
            },
        },
        {
            "event_code": "L301",
            "disaster_type": "LANDSLIDE",
            "title": "Landslide — Malabar Hill",
            "description": "Landslide on the hillside near residential colony. Road partially blocked. One house partially collapsed.",
            "latitude": 18.9548, "longitude": 72.7986, "area_km2": 0.2,
            "confidence": 87.0, "severity": "HIGH", "priority_score": 70,
            "status": "ACTIVE", "report_count": 6, "people_affected": 30,
            "ai_explanation": {
                "disasterType": "LANDSLIDE", "confidence": 87,
                "imageEvidence": "Significant soil displacement and debris on road",
                "textEvidence": "Reports indicate partial house collapse",
                "locationEvidence": "Steep hillside with residential structures",
                "corroboration": "6 reports within 0.2 km²",
                "severityBreakdown": [
                    {"factor": "Image Severity", "score": 20, "detail": "Major debris and soil displacement"},
                    {"factor": "Report Density", "score": 10, "detail": "6 reports"},
                    {"factor": "People at Risk", "score": 18, "detail": "~30 residents nearby"},
                    {"factor": "Infrastructure Risk", "score": 15, "detail": "Road blocked, house damaged"},
                    {"factor": "Location Vulnerability", "score": 7, "detail": "Steep hillside area"},
                ],
            },
        },
        {
            "event_code": "F104",
            "disaster_type": "FLOOD",
            "title": "Waterlogging — Dadar TT",
            "description": "Moderate waterlogging near Dadar TT circle. Traffic crawling. Water on tracks.",
            "latitude": 19.0186, "longitude": 72.8422, "area_km2": 0.6,
            "confidence": 82.0, "severity": "MODERATE", "priority_score": 45,
            "status": "ACTIVE", "report_count": 9, "people_affected": 50,
            "ai_explanation": {
                "disasterType": "FLOOD", "confidence": 82,
                "imageEvidence": "Moderate water accumulation on road surface",
                "textEvidence": "Reports of slow traffic and ankle-deep water",
                "locationEvidence": "Major transit junction",
                "corroboration": "9 reports within 0.6 km²",
                "severityBreakdown": [
                    {"factor": "Image Severity", "score": 12, "detail": "Moderate water level"},
                    {"factor": "Report Density", "score": 10, "detail": "9 reports"},
                    {"factor": "People at Risk", "score": 10, "detail": "~50 commuters"},
                    {"factor": "Infrastructure Risk", "score": 8, "detail": "Railway tracks affected"},
                    {"factor": "Location Vulnerability", "score": 5, "detail": "Transit area"},
                ],
            },
        },
        {
            "event_code": "F105",
            "disaster_type": "FLOOD",
            "title": "Minor Flooding — Kurla Station",
            "description": "Minor waterlogging near Kurla station exit. Water draining slowly.",
            "latitude": 19.0726, "longitude": 72.8793, "area_km2": 0.3,
            "confidence": 76.0, "severity": "LOW", "priority_score": 22,
            "status": "ACTIVE", "report_count": 4, "people_affected": 15,
            "ai_explanation": {
                "disasterType": "FLOOD", "confidence": 76,
                "imageEvidence": "Low water accumulation near station",
                "textEvidence": "Reports indicate water is draining",
                "locationEvidence": "Station area, moderate foot traffic",
                "corroboration": "4 reports",
                "severityBreakdown": [
                    {"factor": "Image Severity", "score": 6, "detail": "Minor water level"},
                    {"factor": "Report Density", "score": 5, "detail": "4 reports"},
                    {"factor": "People at Risk", "score": 5, "detail": "~15 affected"},
                    {"factor": "Infrastructure Risk", "score": 4, "detail": "Station access impacted"},
                    {"factor": "Location Vulnerability", "score": 2, "detail": "Open area"},
                ],
            },
        },
        {
            "event_code": "L302",
            "disaster_type": "LANDSLIDE",
            "title": "Slope Collapse — Powai Hills",
            "description": "Partial slope collapse near Powai lake area. Hiking trail blocked. No casualties reported.",
            "latitude": 19.1176, "longitude": 72.9060, "area_km2": 0.15,
            "confidence": 79.0, "severity": "MODERATE", "priority_score": 48,
            "status": "ACTIVE", "report_count": 5, "people_affected": 12,
            "ai_explanation": {
                "disasterType": "LANDSLIDE", "confidence": 79,
                "imageEvidence": "Visible soil displacement on hillside",
                "textEvidence": "Trail users report path completely blocked",
                "locationEvidence": "Near lake, recreational area",
                "corroboration": "5 reports",
                "severityBreakdown": [
                    {"factor": "Image Severity", "score": 14, "detail": "Moderate debris"},
                    {"factor": "Report Density", "score": 8, "detail": "5 reports"},
                    {"factor": "People at Risk", "score": 10, "detail": "~12 hikers"},
                    {"factor": "Infrastructure Risk", "score": 10, "detail": "Trail blocked"},
                    {"factor": "Location Vulnerability", "score": 6, "detail": "Lake area"},
                ],
            },
        },
    ]

    for data in incidents_data:
        incident = Incident(**data)
        db.add(incident)
    db.flush()
    print(f"   ✅ {len(incidents_data)} incidents created")

    # 3. Seed Resources (Phase 8)
    print("3. Seeding Resources...")
    resources_data = [
        {
            "resource_code": "RCS-01", "type": "Rescue Team", "name": "NDRF Unit Alpha",
            "latitude": 19.0760, "longitude": 72.8777, "availability": "AVAILABLE",
            "capacity": 20, "contact": "+91-9876543210"
        },
        {
            "resource_code": "AMB-101", "type": "Ambulance", "name": "LifeLine Cardiac Amb",
            "latitude": 18.9663, "longitude": 72.8191, "availability": "AVAILABLE",
            "capacity": 2, "contact": "+91-9988776655"
        },
        {
            "resource_code": "AMB-102", "type": "Ambulance", "name": "CitiCare Ambulance",
            "latitude": 19.1176, "longitude": 72.9060, "availability": "BUSY",
            "capacity": 1, "contact": "+91-9988776644"
        },
        {
            "resource_code": "HSP-01", "type": "Hospital", "name": "KEM Hospital",
            "latitude": 19.0036, "longitude": 72.8397, "availability": "AVAILABLE",
            "capacity": 150, "contact": "022-2410-7000"
        },
        {
            "resource_code": "FIR-44", "type": "Fire Station", "name": "Byculla Fire Station",
            "latitude": 18.9772, "longitude": 72.8331, "availability": "AVAILABLE",
            "capacity": 5, "contact": "101"
        },
        {
            "resource_code": "SHL-01", "type": "Shelter", "name": "BKC Relief Camp",
            "latitude": 19.0596, "longitude": 72.8659, "availability": "AVAILABLE",
            "capacity": 500, "contact": "022-2655-0000"
        }
    ]
    for data in resources_data:
        res = Resource(**data)
        db.add(res)
    db.flush()
    print(f"   ✅ {len(resources_data)} resources created")

    db.commit()
    db.close()
    print("\n✅ Database seeded successfully!")


if __name__ == "__main__":
    seed()
