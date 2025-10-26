import pytest
import argparse
from unittest.mock import patch, MagicMock
import json
import sys
import os

# Add the parent directory to the path so we can import download_map
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from download_map import (
    validate_latitude,
    validate_longitude,
    validate_zoom,
    validate_style,
    validate_format,
    validate_radius,
    sanitize_title,
    bbox_from_point,
    build_map,
    create_enhanced_trailhead_markers,
    create_trailhead_marker,
    create_grouped_trailhead_marker,
    MAP_STYLES
)


class TestValidationFunctions:
    """Test all validation functions"""
    
    def test_validate_latitude_valid(self):
        """Test valid latitude values"""
        assert validate_latitude("45.0") == 45.0
        assert validate_latitude("-45.0") == -45.0
        assert validate_latitude("90") == 90.0
        assert validate_latitude("-90") == -90.0
        assert validate_latitude("0") == 0.0
    
    def test_validate_latitude_invalid_range(self):
        """Test invalid latitude range"""
        with pytest.raises(argparse.ArgumentTypeError, match="Latitude must be between -90 and 90"):
            validate_latitude("91")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Latitude must be between -90 and 90"):
            validate_latitude("-91")
    
    def test_validate_latitude_invalid_type(self):
        """Test invalid latitude type"""
        with pytest.raises(argparse.ArgumentTypeError, match="Invalid latitude value"):
            validate_latitude("not_a_number")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Invalid latitude value"):
            validate_latitude("")
    
    def test_validate_longitude_valid(self):
        """Test valid longitude values"""
        assert validate_longitude("180.0") == 180.0
        assert validate_longitude("-180.0") == -180.0
        assert validate_longitude("0") == 0.0
        assert validate_longitude("45.5") == 45.5
    
    def test_validate_longitude_invalid_range(self):
        """Test invalid longitude range"""
        with pytest.raises(argparse.ArgumentTypeError, match="Longitude must be between -180 and 180"):
            validate_longitude("181")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Longitude must be between -180 and 180"):
            validate_longitude("-181")
    
    def test_validate_longitude_invalid_type(self):
        """Test invalid longitude type"""
        with pytest.raises(argparse.ArgumentTypeError, match="Invalid longitude value"):
            validate_longitude("not_a_number")
    
    def test_validate_zoom_valid(self):
        """Test valid zoom values"""
        assert validate_zoom("1") == 1
        assert validate_zoom("18") == 18
        assert validate_zoom("10") == 10
    
    def test_validate_zoom_negative(self):
        """Test negative zoom values"""
        with pytest.raises(argparse.ArgumentTypeError, match="Zoom must be between 1 and 18"):
            validate_zoom("-1")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Zoom must be between 1 and 18"):
            validate_zoom("0")
    
    def test_validate_zoom_invalid_range(self):
        """Test invalid zoom range"""
        with pytest.raises(argparse.ArgumentTypeError, match="Zoom must be between 1 and 18"):
            validate_zoom("19")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Zoom must be between 1 and 18"):
            validate_zoom("25")
    
    def test_validate_zoom_invalid_type(self):
        """Test invalid zoom type"""
        with pytest.raises(argparse.ArgumentTypeError, match="Invalid zoom value"):
            validate_zoom("not_a_number")
    
    def test_validate_style_valid(self):
        """Test valid style values"""
        for style in MAP_STYLES.keys():
            assert validate_style(style) == style
    
    def test_validate_style_invalid(self):
        """Test invalid style values"""
        with pytest.raises(argparse.ArgumentTypeError, match="Style must be one of"):
            validate_style("invalid_style")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Style must be one of"):
            validate_style("")
    
    def test_validate_format_valid(self):
        """Test valid format values"""
        assert validate_format("html") == "html"
        assert validate_format("png") == "png"
    
    def test_validate_format_invalid(self):
        """Test invalid format values"""
        with pytest.raises(argparse.ArgumentTypeError, match="Format must be 'html' or 'png'"):
            validate_format("pdf")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Format must be 'html' or 'png'"):
            validate_format("")
    
    def test_validate_radius_valid(self):
        """Test valid radius values"""
        assert validate_radius("30.0") == 30.0
        assert validate_radius("0.5") == 0.5
        assert validate_radius("100") == 100.0
        assert validate_radius("0") == 0.0
    
    def test_validate_radius_negative(self):
        """Test negative radius values"""
        with pytest.raises(argparse.ArgumentTypeError, match="Radius must be positive"):
            validate_radius("-10")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Radius must be positive"):
            validate_radius("-0.1")
    
    def test_validate_radius_invalid_type(self):
        """Test invalid radius type"""
        with pytest.raises(argparse.ArgumentTypeError, match="Invalid radius value"):
            validate_radius("not_a_number")
        
        with pytest.raises(argparse.ArgumentTypeError, match="Invalid radius value"):
            validate_radius("")


class TestUtilityFunctions:
    """Test utility functions"""
    
    def test_sanitize_title_empty(self):
        """Test sanitize_title with empty string"""
        assert sanitize_title("") == ""
        assert sanitize_title(None) == ""
    
    def test_sanitize_title_normal(self):
        """Test sanitize_title with normal text"""
        assert sanitize_title("Test Trail") == "Test Trail"
        assert sanitize_title("Mountain Peak #1") == "Mountain Peak #1"
    
    def test_sanitize_title_html_injection(self):
        """Test sanitize_title prevents HTML injection"""
        malicious = "<script>alert('xss')</script>"
        result = sanitize_title(malicious)
        assert "<script>" not in result
        assert "alert('xss')" not in result  # The alert function is escaped but still present
        assert "alert(&#x27;xss&#x27;)" in result  # The content is HTML-escaped
        assert "&#x27;" in result  # HTML entities should be present
    
    def test_sanitize_title_length_limit(self):
        """Test sanitize_title length limit"""
        long_title = "A" * 150
        result = sanitize_title(long_title)
        assert len(result) == 100
    
    def test_bbox_from_point(self):
        """Test bbox_from_point calculation"""
        # Test with known values
        lat, lon, radius = 40.0, -105.0, 10.0
        bbox = bbox_from_point(lat, lon, radius)
        
        # Check that bbox is a tuple of 4 elements
        assert len(bbox) == 4
        assert isinstance(bbox[0], float)  # south
        assert isinstance(bbox[1], float)  # west
        assert isinstance(bbox[2], float)  # north
        assert isinstance(bbox[3], float)  # east
        
        # Check that the center point is within the bbox
        assert bbox[0] < lat < bbox[2]  # south < lat < north
        assert bbox[1] < lon < bbox[3]  # west < lon < east


class TestBuildMap:
    """Test the build_map function"""
    
    @pytest.fixture
    def sample_osm_geojson(self):
        """Sample OSM GeoJSON data"""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Test Trail",
                        "sac_scale": "T1",
                        "surface": "dirt",
                        "network": "hiking"
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[-105.0, 40.0], [-105.1, 40.1]]
                    }
                }
            ]
        }
    
    @pytest.fixture
    def sample_trailheads_geojson(self):
        """Sample trailheads GeoJSON data"""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "NAME": "Test Trailhead",
                        "ADDRESS": "123 Trail St",
                        "CITY": "Boulder",
                        "STATE": "CO",
                        "ZIPCODE": "80301",
                        "SOURCE_ORIGINATOR": "USGS"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-105.0, 40.0]
                    }
                }
            ]
        }
    
    def test_build_map_terrain_style(self, sample_osm_geojson, sample_trailheads_geojson):
        """Test build_map with terrain style"""
        map_obj = build_map(
            lat=40.0,
            lng=-105.0,
            zoom=10,
            style="terrain",
            sanitized_title="Test Map",
            osm_geojson=sample_osm_geojson,
            trailheads_geojson=sample_trailheads_geojson
        )
        
        assert map_obj is not None
        assert map_obj.location == [40.0, -105.0]
        assert map_obj.options['zoom'] == 10
    
    def test_build_map_satellite_style(self, sample_osm_geojson, sample_trailheads_geojson):
        """Test build_map with satellite style"""
        map_obj = build_map(
            lat=40.0,
            lng=-105.0,
            zoom=10,
            style="satellite",
            sanitized_title="Test Map",
            osm_geojson=sample_osm_geojson,
            trailheads_geojson=sample_trailheads_geojson
        )
        
        assert map_obj is not None
        assert map_obj.location == [40.0, -105.0]
    
    def test_build_map_streets_style(self, sample_osm_geojson, sample_trailheads_geojson):
        """Test build_map with streets style"""
        map_obj = build_map(
            lat=40.0,
            lng=-105.0,
            zoom=10,
            style="streets",
            sanitized_title="Test Map",
            osm_geojson=sample_osm_geojson,
            trailheads_geojson=sample_trailheads_geojson
        )
        
        assert map_obj is not None
        assert map_obj.location == [40.0, -105.0]
    
    def test_build_map_empty_geojson(self):
        """Test build_map with empty GeoJSON data"""
        empty_osm = {"type": "FeatureCollection", "features": []}
        empty_trailheads = {"type": "FeatureCollection", "features": []}
        
        map_obj = build_map(
            lat=40.0,
            lng=-105.0,
            zoom=10,
            style="terrain",
            sanitized_title="",
            osm_geojson=empty_osm,
            trailheads_geojson=empty_trailheads
        )
        
        assert map_obj is not None
        assert map_obj.location == [40.0, -105.0]
    
    def test_build_map_with_title(self, sample_osm_geojson, sample_trailheads_geojson):
        """Test build_map with title"""
        map_obj = build_map(
            lat=40.0,
            lng=-105.0,
            zoom=10,
            style="terrain",
            sanitized_title="My Test Map",
            osm_geojson=sample_osm_geojson,
            trailheads_geojson=sample_trailheads_geojson
        )
        
        assert map_obj is not None
        # Check that title HTML was added by checking if the html element has children
        html_element = map_obj.get_root().html
        assert html_element is not None
        # The title should be added as a child element
        assert len(html_element._children) > 0


class TestEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_negative_radius_bbox_calculation(self):
        """Test bbox_from_point with negative radius"""
        # This should still work but might produce unexpected results
        lat, lon, radius = 40.0, -105.0, -10.0
        bbox = bbox_from_point(lat, lon, radius)
        
        # The function should still return a valid bbox
        assert len(bbox) == 4
        assert all(isinstance(x, float) for x in bbox)
    
    def test_zero_radius_bbox_calculation(self):
        """Test bbox_from_point with zero radius"""
        lat, lon, radius = 40.0, -105.0, 0.0
        bbox = bbox_from_point(lat, lon, radius)
        
        # Should return a very small bbox
        assert len(bbox) == 4
        assert bbox[0] == bbox[2] == lat  # south == north == lat
        assert bbox[1] == bbox[3] == lon  # west == east == lon
    
    def test_extreme_coordinates(self):
        """Test with extreme but valid coordinates"""
        # North pole
        bbox = bbox_from_point(89.0, 0.0, 1.0)
        assert len(bbox) == 4
        
        # South pole
        bbox = bbox_from_point(-89.0, 0.0, 1.0)
        assert len(bbox) == 4
        
        # International date line
        bbox = bbox_from_point(0.0, 179.0, 1.0)
        assert len(bbox) == 4


class TestEnhancedPinPlacement:
    """Test enhanced trailhead pin placement functionality"""
    
    @pytest.fixture
    def sample_trailheads_geojson(self):
        """Sample trailheads GeoJSON data"""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "NAME": "Test Trailhead 1",
                        "ADDRESS": "123 Trail St",
                        "CITY": "Boulder",
                        "STATE": "CO",
                        "ZIPCODE": "80301",
                        "SOURCE_ORIGINATOR": "USGS"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-105.0, 40.0]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "NAME": "Test Trailhead 2",
                        "ADDRESS": "456 Mountain Rd",
                        "CITY": "Boulder",
                        "STATE": "CO",
                        "ZIPCODE": "80302",
                        "SOURCE_ORIGINATOR": "USGS"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-105.01, 40.01]
                    }
                }
            ]
        }
    
    @pytest.fixture
    def mock_map(self):
        """Mock folium map object"""
        mock_map = MagicMock()
        mock_map.add_to = MagicMock()
        return mock_map
    
    def test_create_enhanced_trailhead_markers_empty_data(self, mock_map):
        """Test enhanced trailhead markers with empty data"""
        empty_geojson = {"type": "FeatureCollection", "features": []}
        create_enhanced_trailhead_markers(empty_geojson, mock_map)
        # Should not raise any errors
    
    def test_create_enhanced_trailhead_markers_with_data(self, sample_trailheads_geojson, mock_map):
        """Test enhanced trailhead markers with sample data"""
        create_enhanced_trailhead_markers(sample_trailheads_geojson, mock_map)
        # Should not raise any errors
    
    def test_create_trailhead_marker(self, mock_map):
        """Test creating a single trailhead marker"""
        trailhead = {
            'lat': 40.0,
            'lon': -105.0,
            'props': {
                'NAME': 'Test Trailhead',
                'ADDRESS': '123 Test St',
                'CITY': 'Boulder',
                'STATE': 'CO',
                'ZIPCODE': '80301',
                'SOURCE_ORIGINATOR': 'USGS'
            }
        }
        
        create_trailhead_marker(trailhead, mock_map)
        # Should not raise any errors
    
    def test_create_grouped_trailhead_marker(self, mock_map):
        """Test creating a grouped trailhead marker"""
        trailheads = [
            {
                'lat': 40.0,
                'lon': -105.0,
                'props': {'NAME': 'Trailhead 1', 'ADDRESS': '123 St', 'CITY': 'Boulder', 'STATE': 'CO', 'ZIPCODE': '80301', 'SOURCE_ORIGINATOR': 'USGS'}
            },
            {
                'lat': 40.01,
                'lon': -105.01,
                'props': {'NAME': 'Trailhead 2', 'ADDRESS': '456 Rd', 'CITY': 'Boulder', 'STATE': 'CO', 'ZIPCODE': '80302', 'SOURCE_ORIGINATOR': 'USGS'}
            }
        ]
        
        create_grouped_trailhead_marker(trailheads, mock_map)
        # Should not raise any errors


class TestIntegration:
    """Integration tests"""
    
    def test_all_validation_functions_together(self):
        """Test that all validation functions work together"""
        # This simulates what would happen in parse_arguments()
        lat = validate_latitude("45.0")
        lng = validate_longitude("-105.0")
        zoom = validate_zoom("10")
        style = validate_style("terrain")
        format_type = validate_format("html")
        radius = validate_radius("30.0")
        
        assert lat == 45.0
        assert lng == -105.0
        assert zoom == 10
        assert style == "terrain"
        assert format_type == "html"
        assert radius == 30.0
    
    def test_invalid_style_raises_error(self):
        """Test that invalid style raises appropriate error"""
        with pytest.raises(argparse.ArgumentTypeError):
            validate_style("nonexistent_style")
    
    def test_negative_zoom_raises_error(self):
        """Test that negative zoom raises appropriate error"""
        with pytest.raises(argparse.ArgumentTypeError):
            validate_zoom("-5")
    
    def test_negative_radius_raises_error(self):
        """Test that negative radius raises appropriate error"""
        with pytest.raises(argparse.ArgumentTypeError):
            validate_radius("-10")


if __name__ == "__main__":
    pytest.main([__file__])
