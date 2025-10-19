# pip install osmnx folium geopandas shapely
import osmnx as ox
import folium
import geopandas as gpd

# --- 1) Load a street network with OSMnx ---
place = "Berkeley, California, USA"
G = ox.graph_from_place(place, network_type="drive", simplify=True)

# Optional: add speeds & travel times for routing (uses OSM tags + defaults)
G = ox.add_edge_speeds(G)
G = ox.add_edge_travel_times(G)

# --- 2) Convert to GeoDataFrames for web mapping ---
nodes, edges = ox.graph_to_gdfs(G)

# Center the map
center = [nodes.geometry.y.mean(), nodes.geometry.x.mean()]

# --- 3) Build a Folium map with multiple basemaps ---
m = folium.Map(location=center, zoom_start=13, tiles=None, control_scale=True)
folium.TileLayer("CartoDB Positron", name="Light").add_to(m)
folium.TileLayer("OpenStreetMap", name="OSM").add_to(m)


# --- 4) Add the street layer as GeoJSON with styling + tooltips ---
def edge_color(hwy):
    if isinstance(hwy, list):  # sometimes 'highway' is a list
        hwy = hwy[0]
    if hwy in {"motorway", "trunk"}:
        return "#e67e22"
    if hwy in {"primary", "secondary"}:
        return "#1f77b4"
    if hwy in {"tertiary"}:
        return "#2ca02c"
    return "#7f8c8d"  # residential/other

def style_fn(feature):
    hwy = feature["properties"].get("highway")
    return {"weight": 2, "opacity": 0.9, "color": edge_color(hwy)}

tooltip = folium.GeoJsonTooltip(
    fields=["name", "highway", "length"],
    aliases=["Name", "Highway", "Length (m)"],
    sticky=False,
)

# Keep only a few columns to shrink the payload
edges_view = edges[["geometry", "name", "highway", "length"]].copy()
folium.GeoJson(
    edges_view.to_json(),
    name="OSM Streets",
    style_function=style_fn,
    tooltip=tooltip,
).add_to(m)

# --- 5) (Optional) Route between two points and draw it ---
# Example: origin/destination lat/lon (feel free to replace with geocoded points)
orig_latlon = (37.8719, -122.2585)  # UC Berkeley-ish
dest_latlon = (37.8591, -122.2890)  # toward Aquatic Park

# OSMnx expects (x=lon, y=lat)
orig = ox.distance.nearest_nodes(G, X=orig_latlon[1], Y=orig_latlon[0])
dest = ox.distance.nearest_nodes(G, X=dest_latlon[1], Y=dest_latlon[0])

# Fastest route by travel_time (use weight="length" for shortest distance)
route = ox.shortest_path(G, orig, dest, weight="travel_time")

# Draw the route on the existing Folium map
m = ox.plot_route_folium(
    G,
    route,
    route_map=m,
    color="#d62728",
    weight=6,
    opacity=0.85,
    fit_bounds=True,  # zoom to route
)

# Add markers for origin & destination
folium.Marker(orig_latlon, tooltip="Origin").add_to(m)
folium.Marker(dest_latlon, tooltip="Destination").add_to(m)

# --- 6) Layer control + save ---
folium.LayerControl(collapsed=False).add_to(m)
m.save("osmnx_folium_demo.html")
print("Saved: osmnx_folium_demo.html")
