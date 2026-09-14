"""Severity Scoring Engine — Phase 5.

Calculates multimodal severity for incidents based on:
- Image evidence severity
- Text NLP keywords (distress, urgency)
- Report density (number of associated reports)
- Geospatial risk (simulated residential/infrastructure density)
"""

import math
from typing import Dict, Any, Tuple

def evaluate_text_severity(description: str) -> Tuple[int, str]:
    """Evaluate text for critical keywords. Max 25 points."""
    if not description:
        return 0, "No text description provided"
        
    desc = description.lower()
    score = 0
    reasons = []
    
    # Critical distress
    if any(k in desc for k in ["trapped", "casualty", "dead", "dying", "collapse", "explosion"]):
        score += 15
        reasons.append("Critical distress keywords")
        
    # High urgency
    if any(k in desc for k in ["urgent", "help", "injur", "blood", "stuck", "evacuate"]):
        score += 8
        reasons.append("High urgency markers")
        
    # Moderate issues
    if any(k in desc for k in ["waterlog", "traffic", "blocked", "slow", "heavy"]):
        score += 2
        reasons.append("Moderate disruption")
        
    score = min(25, score)
    return score, ", ".join(reasons) if reasons else "Routine report text"

def evaluate_location_risk(lat: float, lon: float) -> Tuple[int, str]:
    """
    Mock Geospatial risk calculation. Max 25 points.
    In production, this would query PostGIS for population density and infrastructure.
    Here we simulate it based on coordinates.
    """
    # Simple pseudo-random mock that generates consistent risk for identical coordinates
    # Let's say closer to South Mumbai (approx 18.9) is higher density
    density_factor = max(0, min(15, (19.2 - lat) * 20))
    infra_factor = max(0, min(10, (abs(lon - 72.85)) * 10))
    
    score = int(density_factor + infra_factor)
    score = min(score, 25)
    
    if score > 18:
        return score, "High-density residential/commercial area"
    elif score > 10:
        return score, "Moderate urban environment"
    else:
        return score, "Low-risk/open area"

def evaluate_density_severity(report_count: int) -> Tuple[int, str]:
    """Higher number of reports = higher corroboration and scale. Max 25 points."""
    if report_count >= 15:
        return 25, f"{report_count} nearby reports (Massive)"
    elif report_count >= 5:
        return 15, f"{report_count} nearby reports (Significant)"
    elif report_count >= 2:
        return 8, f"{report_count} corroborating reports"
    else:
        return 2, "Isolated single report"

def evaluate_image_severity(confidence: float) -> Tuple[int, str]:
    """Translate YOLO image confidence and inferred disaster scale to severity. Max 25 points."""
    if confidence > 0.90:
        return 25, "Severe disaster elements highly visible"
    elif confidence > 0.70:
        return 15, "Moderate disaster elements detected"
    elif confidence > 0.0:
        return 5, "Minor or ambiguous visual evidence"
    else:
        return 0, "No visual evidence"

def calculate_severity(
    disaster_type: str,
    description: str,
    lat: float,
    lon: float,
    report_count: int,
    image_confidence: float
) -> Tuple[int, str, Dict[str, Any]]:
    """
    Master scoring function (0-100 scale).
    Returns (score, severity_category, ai_explanation_breakdown).
    """
    # 1. Text Component
    text_score, text_reason = evaluate_text_severity(description)
    
    # 2. Location Component
    loc_score, loc_reason = evaluate_location_risk(lat, lon)
    
    # 3. Density Component
    dens_score, dens_reason = evaluate_density_severity(report_count)
    
    # 4. Image Component
    img_score, img_reason = evaluate_image_severity(image_confidence)
    
    total_score = text_score + loc_score + dens_score + img_score
    total_score = min(100, max(0, total_score))
    
    # Categorize
    if total_score >= 75:
        category = "CRITICAL"
    elif total_score >= 50:
        category = "HIGH"
    elif total_score >= 25:
        category = "MODERATE"
    else:
        category = "LOW"
        
    ai_explanation = {
        "disasterType": disaster_type,
        "confidence": int(image_confidence * 100),
        "imageEvidence": img_reason,
        "textEvidence": text_reason,
        "locationEvidence": loc_reason,
        "corroboration": dens_reason,
        "severityBreakdown": [
            {"factor": "Image Severity", "score": img_score, "detail": img_reason},
            {"factor": "Report Density", "score": dens_score, "detail": dens_reason},
            {"factor": "Text/Urgency", "score": text_score, "detail": text_reason},
            {"factor": "Location Vulnerability", "score": loc_score, "detail": loc_reason},
        ]
    }
    
    return total_score, category, ai_explanation
