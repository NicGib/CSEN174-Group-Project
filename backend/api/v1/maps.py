from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional
import argparse

# Import map functions using relative import
from ...maps.download_map import (
    fetch_osm_data,
    fetch_trailheads_data,
    build_map,
    validate_latitude,
    validate_longitude,
    validate_zoom,
    validate_style,
    validate_radius,
    sanitize_title
)
from ...maps.trails_dataset import get_california_trails_geojson

router = APIRouter(prefix="/maps", tags=["maps"])

class MapRequest(BaseModel):
    lat: float = Field(default=37.3496, ge=-90, le=90, description="Latitude of map center")
    lng: float = Field(default=-121.9390, ge=-180, le=180, description="Longitude of map center")
    zoom: int = Field(default=12, ge=1, le=18, description="Map zoom level")
    style: str = Field(default="terrain", description="Map style: terrain, satellite, or streets")
    title: Optional[str] = Field(default="Hiking Trail Map", max_length=100)
    radius: float = Field(default=15.0, gt=0, description="Search radius in kilometers")

@router.get("/", response_class=HTMLResponse)
def generate_map(
    lat: float = Query(37.3496, ge=-90, le=90, description="Latitude of map center"),
    lng: float = Query(-121.9390, ge=-180, le=180, description="Longitude of map center"),
    zoom: int = Query(12, ge=1, le=18, description="Map zoom level"),
    style: str = Query("terrain", description="Map style: terrain, satellite, or streets"),
    title: Optional[str] = Query("Hiking Trail Map", description="Optional title for the map"),
    radius: float = Query(15.0, gt=0, description="Search radius in kilometers")
):
    """
    Generate an HTML map with hiking trails and trailheads.
    
    Returns an HTML string that can be displayed in a WebView.
    """
    try:
        # Validate inputs
        try:
            validate_latitude(lat)
            validate_longitude(lng)
            validate_zoom(zoom)
            validate_style(style)
            validate_radius(radius)
        except (ValueError, TypeError, argparse.ArgumentTypeError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        
        sanitized_title = sanitize_title(title) if title else ""
        
        # Fetch data
        osm_geojson = fetch_osm_data(lat, lng, radius)
        trailheads_geojson = fetch_trailheads_data(lat, lng, radius)
        state_trails_geojson = get_california_trails_geojson(lat, lng, radius)
        
        # Log data fetch results for debugging
        trail_count = len(osm_geojson.get("features", [])) if osm_geojson else 0
        trailhead_count = len(trailheads_geojson.get("features", [])) if trailheads_geojson else 0
        state_trail_count = len(state_trails_geojson.get("features", [])) if state_trails_geojson else 0
        print(f"[API] Map request: lat={lat}, lng={lng}, radius={radius}km")
        print(f"[API] Fetched {trail_count} OSM trails, {trailhead_count} trailheads, {state_trail_count} CA merged trails")
        
        # Build map
        m = build_map(
            lat=lat,
            lng=lng,
            zoom=zoom,
            style=style,
            sanitized_title=sanitized_title,
            osm_geojson=osm_geojson,
            trailheads_geojson=trailheads_geojson,
            state_trails_geojson=state_trails_geojson,
        )
        
        # Convert map to HTML string
        html_str = m.get_root().render()
        
        return HTMLResponse(content=html_str)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating map: {str(e)}")

@router.post("/", response_class=HTMLResponse)
def generate_map_post(request: MapRequest):
    """
    Generate an HTML map with hiking trails and trailheads (POST endpoint).
    
    Returns an HTML string that can be displayed in a WebView.
    """
    try:
        # Validate inputs
        validate_latitude(request.lat)
        validate_longitude(request.lng)
        validate_zoom(request.zoom)
        validate_style(request.style)
        validate_radius(request.radius)
        sanitized_title = sanitize_title(request.title) if request.title else ""
        
        # Fetch data
        osm_geojson = fetch_osm_data(request.lat, request.lng, request.radius)
        trailheads_geojson = fetch_trailheads_data(request.lat, request.lng, request.radius)
        state_trails_geojson = get_california_trails_geojson(request.lat, request.lng, request.radius)
        
        # Log data fetch results for debugging
        trail_count = len(osm_geojson.get("features", [])) if osm_geojson else 0
        trailhead_count = len(trailheads_geojson.get("features", [])) if trailheads_geojson else 0
        state_trail_count = len(state_trails_geojson.get("features", [])) if state_trails_geojson else 0
        print(f"[API] Map request (POST): lat={request.lat}, lng={request.lng}, radius={request.radius}km")
        print(f"[API] Fetched {trail_count} OSM trails, {trailhead_count} trailheads, {state_trail_count} CA merged trails")
        
        # Build map
        m = build_map(
            lat=request.lat,
            lng=request.lng,
            zoom=request.zoom,
            style=request.style,
            sanitized_title=sanitized_title,
            osm_geojson=osm_geojson,
            trailheads_geojson=trailheads_geojson,
            state_trails_geojson=state_trails_geojson,
        )
        
        # Convert map to HTML string
        html_str = m.get_root().render()
        
        return HTMLResponse(content=html_str)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating map: {str(e)}")
