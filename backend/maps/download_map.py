# pip install folium requests
import math, requests, folium, argparse, html, re
from folium.plugins import MarkerCluster

# ------------------------
# CONFIG
# ------------------------
OVERPASS_URL = "https://overpass-api.de/api/interpreter"  # swap to local if you self-host
USGS_TOPO_TILES = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
TRAILHEADS_URL = "https://carto.nationalmap.gov/arcgis/rest/services/structures/MapServer/61/query"

# Map style configurations
MAP_STYLES = {
    "terrain": {
        "tiles": USGS_TOPO_TILES,
        "name": "USGS Topo",
        "attr": "USGS The National Map"
    },
    "satellite": {
        "tiles": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        "name": "Satellite",
        "attr": "Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community"
    },
    "streets": {
        "tiles": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        "name": "Streets",
        "attr": "Esri, HERE, Garmin, (c) OpenStreetMap contributors, and the GIS user community"
    }
}

def bbox_from_point(lat, lon, r_km):
    dlat = r_km / 111.32
    dlon = r_km / (111.32 * math.cos(math.radians(lat)))
    return (lat-dlat, lon-dlon, lat+dlat, lon+dlon)  # S W N E

def validate_latitude(lat):
    """Validate latitude is between -90 and 90"""
    try:
        lat_float = float(lat)
        if not -90 <= lat_float <= 90:
            raise argparse.ArgumentTypeError(f"Latitude must be between -90 and 90, got {lat_float}")
        return lat_float
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid latitude value: {lat}")

def validate_longitude(lng):
    """Validate longitude is between -180 and 180"""
    try:
        lng_float = float(lng)
        if not -180 <= lng_float <= 180:
            raise argparse.ArgumentTypeError(f"Longitude must be between -180 and 180, got {lng_float}")
        return lng_float
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid longitude value: {lng}")

def validate_zoom(zoom):
    """Validate zoom level is between 1 and 18"""
    try:
        zoom_int = int(zoom)
        if not 1 <= zoom_int <= 18:
            raise argparse.ArgumentTypeError(f"Zoom must be between 1 and 18, got {zoom_int}")
        return zoom_int
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid zoom value: {zoom}")

def validate_style(style):
    """Validate map style is one of the supported options"""
    if style not in MAP_STYLES:
        raise argparse.ArgumentTypeError(f"Style must be one of {list(MAP_STYLES.keys())}, got {style}")
    return style

def validate_format(format_type):
    """Validate output format"""
    if format_type not in ["html", "png"]:
        raise argparse.ArgumentTypeError(f"Format must be 'html' or 'png', got {format_type}")
    return format_type

def validate_radius(radius):
    """Validate radius is positive"""
    try:
        radius_float = float(radius)
        if radius_float < 0:
            raise argparse.ArgumentTypeError(f"Radius must be positive, got {radius_float}")
        return radius_float
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid radius value: {radius}")

def sanitize_title(title):
    """Sanitize title to prevent HTML injection"""
    if not title:
        return ""
    # Remove any HTML tags and escape special characters
    title = re.sub(r'<[^>]+>', '', title)
    title = html.escape(title)
    return title[:100]  # Limit length

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Generate hiking trail maps with OSM data and USGS trailheads")
    
    # Parameters with Santa Clara University defaults
    parser.add_argument("--lat", type=validate_latitude, default=37.3496,
                       help="Latitude of map center (-90 to 90) [default: 37.3496 (Santa Clara University)]")
    parser.add_argument("--lng", type=validate_longitude, default=-121.9390,
                       help="Longitude of map center (-180 to 180) [default: -121.9390 (Santa Clara University)]")
    parser.add_argument("--zoom", type=validate_zoom, default=12,
                       help="Map zoom level (1 to 18) [default: 12]")
    
    # Optional parameters
    parser.add_argument("--style", type=validate_style, default="terrain",
                       choices=list(MAP_STYLES.keys()),
                       help="Map visual style (default: terrain)")
    parser.add_argument("--format", type=validate_format, default="html",
                       choices=["html", "png"],
                       help="Output format (default: html)")
    parser.add_argument("--title", type=str, default="Santa Clara University Area Trails",
                       help="Optional title for the map [default: Santa Clara University Area Trails]")
    parser.add_argument("--radius", type=validate_radius, default=2500,
                       help="Search radius in kilometers (default: 2500)")
    
    return parser.parse_args()

def build_map(lat, lng, zoom, style, sanitized_title, osm_geojson, trailheads_geojson):
    """
    Pure-ish function that builds and returns a folium.Map object
    from already-fetched data.
    No network. No disk.
    """
    m = folium.Map(location=[lat, lng], zoom_start=zoom, tiles=None)

    # Add basemap tiles
    style_config = MAP_STYLES[style]
    folium.TileLayer(
        tiles=style_config["tiles"],
        name=style_config["name"],
        attr=style_config["attr"]
    ).add_to(m)

    # Hiking routes
    hiking_fg = folium.FeatureGroup(name="OSM Hiking routes").add_to(m)
    
    # Only add GeoJSON if we have valid data
    if osm_geojson and osm_geojson.get("type") == "FeatureCollection" and osm_geojson.get("features"):
        # Style trails with more visible colors
        def trail_style(feature):
            return {
                "weight": 4,
                "opacity": 0.9,
                "color": "#FF6B35",  # Orange color for trails
                "fillColor": "#FF6B35",
                "fillOpacity": 0.2
            }
        
        # Build a safe tooltip based on the first feature that actually has properties.
        # Folium validates tooltip fields against the FIRST feature only.
        features_list = osm_geojson.get("features", [])
        first_with_props_idx = next((i for i, f in enumerate(features_list) if f.get("properties")), None)

        tooltip = None
        if first_with_props_idx is not None:
            first_props_keys = set(features_list[first_with_props_idx]["properties"].keys())
            preferred_order = ["name", "highway", "surface", "sac_scale", "tracktype"]
            fields_for_tooltip = [k for k in preferred_order if k in first_props_keys]

            if fields_for_tooltip:
                # Ensure the feature used for validation is first in the collection
                if first_with_props_idx != 0:
                    features_list = [features_list[first_with_props_idx]] + features_list[:first_with_props_idx] + features_list[first_with_props_idx+1:]
                    osm_geojson = {**osm_geojson, "features": features_list}

                aliases_map = {
                    "name": "Trail Name:",
                    "highway": "Type:",
                    "surface": "Surface:",
                    "sac_scale": "SAC:",
                    "tracktype": "Track type:",
                }
                aliases = [aliases_map[k] for k in fields_for_tooltip]
                tooltip = folium.features.GeoJsonTooltip(fields=fields_for_tooltip, aliases=aliases)

        folium.GeoJson(
            osm_geojson,
            name="OSM Hiking Trails",
            style_function=trail_style,
            tooltip=tooltip
        ).add_to(hiking_fg)

        for f in osm_geojson["features"]:
            props = f.get("properties", {})
            if props:
                html_content = (
                    f"<b>{props.get('name', 'Unnamed Trail')}</b><br>"
                    f"<b>SAC:</b> {props.get('sac_scale', 'Unknown')} &nbsp; "
                    f"<b>Surface:</b> {props.get('surface', 'Unknown')} &nbsp; "
                    f"<b>Network:</b> {props.get('network', 'Unknown')}"
                )
                folium.Popup(html_content, max_width=320).add_to(hiking_fg)
    else:
        print("No OSM hiking data found in the specified area.")

    # Trailheads / entryways with enhanced clustering
    create_enhanced_trailhead_markers(trailheads_geojson, m)

    folium.LayerControl(collapsed=False).add_to(m)

    if sanitized_title:
        title_html = f"""
        <div style="position: fixed; 
                    top: 10px; left: 50px; width: 300px; height: 30px; 
                    background-color: white; border: 2px solid grey; z-index:9999; 
                    font-size: 14px; padding: 5px; border-radius: 5px;
                    box-shadow: 0 0 15px rgba(0,0,0,0.2);">
            <b>{sanitized_title}</b>
        </div>
        """
        m.get_root().html.add_child(folium.Element(title_html))

    return m


def convert_osm_to_geojson(osm_data):
    """Convert OSM format to GeoJSON format"""
    if not osm_data or "elements" not in osm_data:
        return {"type": "FeatureCollection", "features": []}
    
    features = []
    nodes = {}
    
    # First pass: collect all nodes
    for element in osm_data["elements"]:
        if element.get("type") == "node":
            node_id = element.get("id")
            lat = element.get("lat")
            lon = element.get("lon")
            if lat is not None and lon is not None:
                nodes[node_id] = {"lat": lat, "lon": lon}
    
    print(f"[Convert] Collected {len(nodes)} nodes")
    
    # Second pass: convert ways to LineString features
    way_count = 0
    for element in osm_data["elements"]:
        if element.get("type") == "way":
            way_count += 1
            geometry = element.get("geometry")
            nodes_list = element.get("nodes", [])
            tags = element.get("tags", {})
            
            coordinates = []
            
            # Prefer geometry if available (includes coordinates directly)
            if geometry and isinstance(geometry, list):
                coordinates = [[coord.get("lon"), coord.get("lat")] 
                             for coord in geometry 
                             if coord.get("lat") is not None and coord.get("lon") is not None]
            elif nodes_list:
                # Build coordinates from node references
                coordinates = []
                for node_id in nodes_list:
                    if node_id in nodes:
                        node = nodes[node_id]
                        # GeoJSON format: [longitude, latitude]
                        coordinates.append([node["lon"], node["lat"]])
            
            # Skip if we don't have enough coordinates
            if len(coordinates) < 2:
                continue
            
            # Only include ways that are likely trails/paths
            highway_type = tags.get("highway", "")
            route_type = tags.get("route", "")
            
            # Include if it's a pedestrian path type or explicitly marked as hiking
            if (highway_type in ["footway", "path", "track", "steps", "bridleway"] or
                route_type == "hiking" or
                "sac_scale" in tags or
                "trail_visibility" in tags or
                tags.get("mountain_pass") == "yes"):
                
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coordinates
                    },
                    "properties": tags
                }
                features.append(feature)
    
    print(f"[Convert] Processed {way_count} ways, created {len(features)} trail features")
    return {"type": "FeatureCollection", "features": features}

def fetch_osm_data(lat, lng, radius_km):
    """Fetch OSM hiking trail data"""
    bbox = bbox_from_point(lat, lng, radius_km)
    south, west, north, east = bbox
    
    print(f"[OSM] Querying bbox: south={south:.4f}, west={west:.4f}, north={north:.4f}, east={east:.4f}")
    
    # More inclusive query - get all walking/hiking related ways
    # Query multiple trail types and ensure we get geometry
    overpass_query = f"""
    [out:json][timeout:60];
    (
      // All pedestrian/hiking paths (most common)
      way["highway"="footway"]({south},{west},{north},{east});
      way["highway"="path"]({south},{west},{north},{east});
      way["highway"="track"]({south},{west},{north},{east});
      way["highway"="steps"]({south},{west},{north},{east});
      way["highway"="bridleway"]({south},{west},{north},{east});
      
      // Ways with hiking-specific tags
      way["route"="hiking"]({south},{west},{north},{east});
      way["trail_visibility"]({south},{west},{north},{east});
      way["sac_scale"]({south},{west},{north},{east});
      way["mountain_pass"="yes"]({south},{west},{north},{east});
    );
    out geom;
    """
    
    try:
        print(f"[OSM] Sending query to Overpass API...")
        response = requests.post(OVERPASS_URL, data=overpass_query, timeout=60)
        response.raise_for_status()
        osm_data = response.json()
        
        # Debug: check what we got
        elements_count = len(osm_data.get("elements", []))
        ways_count = len([e for e in osm_data.get("elements", []) if e.get("type") == "way"])
        nodes_count = len([e for e in osm_data.get("elements", []) if e.get("type") == "node"])
        print(f"[OSM] Received {elements_count} elements ({ways_count} ways, {nodes_count} nodes)")
        
        # Convert OSM format to GeoJSON
        geojson = convert_osm_to_geojson(osm_data)
        feature_count = len(geojson.get("features", []))
        
        print(f"[OSM] Converted to {feature_count} GeoJSON features")
        
        if feature_count > 0:
            # Show sample of trail names if available
            sample_names = [f.get("properties", {}).get("name", "Unnamed") 
                          for f in geojson.get("features", [])[:3] 
                          if f.get("properties", {}).get("name")]
            if sample_names:
                print(f"[OSM] Sample trail names: {', '.join(sample_names)}")
        
        return geojson
    except requests.RequestException as e:
        print(f"[OSM] Error fetching OSM data: {e}")
        print(f"[OSM] Response status: {response.status_code if 'response' in locals() else 'N/A'}")
        return {"type": "FeatureCollection", "features": []}
    except Exception as e:
        print(f"[OSM] Error converting OSM data to GeoJSON: {e}")
        import traceback
        traceback.print_exc()
        return {"type": "FeatureCollection", "features": []}

def fetch_trailheads_data(lat, lng, radius_km):
    """Fetch USGS trailheads data with improved error handling"""
    bbox = bbox_from_point(lat, lng, radius_km)
    south, west, north, east = bbox
    
    params = {
        'f': 'geojson',
        'where': '1=1',
        'geometry': f'{west},{south},{east},{north}',
        'geometryType': 'esriGeometryEnvelope',
        'spatialRel': 'esriSpatialRelIntersects',
        'outFields': 'NAME,ADDRESS,CITY,STATE,ZIPCODE,SOURCE_ORIGINATOR',
        'returnGeometry': 'true'
    }
    
    try:
        response = requests.get(TRAILHEADS_URL, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching trailheads data: {e}")
        return {"type": "FeatureCollection", "features": []}

def create_enhanced_trailhead_markers(trailheads_geojson, map_obj):
    """Create enhanced trailhead markers with better clustering and positioning"""
    if not trailheads_geojson.get("features"):
        return
    
    # Create a more sophisticated clustering system
    cluster = MarkerCluster(
        name="USGS Trailheads",
        options={
            'maxClusterRadius': 50,  # Smaller radius for better clustering
            'spiderfyOnMaxZoom': True,  # Allow spiderfy when zoomed in
            'showCoverageOnHover': True,  # Show coverage on hover
            'zoomToBoundsOnClick': True,  # Zoom to bounds when clicked
            'disableClusteringAtZoom': 15,  # Disable clustering at high zoom
        }
    ).add_to(map_obj)
    
    # Group trailheads by proximity for better organization
    trailhead_groups = {}
    for feat in trailheads_geojson.get("features", []):
        geom = feat.get("geometry", {})
        if geom and geom.get("type") == "Point":
            lon, lat = geom["coordinates"]
            props = feat.get("properties", {})
            
            # Create a unique identifier for grouping nearby trailheads
            group_key = f"{round(lat, 2)}_{round(lon, 2)}"
            
            if group_key not in trailhead_groups:
                trailhead_groups[group_key] = []
            
            trailhead_groups[group_key].append({
                'lat': lat,
                'lon': lon,
                'props': props
            })
    
    # Create markers for each group
    for group_key, trailheads in trailhead_groups.items():
        if len(trailheads) == 1:
            # Single trailhead - create a simple marker
            trailhead = trailheads[0]
            create_trailhead_marker(trailhead, cluster)
        else:
            # Multiple trailheads in same area - create a grouped marker
            create_grouped_trailhead_marker(trailheads, cluster)

def create_trailhead_marker(trailhead, cluster): 
    """Create a single trailhead marker"""
    lat, lon = trailhead['lat'], trailhead['lon']
    props = trailhead['props']
    
    name = props.get("NAME") or "Trailhead"
    addr = ", ".join([
        x for x in [
            props.get("ADDRESS"),
            props.get("CITY"),
            props.get("STATE"),
            props.get("ZIPCODE"),
        ] if x
    ])
    source = props.get("SOURCE_ORIGINATOR") or "USGS"
    
    # Create a custom icon for trailheads
    trailhead_icon = folium.Icon(
        color='green',
        icon='hiking',
        prefix='fa'  # Font Awesome icons
    )
    
    popup_content = f"""
    <div style="min-width: 200px;">
        <h4 style="margin: 0 0 10px 0; color: #2E8B57;">{name}</h4>
        <p style="margin: 5px 0;"><strong>Address:</strong> {addr}</p>
        <p style="margin: 5px 0;"><strong>Source:</strong> {source}</p>
    </div>
    """
    
    folium.Marker(
        [lat, lon],
        tooltip=name,
        popup=folium.Popup(popup_content, max_width=300),
        icon=trailhead_icon
    ).add_to(cluster)

def create_grouped_trailhead_marker(trailheads, cluster):
    """Create a grouped marker for multiple nearby trailheads"""
    # Calculate center point
    center_lat = sum(t['lat'] for t in trailheads) / len(trailheads)
    center_lon = sum(t['lon'] for t in trailheads) / len(trailheads)
    
    # Create a custom icon for grouped trailheads
    grouped_icon = folium.Icon(
        color='darkgreen',
        icon='users',
        prefix='fa'
    )
    
    # Create popup content for all trailheads in the group
    popup_content = f"""
    <div style="min-width: 250px; max-height: 300px; overflow-y: auto;">
        <h4 style="margin: 0 0 10px 0; color: #2E8B57;">Trailheads ({len(trailheads)})</h4>
    """
    
    for i, trailhead in enumerate(trailheads):
        props = trailhead['props']
        name = props.get("NAME") or f"Trailhead {i+1}"
        addr = ", ".join([
            x for x in [
                props.get("ADDRESS"),
                props.get("CITY"),
                props.get("STATE"),
                props.get("ZIPCODE"),
            ] if x
        ])
        
        popup_content += f"""
        <div style="border-bottom: 1px solid #ddd; padding: 5px 0;">
            <strong>{name}</strong><br>
            <small>{addr}</small>
        </div>
        """
    
    popup_content += "</div>"
    
    folium.Marker(
        [center_lat, center_lon],
        tooltip=f"Trailheads ({len(trailheads)})",
        popup=folium.Popup(popup_content, max_width=300),
        icon=grouped_icon
    ).add_to(cluster)

def main():
    """Main function to generate the map"""
    # Parse command line arguments
    args = parse_arguments()
    
    # Sanitize title
    sanitized_title = sanitize_title(args.title)
    
    print(f"Generating map for location: {args.lat}, {args.lng}")
    print(f"Style: {args.style}, Zoom: {args.zoom}, Radius: {args.radius}km")
    
    # Fetch data
    print("Fetching OSM hiking data...")
    osm_geojson = fetch_osm_data(args.lat, args.lng, args.radius)
    
    print("Fetching USGS trailheads data...")
    trailheads_geojson = fetch_trailheads_data(args.lat, args.lng, args.radius)
    
    # Build map
    print("Building map...")
    m = build_map(
        lat=args.lat,
        lng=args.lng,
        zoom=args.zoom,
        style=args.style,
        sanitized_title=sanitized_title,
        osm_geojson=osm_geojson,
        trailheads_geojson=trailheads_geojson
    )

    # Save map to file
    filename = f"hiking_map_{args.lat}_{args.lng}_{args.zoom}_{args.style}.html"
    m.save(filename)
    print(f"Map saved as: {filename}")

if __name__ == "__main__":
    main()
