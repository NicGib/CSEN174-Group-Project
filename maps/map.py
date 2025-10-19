import folium

# Create a map centered on your approximate coordinates
m = folium.Map(location=[37.7749, -122.4194], zoom_start=13)

# Add a marker
folium.Marker(
    [37.7749, -122.4194], popup="San Francisco", tooltip="Click for info"
).add_to(m)

m.save("local_map.html")
