"""OSRM Routing Service for computing optimal resource paths."""

import json
import urllib.request
import urllib.error
from typing import Dict, Any

OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"

def get_optimal_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> Dict[str, Any]:
    """
    Query the public OSRM API to get driving distance, ETA, and geojson polyline 
    between two coordinates.
    """
    # Coordinates in OSRM are longitude,latitude
    coordinates = f"{start_lon},{start_lat};{end_lon},{end_lat}"
    url = f"{OSRM_BASE_URL}/{coordinates}?overview=full&geometries=geojson"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'ResQMap/1.0'})
    
    try:
        with urllib.request.urlopen(req, timeout=5.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                if data.get("code") == "Ok" and "routes" in data and len(data["routes"]) > 0:
                    route = data["routes"][0]
                    return {
                        "distance_km": round(route.get("distance", 0) / 1000.0, 2),
                        "eta_minutes": round(route.get("duration", 0) / 60.0),
                        "geometry": route.get("geometry")
                    }
    except Exception as e:
        print(f"OSRM Routing Error: {e}")
        
    return {
        "distance_km": None,
        "eta_minutes": None,
        "geometry": None
    }
