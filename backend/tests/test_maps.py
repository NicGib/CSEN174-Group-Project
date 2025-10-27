#!/usr/bin/env python3
"""
Comprehensive unit tests for the map downloading functionality
Tests map generation, data fetching, and validation functions
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock
import json

# Add the parent directory to the path so we can import from maps
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from maps.download_map import (
    bbox_from_point,
    validate_latitude,
    validate_longitude,
    validate_zoom,
    validate_style,
    validate_format,
    validate_radius,
    sanitize_title,
    parse_arguments,
    build_map,
    fetch_osm_data,
    fetch_trailheads_data,
    create_enhanced_trailhead_markers,
    create_trailhead_marker,
    create_grouped_trailhead_marker,
    main
)


class TestValidationFunctions:
    """Test input validation functions"""
    
    def test_validate_latitude_valid(self):
        """Test valid latitude values"""
        assert validate_latitude("0") == 0.0
        assert validate_latitude("45.5") == 45.5
        assert validate_latitude("-90") == -90.0
        assert validate_latitude("90") == 90.0
    
    def test_validate_latitude_invalid_range(self):
        """Test invalid latitude range"""
        with pytest.raises(Exception, match="Latitude must be between -90 and 90"):
            validate_latitude("91")
        
        with pytest.raises(Exception, match="Latitude must be between -90 and 90"):
            validate_latitude("-91")
    
    def test_validate_latitude_invalid_format(self):
        """Test invalid latitude format"""
        with pytest.raises(Exception, match="Invalid latitude value"):
            validate_latitude("not_a_number")
    
    def test_validate_longitude_valid(self):
        """Test valid longitude values"""
        assert validate_longitude("0") == 0.0
        assert validate_longitude("120.5") == 120.5
        assert validate_longitude("-180") == -180.0
        assert validate_longitude("180") == 180.0
    
    def test_validate_longitude_invalid_range(self):
        """Test invalid longitude range"""
        with pytest.raises(Exception, match="Longitude must be between -180 and 180"):
            validate_longitude("181")
        
        with pytest.raises(Exception, match="Longitude must be between -180 and 180"):
            validate_longitude("-181")
    
    def test_validate_zoom_valid(self):
        """Test valid zoom levels"""
        assert validate_zoom("1") == 1
        assert validate_zoom("10") == 10
        assert validate_zoom("18") == 18
    
    def test_validate_zoom_invalid_range(self):
        """Test invalid zoom range"""
        with pytest.raises(Exception, match="Zoom must be between 1 and 18"):
            validate_zoom("0")
        
        with pytest.raises(Exception, match="Zoom must be between 1 and 18"):
            validate_zoom("19")
    
    def test_validate_style_valid(self):
        """Test valid map styles"""
        assert validate_style("terrain") == "terrain"
        assert validate_style("satellite") == "satellite"
        assert validate_style("streets") == "streets"
    
    def test_validate_style_invalid(self):
        """Test invalid map style"""
        with pytest.raises(Exception, match="Style must be one of"):
            validate_style("invalid_style")
    
    def test_validate_format_valid(self):
        """Test valid output formats"""
        assert validate_format("html") == "html"
        assert validate_format("png") == "png"
    
    def test_validate_format_invalid(self):
        """Test invalid output format"""
        with pytest.raises(Exception, match="Format must be 'html' or 'png'"):
            validate_format("pdf")
    
    def test_validate_radius_valid(self):
        """Test valid radius values"""
        assert validate_radius("0") == 0.0
        assert validate_radius("1000") == 1000.0
        assert validate_radius("2500.5") == 2500.5
    
    def test_validate_radius_invalid_negative(self):
        """Test invalid negative radius"""
        with pytest.raises(Exception, match="Radius must be positive"):
            validate_radius("-100")


class TestUtilityFunctions:
    """Test utility functions"""
    
    def test_bbox_from_point(self):
        """Test bounding box calculation from point and radius"""
        # Test with Santa Clara University coordinates
        lat, lon = 37.3496, -121.9390
        radius_km = 10
        
        bbox = bbox_from_point(lat, lon, radius_km)
        
        assert len(bbox) == 4
        south, west, north, east = bbox
        
        # South should be less than north
        assert south < north
        # West should be less than east
        assert west < east
        # The center point should be within the bbox
        assert south <= lat <= north
        assert west <= lon <= east
    
    def test_sanitize_title_empty(self):
        """Test sanitizing empty title"""
        assert sanitize_title("") == ""
        assert sanitize_title(None) == ""
    
    def test_sanitize_title_html_removal(self):
        """Test HTML tag removal"""
        title_with_html = "<script>alert('xss')</script>Test Title"
        sanitized = sanitize_title(title_with_html)
        assert "<script>" not in sanitized
        assert "Test Title" in sanitized
    
    def test_sanitize_title_length_limit(self):
        """Test title length limitation"""
        long_title = "A" * 150
        sanitized = sanitize_title(long_title)
        assert len(sanitized) <= 100
    
    def test_sanitize_title_special_chars(self):
        """Test special character escaping"""
        title_with_special = "Test & Title < > \" '"
        sanitized = sanitize_title(title_with_special)
        assert "&amp;" in sanitized
        assert "&lt;" in sanitized
        assert "&gt;" in sanitized


class TestArgumentParsing:
    """Test command line argument parsing"""
    
    def test_parse_arguments_defaults(self):
        """Test default argument values"""
        with patch('sys.argv', ['download_map.py']):
            args = parse_arguments()
            
            assert args.lat == 37.3496  # Santa Clara University default
            assert args.lng == -121.9390
            assert args.zoom == 12
            assert args.style == "terrain"
            assert args.format == "html"
            assert args.title == "Santa Clara University Area Trails"
            assert args.radius == 2500
    
    def test_parse_arguments_custom(self):
        """Test custom argument values"""
        with patch('sys.argv', [
            'download_map.py',
            '--lat', '40.7128',
            '--lng', '-74.0060',
            '--zoom', '15',
            '--style', 'satellite',
            '--format', 'png',
            '--title', 'New York Trails',
            '--radius', '5000'
        ]):
            args = parse_arguments()
            
            assert args.lat == 40.7128
            assert args.lng == -74.0060
            assert args.zoom == 15
            assert args.style == "satellite"
            assert args.format == "png"
            assert args.title == "New York Trails"
            assert args.radius == 5000


class TestDataFetching:
    """Test data fetching functions"""
    
    @patch('maps.download_map.requests.post')
    def test_fetch_osm_data_success(self, mock_post):
        """Test successful OSM data fetching"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Test Trail",
                        "sac_scale": "hiking",
                        "surface": "dirt",
                        "network": "local"
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[-121.9390, 37.3496], [-121.9380, 37.3506]]
                    }
                }
            ]
        }
        mock_post.return_value = mock_response
        
        result = fetch_osm_data(37.3496, -121.9390, 10)
        
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 1
        assert result["features"][0]["properties"]["name"] == "Test Trail"
    
    @patch('maps.download_map.requests.post')
    def test_fetch_osm_data_network_error(self, mock_post):
        """Test OSM data fetching with network error"""
        mock_post.side_effect = Exception("Network error")
        
        result = fetch_osm_data(37.3496, -121.9390, 10)
        
        assert result["type"] == "FeatureCollection"
        assert result["features"] == []
    
    @patch('maps.download_map.requests.get')
    def test_fetch_trailheads_data_success(self, mock_get):
        """Test successful trailheads data fetching"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "NAME": "Test Trailhead",
                        "ADDRESS": "123 Test St",
                        "CITY": "Test City",
                        "STATE": "CA",
                        "ZIPCODE": "12345",
                        "SOURCE_ORIGINATOR": "USGS"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-121.9390, 37.3496]
                    }
                }
            ]
        }
        mock_get.return_value = mock_response
        
        result = fetch_trailheads_data(37.3496, -121.9390, 10)
        
        assert result["type"] == "FeatureCollection"
        assert len(result["features"]) == 1
        assert result["features"][0]["properties"]["NAME"] == "Test Trailhead"
    
    @patch('maps.download_map.requests.get')
    def test_fetch_trailheads_data_network_error(self, mock_get):
        """Test trailheads data fetching with network error"""
        mock_get.side_effect = Exception("Network error")
        
        result = fetch_trailheads_data(37.3496, -121.9390, 10)
        
        assert result["type"] == "FeatureCollection"
        assert result["features"] == []


class TestMapBuilding:
    """Test map building functionality"""
    
    @patch('maps.download_map.folium')
    def test_build_map_basic(self, mock_folium):
        """Test basic map building"""
        # Mock folium components
        mock_map = Mock()
        mock_folium.Map.return_value = mock_map
        
        osm_data = {
            "type": "FeatureCollection",
            "features": []
        }
        trailheads_data = {
            "type": "FeatureCollection",
            "features": []
        }
        
        result = build_map(
            lat=37.3496,
            lng=-121.9390,
            zoom=12,
            style="terrain",
            sanitized_title="Test Map",
            osm_geojson=osm_data,
            trailheads_geojson=trailheads_data
        )
        
        assert result == mock_map
        mock_folium.Map.assert_called_once()
    
    @patch('maps.download_map.folium')
    def test_build_map_with_osm_data(self, mock_folium):
        """Test map building with OSM data"""
        mock_map = Mock()
        mock_folium.Map.return_value = mock_map
        
        osm_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Test Trail",
                        "sac_scale": "hiking",
                        "surface": "dirt",
                        "network": "local"
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[-121.9390, 37.3496], [-121.9380, 37.3506]]
                    }
                }
            ]
        }
        trailheads_data = {"type": "FeatureCollection", "features": []}
        
        build_map(
            lat=37.3496,
            lng=-121.9390,
            zoom=12,
            style="terrain",
            sanitized_title="Test Map",
            osm_geojson=osm_data,
            trailheads_geojson=trailheads_data
        )
        
        # Verify GeoJSON was added
        mock_map.add_to.assert_called()


class TestTrailheadMarkers:
    """Test trailhead marker creation"""
    
    @patch('maps.download_map.folium')
    def test_create_trailhead_marker(self, mock_folium):
        """Test single trailhead marker creation"""
        mock_cluster = Mock()
        
        trailhead = {
            'lat': 37.3496,
            'lon': -121.9390,
            'props': {
                'NAME': 'Test Trailhead',
                'ADDRESS': '123 Test St',
                'CITY': 'Test City',
                'STATE': 'CA',
                'ZIPCODE': '12345',
                'SOURCE_ORIGINATOR': 'USGS'
            }
        }
        
        create_trailhead_marker(trailhead, mock_cluster)
        
        # Verify marker was added to cluster
        mock_cluster.add_to.assert_called()
    
    @patch('maps.download_map.folium')
    def test_create_grouped_trailhead_marker(self, mock_folium):
        """Test grouped trailhead marker creation"""
        mock_cluster = Mock()
        
        trailheads = [
            {
                'lat': 37.3496,
                'lon': -121.9390,
                'props': {'NAME': 'Trailhead 1', 'ADDRESS': '123 Test St'}
            },
            {
                'lat': 37.3500,
                'lon': -121.9385,
                'props': {'NAME': 'Trailhead 2', 'ADDRESS': '456 Test Ave'}
            }
        ]
        
        create_grouped_trailhead_marker(trailheads, mock_cluster)
        
        # Verify grouped marker was added to cluster
        mock_cluster.add_to.assert_called()
    
    @patch('maps.download_map.folium')
    def test_create_enhanced_trailhead_markers_empty(self, mock_folium):
        """Test enhanced trailhead markers with empty data"""
        mock_map = Mock()
        empty_data = {"type": "FeatureCollection", "features": []}
        
        create_enhanced_trailhead_markers(empty_data, mock_map)
        
        # Should not add any markers
        mock_map.add_to.assert_not_called()
    
    @patch('maps.download_map.folium')
    def test_create_enhanced_trailhead_markers_single(self, mock_folium):
        """Test enhanced trailhead markers with single trailhead"""
        mock_map = Mock()
        mock_cluster = Mock()
        mock_folium.MarkerCluster.return_value = mock_cluster
        
        data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "NAME": "Test Trailhead",
                        "ADDRESS": "123 Test St"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-121.9390, 37.3496]
                    }
                }
            ]
        }
        
        create_enhanced_trailhead_markers(data, mock_map)
        
        # Verify cluster was created and added to map
        mock_folium.MarkerCluster.assert_called_once()
        mock_cluster.add_to.assert_called_with(mock_map)


class TestIntegrationScenarios:
    """Test integration scenarios"""
    
    @patch('maps.download_map.fetch_osm_data')
    @patch('maps.download_map.fetch_trailheads_data')
    @patch('maps.download_map.build_map')
    @patch('maps.download_map.parse_arguments')
    def test_main_function_success(self, mock_parse_args, mock_build_map, 
                                 mock_fetch_trailheads, mock_fetch_osm):
        """Test successful main function execution"""
        # Mock command line arguments
        mock_args = Mock()
        mock_args.lat = 37.3496
        mock_args.lng = -121.9390
        mock_args.zoom = 12
        mock_args.style = "terrain"
        mock_args.title = "Test Map"
        mock_args.radius = 2500
        mock_parse_args.return_value = mock_args
        
        # Mock data fetching
        mock_osm_data = {"type": "FeatureCollection", "features": []}
        mock_trailheads_data = {"type": "FeatureCollection", "features": []}
        mock_fetch_osm.return_value = mock_osm_data
        mock_fetch_trailheads.return_value = mock_trailheads_data
        
        # Mock map building
        mock_map = Mock()
        mock_build_map.return_value = mock_map
        
        # Mock map saving
        with patch.object(mock_map, 'save') as mock_save:
            main()
            
            # Verify data was fetched
            mock_fetch_osm.assert_called_once_with(37.3496, -121.9390, 2500)
            mock_fetch_trailheads.assert_called_once_with(37.3496, -121.9390, 2500)
            
            # Verify map was built
            mock_build_map.assert_called_once()
            
            # Verify map was saved
            mock_save.assert_called_once()
    
    def test_bbox_calculation_accuracy(self):
        """Test bounding box calculation accuracy"""
        # Test with known coordinates and radius
        lat, lon = 37.3496, -121.9390
        radius_km = 10
        
        bbox = bbox_from_point(lat, lon, radius_km)
        south, west, north, east = bbox
        
        # Calculate expected deltas
        expected_dlat = radius_km / 111.32
        expected_dlon = radius_km / (111.32 * __import__('math').cos(__import__('math').radians(lat)))
        
        # Check that the bbox is approximately correct
        assert abs((north - south) - 2 * expected_dlat) < 0.01
        assert abs((east - west) - 2 * expected_dlon) < 0.01


class TestErrorHandling:
    """Test error handling scenarios"""
    
    def test_parse_arguments_invalid_latitude(self):
        """Test argument parsing with invalid latitude"""
        with patch('sys.argv', ['download_map.py', '--lat', '91']):
            with pytest.raises(SystemExit):  # argparse raises SystemExit on error
                parse_arguments()
    
    def test_parse_arguments_invalid_longitude(self):
        """Test argument parsing with invalid longitude"""
        with patch('sys.argv', ['download_map.py', '--lng', '181']):
            with pytest.raises(SystemExit):
                parse_arguments()
    
    def test_parse_arguments_invalid_zoom(self):
        """Test argument parsing with invalid zoom"""
        with patch('sys.argv', ['download_map.py', '--zoom', '19']):
            with pytest.raises(SystemExit):
                parse_arguments()
    
    def test_parse_arguments_invalid_style(self):
        """Test argument parsing with invalid style"""
        with patch('sys.argv', ['download_map.py', '--style', 'invalid']):
            with pytest.raises(SystemExit):
                parse_arguments()
    
    def test_parse_arguments_invalid_format(self):
        """Test argument parsing with invalid format"""
        with patch('sys.argv', ['download_map.py', '--format', 'pdf']):
            with pytest.raises(SystemExit):
                parse_arguments()
    
    def test_parse_arguments_negative_radius(self):
        """Test argument parsing with negative radius"""
        with patch('sys.argv', ['download_map.py', '--radius', '-100']):
            with pytest.raises(SystemExit):
                parse_arguments()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
