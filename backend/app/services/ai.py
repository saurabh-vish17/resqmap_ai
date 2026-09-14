"""AI Service — Phase 4 YOLO Disaster Classification Stub."""

import os
import random
from typing import Dict, Any, Tuple

def analyze_image(image_path: str, hint: str = None) -> Tuple[str, float]:
    """
    Simulates a YOLOv8 inference pass on an image.
    In a real scenario, this would load a PyTorch model and run inference.
    For this SIH prototype, if a hint is provided, it returns that type with high confidence.
    Otherwise, it pseudo-randomly assigns a type based on file size/hash.
    
    Returns:
        (predicted_type, confidence_score)
    """
    if not image_path or not os.path.exists(image_path):
        return ("UNKNOWN", 0.0)
        
    # Simulate processing time depending on file size (not doing actual sleep to keep API snappy)
    # Give high confidence to the hint to make the demo smooth
    
    confidence = round(random.uniform(0.75, 0.98), 2)
    
    if hint and hint.upper() in ["FLOOD", "FIRE", "LANDSLIDE"]:
        return (hint.upper(), confidence)
    
    # Fallback pseudo-random choice if no hint
    filesize = os.path.getsize(image_path)
    choice = filesize % 3
    types = ["FLOOD", "FIRE", "LANDSLIDE"]
    predicted_type = types[choice]
    
    return (predicted_type, confidence)

def get_image_evidence_text(disaster_type: str) -> str:
    """Generate mock SHAP/Grad-CAM explanation for the prediction."""
    explanations = {
        "FLOOD": "Water level appears high — road completely submerged",
        "FIRE": "Active flames and heavy smoke clearly visible",
        "LANDSLIDE": "Significant soil displacement and debris detected",
        "UNKNOWN": "No clear disaster patterns recognized in image"
    }
    return explanations.get(disaster_type.upper(), explanations["UNKNOWN"])
