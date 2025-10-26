# Map Download Script Usage Examples

The script now has Santa Clara University as the default location, making it easy to test and use.

## Default Usage (Santa Clara University)

Simply run the script without any arguments to generate a map centered on Santa Clara University:

```bash
python download_map.py
```

This will create a map with:
- **Location**: Santa Clara University (37.3496, -121.9390)
- **Zoom**: 12
- **Style**: Terrain
- **Radius**: 15km
- **Title**: "Santa Clara University Area Trails"

## Custom Usage Examples

### Different Map Styles
```bash
# Satellite view
python download_map.py --style satellite

# Street map
python download_map.py --style streets
```

### Different Search Radius
```bash
# Search within 5km
python download_map.py --radius 5

# Search within 50km
python download_map.py --radius 50
```

### Custom Title
```bash
python download_map.py --title "My Custom Trail Map"
```

### Different Zoom Level
```bash
# Closer view
python download_map.py --zoom 15

# Wider view
python download_map.py --zoom 8
```

### Different Location (Override Santa Clara defaults)
```bash
# San Francisco
python download_map.py --lat 37.7749 --lng -122.4194

# Yosemite National Park
python download_map.py --lat 37.8651 --lng -119.5383 --radius 30 --title "Yosemite Trails"
```

### Complete Custom Example
```bash
python download_map.py \
  --lat 37.7749 \
  --lng -122.4194 \
  --zoom 13 \
  --style satellite \
  --radius 20 \
  --title "San Francisco Bay Area Hiking"
```

## Output

The script generates HTML files with names like:
- `hiking_map_37.3496_-121.939_12_terrain.html`
- `hiking_map_37.3496_-121.939_12_satellite.html`

Open these files in a web browser to view the interactive maps.

## Notes

- The script will show "No OSM hiking data found" if there are no hiking trails in the specified area
- Trailheads from USGS will still be displayed even if no OSM hiking data is available
- The map includes layer controls to toggle different data sources on/off
- All parameters have sensible defaults, so you can run the script with minimal or no arguments
